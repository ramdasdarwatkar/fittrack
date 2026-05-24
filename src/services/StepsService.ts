import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import { SyncUtils } from "@/sync/SyncUtils";
import { XpService } from "./XpService";

export const StepsService = {
  async logSteps(userId: string, date: string, count: number): Promise<void> {
    const record = {
      user_id: userId,
      date,
      value: count,
      updated_at: new Date().toISOString(),
      is_dirty: 1 as const,
      is_deleted: 0 as const,
    };
    await db.steps.put(record);

    if (count >= 8000) {
      try {
        await XpService.rewardSteps(userId, date);
      } catch (xpErr) {
        console.error("[StepsService] Failed to reward Steps XP:", xpErr);
      }
    }
  },

  async push(): Promise<void> {
    const { toDelete, toUpsert } = await SyncUtils.getPendingChanges("steps");

    if (toDelete.length > 0) {
      for (const row of toDelete) {
        await supabase
          .from("steps")
          .delete()
          .eq("user_id", row.user_id)
          .eq("date", row.date);
      }
      const keys = toDelete.map((row) => [row.user_id, row.date]);
      await db.steps.bulkDelete(keys);
    }

    if (toUpsert.length > 0) {
      const payload = toUpsert.map(
        ({ is_dirty: _d, is_deleted: _del, ...rest }) => rest
      );
      const { error } = await supabase.from("steps").upsert(payload);
      if (!error) {
        await db.steps.bulkUpdate(
          toUpsert.map((row) => ({
            key: [row.user_id, row.date],
            changes: { is_dirty: 0, is_deleted: 0 },
          }))
        );
      }
    }
  },
};
