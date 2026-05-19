import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import type { TablesInsert } from "@/db/supabase";
import { SyncUtils } from "@/sync/SyncUtils";
import type { LocalWorkout } from "@/db";

export const WorkoutService = {
  /**
   * Evaluates if there is an uncompleted ongoing session log active in local Dexie memory.
   */
  async getActiveSession(): Promise<LocalWorkout | undefined> {
    const session = await db.workouts.where("completed").equals(0).first();
    return session as unknown as LocalWorkout | undefined;
  },

  /**
   * Initializes a brand new workout record row inside the Dexie cache.
   */
  async initializeSession(
    payload: TablesInsert<"workouts">,
  ): Promise<LocalWorkout> {
    const record: LocalWorkout = {
      id: payload.id || crypto.randomUUID(),
      user_id: payload.user_id || "",
      date: payload.date || new Date().toISOString().split("T")[0],
      start_time: payload.start_time || new Date().toISOString(),
      end_time: null,
      note: payload.note || null,
      duration_sec: payload.duration_sec || 0,
      completed: 0,
      is_dirty: 1, // Explicit 1 literal bounds matching LocalWorkout
      is_deleted: 0, // Explicit 0 literal bounds matching LocalWorkout
      updated_at: new Date().toISOString(),
    };

    await db.workouts.put(record);
    return record;
  },

  /**
   * General modification method to alter parameters on an active local workout item.
   */
  async updateSession(
    workoutId: string,
    updates: Partial<LocalWorkout>,
  ): Promise<void> {
    const existing = await db.workouts.get(workoutId);
    if (!existing) return;

    await db.workouts.put({
      ...existing,
      ...updates,
      is_dirty: 1, // Forces the dirty state change indicator as literal 1
      updated_at: new Date().toISOString(),
    });
  },

  /**
   * Commits the structural metrics parameters onto the active session row to finalize it.
   */
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

  /**
   * Flags the localized row item as a soft delete inside your sync infrastructure.
   */
  async deleteSessionLocal(workoutId: string): Promise<void> {
    const existing = await db.workouts.get(workoutId);
    if (!existing) return;

    await db.workouts.put({
      ...existing,
      is_dirty: 1,
      is_deleted: 1,
      updated_at: new Date().toISOString(),
    });
  },

  /**
   * Replicates dirtied local data rows up onto Supabase and clears operational sync states.
   */
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
