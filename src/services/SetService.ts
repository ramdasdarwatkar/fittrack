import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import { SyncUtils } from "@/sync/SyncUtils";
import type { LocalSet as LocalWorkoutSet } from "@/db";

export const WorkoutSetService = {
  async getSetsForWorkout(workoutId: string): Promise<LocalWorkoutSet[]> {
    const data = await db.sets.where("workout_id").equals(workoutId).toArray();
    // PATCHED: Use Number() to safely sort decimal set_numbers
    return (data as LocalWorkoutSet[]).sort(
      (a, b) => Number(a.set_number) - Number(b.set_number),
    );
  },

  async addSetRow(
    workoutId: string,
    exerciseId: string,
    userId: string,
    setNumber: number,
  ): Promise<LocalWorkoutSet> {
    const record: LocalWorkoutSet = {
      id: crypto.randomUUID(),
      workout_id: workoutId,
      user_id: userId,
      exercise_id: exerciseId,
      set_number: setNumber,
      set_type: "MAIN",
      completed: 0,
      is_dirty: 1,
      is_deleted: 0,
      updated_at: new Date().toISOString(),
      reps: null,
      weight: null,
      distance_meters: null,
      duration_sec: null,
    };
    await db.sets.put(record);
    return record;
  },

  async addBatchSets(sets: LocalWorkoutSet[]): Promise<void> {
    await db.sets.bulkPut(sets);
  },

  async updateSetFields(
    setId: string,
    updates: Partial<LocalWorkoutSet>,
  ): Promise<void> {
    const existing = await db.sets.get(setId);
    if (!existing) return;
    await db.sets.put({
      ...existing,
      ...updates,
      is_dirty: 1,
      updated_at: new Date().toISOString(),
    });
  },

  async deleteSetRow(setId: string): Promise<void> {
    const set = await db.sets.get(setId);
    if (!set) return;

    // Delete linked PRs
    await db.personalRecords.where("set_id").equals(setId).delete();
    await db.sets.delete(setId);

    // REMOVED: The for-loop that forced set_number to 1, 2, 3...
    // With your new decimal system, we do NOT want to overwrite set numbers.
    // Deleting a set now leaves the remaining numbers (e.g., 1.01, 1.03)
    // exactly as they are, which preserves the sequence order perfectly.
  },

  async deleteSetsForWorkout(workoutId: string): Promise<void> {
    const sets = await db.sets.where({ workout_id: workoutId }).toArray();
    const setIds = sets.map((s) => s.id);
    
    // Soft-delete personalRecords linked to these sets so the deletion is synced
    const prs = await db.personalRecords.where("set_id").anyOf(setIds).toArray();
    for (const pr of prs) {
      await db.personalRecords.put({
        ...pr,
        is_deleted: 1,
        is_dirty: 1,
        updated_at: new Date().toISOString()
      });
    }

    await db.sets.bulkDelete(setIds);
  },

  async deleteSetsForExercise(
    workoutId: string,
    exerciseId: string,
  ): Promise<void> {
    const sets = await db.sets
      .where({ workout_id: workoutId, exercise_id: exerciseId })
      .toArray();
    const setIds = sets.map((s) => s.id);
    await db.personalRecords.where("set_id").anyOf(setIds).delete();
    await db.sets.bulkDelete(setIds);
  },

  async getLatestPastSetsForExercise(
    exerciseId: string,
    currentWorkoutId: string,
  ) {
    const pastSets = await db.sets
      .where("exercise_id")
      .equals(exerciseId)
      .filter((s) => s.completed === 1 && s.workout_id !== currentWorkoutId)
      .toArray();

    if (!pastSets.length) return null;

    const grouped = pastSets.reduce(
      (acc, curr) => {
        acc[curr.workout_id] = acc[curr.workout_id] || [];
        acc[curr.workout_id].push(curr);
        return acc;
      },
      {} as Record<string, typeof pastSets>,
    );

    const latestId = Object.keys(grouped).sort(
      (a, b) =>
        new Date(grouped[b][0].updated_at).getTime() -
        new Date(grouped[a][0].updated_at).getTime(),
    )[0];

    return grouped[latestId];
  },

  async push(): Promise<void> {
    const { toDelete, toUpsert } = await SyncUtils.getPendingChanges("sets");
    if (toDelete.length > 0) {
      const ids = toDelete.map((s) => s.id);
      await supabase.from("sets").delete().in("id", ids);
      await db.sets.bulkDelete(ids);
    }
    if (toUpsert.length > 0) {
      const payload = toUpsert.map(
        ({ is_dirty: _d, is_deleted: _del, completed: _c, ...rest }) => rest,
      );
      await supabase.from("sets").upsert(payload);
      await db.sets.bulkUpdate(
        toUpsert.map((s) => ({
          key: s.id,
          changes: { is_dirty: 0, is_deleted: 0 },
        })),
      );
    }
  },
};
