import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import type { TablesInsert } from "@/db/supabase";
import { SyncUtils } from "@/sync/SyncUtils";
import type { LocalWorkout } from "@/db";
import { XpService } from "./XpService";

export const WorkoutService = {
  async getActiveSession(): Promise<LocalWorkout | undefined> {
    return await db.workouts
      .where("completed")
      .equals(0)
      .filter((w) => w.is_deleted !== 1)
      .first();
  },

  async initializeSession(
    payload: TablesInsert<"workouts">,
  ): Promise<LocalWorkout> {
    const record: LocalWorkout = {
      id: payload.id || crypto.randomUUID(),
      user_id: payload.user_id || "",
      date: payload.date || new Date().toISOString().split("T")[0],
      start_time: payload.start_time || new Date().toISOString(),
      end_time: payload.end_time || null,
      note: payload.note || null,
      duration_sec: payload.duration_sec || 0,
      completed: 0,
      is_dirty: 1,
      is_deleted: 0,
      updated_at: new Date().toISOString(),
    };
    await db.workouts.put(record);
    return record;
  },

  async updateSession(
    workoutId: string,
    updates: Partial<LocalWorkout>,
  ): Promise<void> {
    const existing = await db.workouts.get(workoutId);
    if (!existing) return;
    await db.workouts.put({
      ...existing,
      ...updates,
      is_dirty: 1,
      updated_at: new Date().toISOString(),
    });
  },

  async completeSession(
    workoutId: string,
    finalData: {
      date: string;
      start_time: string;
      end_time: string;
      duration_sec: number;
      note: string | null;
      user_id?: string;
    },
  ): Promise<void> {
    await this.updateSession(workoutId, {
      ...finalData,
      completed: 1,
    });

    try {
      // 1. Resolve actual user_id from the active session if not directly provided
      let finalUserId = finalData.user_id;
      if (!finalUserId) {
        const session = await db.workouts.get(workoutId);
        finalUserId = session?.user_id || "";
      }

      if (finalUserId) {
        // 3. Reset and sweep inactivity penalties rolling backwards BEFORE rewarding the new session (so past inactivity is recorded)
        await XpService.evaluateInactivityPenalty(finalUserId);

        // 4. Evaluate if Cardio or Strength Workout based on notes or performed exercise metrics
        const sets = await db.sets.where("workout_id").equals(workoutId).toArray();
        const exerciseIds = Array.from(new Set(sets.map((s) => s.exercise_id)));
        const exercises = await db.exercises.where("id").anyOf(exerciseIds).toArray();
        
        const hasCardioExercise = exercises.some((ex) => {
          const metrics = Array.isArray(ex.metrics) ? ex.metrics : [];
          return metrics.includes("duration") || metrics.includes("distance");
        });

        const isCardio = hasCardioExercise || finalData.note?.toLowerCase().includes("cardio") || false;
        if (isCardio) {
          if (finalData.duration_sec >= 60) { // 20 minutes (patched to 60s for quick logging/testing)
            await XpService.rewardCardio(finalUserId, finalData.date);
          }
        } else {
          if (finalData.duration_sec >= 60) { // 45 minutes (patched to 60s for quick logging/testing)
            await XpService.rewardWorkout(finalUserId, finalData.date);
          }
        }
      }
    } catch (xpErr) {
      console.error("[WorkoutService] Failed to reward completion XP:", xpErr);
    }
  },

  async deleteSessionLocal(workoutId: string): Promise<void> {
    await db.workouts.delete(workoutId);
  },

  // Add this to WorkoutService.ts
  async logRestDay(userId: string, date: string): Promise<void> {
    const id = crypto.randomUUID();
    const restDay: LocalWorkout = {
      id,
      user_id: userId,
      date: date,
      start_time: `${date}T00:00:00Z`,
      end_time: `${date}T23:59:59Z`,
      note: "REST_DAY",
      duration_sec: 0,
      completed: 1, // Set to 1 so it's not "active"
      is_dirty: 1,
      is_deleted: 0,
      updated_at: new Date().toISOString(),
    };
    await db.workouts.put(restDay);

    try {
      await XpService.rewardRestDay(userId, date);
    } catch (xpErr) {
      console.error("[WorkoutService] Failed to reward Rest Day XP:", xpErr);
    }
  },

  async push(): Promise<void> {
    const { toDelete, toUpsert } =
      await SyncUtils.getPendingChanges("workouts");
    if (toDelete.length > 0) {
      const ids = toDelete.map((w) => w.id);
      const { error } = await supabase.from("workouts").delete().in("id", ids);
      if (!error) await db.workouts.bulkDelete(ids);
    }
    if (toUpsert.length > 0) {
      const payload = toUpsert.map(
        ({ is_dirty: _d, is_deleted: _del, completed: _c, ...rest }) => rest,
      );
      const { error } = await supabase.from("workouts").upsert(payload);
      if (!error) {
        await db.workouts.bulkUpdate(
          toUpsert.map((w) => ({
            key: w.id,
            changes: { is_dirty: 0, is_deleted: 0 },
          })),
        );
      }
    }
  },
};
