import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import type { TablesInsert } from "@/db/supabase";
import { SyncUtils } from "@/sync/SyncUtils";
import type { LocalWorkout } from "@/db";

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
    },
  ): Promise<void> {
    await this.updateSession(workoutId, {
      ...finalData,
      completed: 1,
    });
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
        ({ is_dirty: _d, is_deleted: _del, ...rest }) => rest,
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
