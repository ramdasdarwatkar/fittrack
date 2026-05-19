import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/db/supabase";
import { SyncUtils } from "@/sync/SyncUtils";
import type { LocalSet as LocalWorkoutSet } from "@/db";

export const WorkoutSetService = {
  /**
   * Retrieves all logged tracking rows associated with an active parent session log ID.
   */
  async getSetsForWorkout(workoutId: string): Promise<LocalWorkoutSet[]> {
    const data = await db.sets.where("workout_id").equals(workoutId).toArray();
    return (data as unknown as LocalWorkoutSet[]).sort(
      (a, b) => a.set_number - b.set_number,
    );
  },

  /**
   * Instantiates a fresh set line row or duplicates properties from a previous row.
   */
  async addSetRow(
    workoutId: string,
    exerciseId: string,
    userId: string,
  ): Promise<LocalWorkoutSet> {
    const existing = await this.getSetsForWorkout(workoutId);
    const exerciseSets = existing.filter((s) => s.exercise_id === exerciseId);
    const lastSet = exerciseSets[exerciseSets.length - 1];

    const record: LocalWorkoutSet = {
      id: crypto.randomUUID(),
      workout_id: workoutId,
      user_id: userId,
      exercise_id: exerciseId,
      set_number: exerciseSets.length + 1,
      reps: lastSet ? lastSet.reps : null,
      weight: lastSet ? lastSet.weight : null,
      distance_meters: lastSet ? lastSet.distance_meters : null,
      duration_sec: lastSet ? lastSet.duration_sec : null,
      set_type: "MAIN",
      completed: 0,
      is_dirty: 1,
      is_deleted: 0,
      updated_at: new Date().toISOString(),
    };

    await db.sets.put(record);
    return record;
  },

  /**
   * Updates any singular metric input column directly inside local offline storage.
   * Uses your exact LocalWorkoutSet shape for partial updates to avoid casting errors.
   */
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

  /**
   * Remaps set item classification to support Warmup/Main row state toggles.
   */
  async toggleSetType(
    setId: string,
    currentType: Tables<"sets">["set_type"],
  ): Promise<void> {
    const targetType = currentType === "WARMUP" ? "MAIN" : "WARMUP";
    await this.updateSetFields(setId, { set_type: targetType });
  },

  /**
   * Deletes an individual line row and executes an automatic renumbering layout cascade.
   */
  async deleteSetRow(
    setId: string,
    workoutId: string,
    exerciseId: string,
  ): Promise<void> {
    await db.sets.delete(setId);

    const fullList = await this.getSetsForWorkout(workoutId);
    const remainingExerciseSets = fullList.filter(
      (s) => s.exercise_id === exerciseId && s.id !== setId,
    );

    for (let i = 0; i < remainingExerciseSets.length; i++) {
      if (remainingExerciseSets[i].set_number !== i + 1) {
        await this.updateSetFields(remainingExerciseSets[i].id, {
          set_number: i + 1,
        });
      }
    }
  },

  /**
   * Pushes dirty local data sets parameters onto Supabase.
   */
  async push(): Promise<void> {
    const { toDelete, toUpsert } = await SyncUtils.getPendingChanges("sets");

    if (toDelete.length > 0) {
      const ids = toDelete.map((s) => s.id);
      const { error } = await supabase.from("sets").delete().in("id", ids);
      if (!error) await db.sets.bulkDelete(ids);
    }

    if (toUpsert.length > 0) {
      const payload = toUpsert.map(
        ({ is_dirty: _d, is_deleted: _del, completed: _c, ...rest }) => rest,
      );

      const { error } = await supabase.from("sets").upsert(payload);
      if (!error) {
        await db.sets.bulkUpdate(
          toUpsert.map((s) => ({
            key: s.id,
            changes: { is_dirty: 0, is_deleted: 0 },
          })),
        );
      }
    }
  },
};
