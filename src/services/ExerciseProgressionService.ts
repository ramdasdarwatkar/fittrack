import { db } from "@/db";
import { SyncUtils } from "@/sync/SyncUtils";
import { supabase } from "@/lib/supabase";

export const ExerciseProgressionService = {
  async push() {
    const { toDelete, toUpsert } = await SyncUtils.getPendingChanges("exerciseProgressions");

    // 1. Handle Deletes
    if (toDelete.length > 0) {
      for (const item of toDelete) {
        const { error } = await supabase
          .from("exercise_progression")
          .delete()
          .match({ exercise_id: item.exercise_id, user_id: item.user_id });
        if (!error) {
          await db.exerciseProgressions.delete([item.exercise_id, item.user_id]);
        } else {
          throw new Error(error.message);
        }
      }
    }

    // 2. Handle Upserts
    if (toUpsert.length > 0) {
      const payload = toUpsert.map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ is_dirty: _d, is_deleted: _del, ...rest }) => rest,
      );
      const { error } = await supabase.from("exercise_progression").upsert(payload);
      if (!error) {
        await db.exerciseProgressions.bulkUpdate(
          toUpsert.map((item) => ({
            key: [item.exercise_id, item.user_id] as [string, string],
            changes: { is_dirty: 0, is_deleted: 0 },
          })),
        );
      } else {
        throw new Error(error.message);
      }
    }
  },
};
