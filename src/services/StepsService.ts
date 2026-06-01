import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import { SyncUtils } from "@/sync/SyncUtils";
import { XpService } from "./XpService";

export const StepsService = {
  async logSteps(userId: string, date: string, count: number): Promise<void> {
    const existing = await db.steps.get([userId, date]);
    const record = {
      user_id: userId,
      date,
      steps: count,
      water: existing?.water ?? 0,
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

  async logWater(userId: string, date: string, amount: number): Promise<void> {
    const existing = await db.steps.get([userId, date]);
    const record = {
      user_id: userId,
      date,
      steps: existing?.steps ?? 0,
      water: amount,
      updated_at: new Date().toISOString(),
      is_dirty: 1 as const,
      is_deleted: 0 as const,
    };
    await db.steps.put(record);
  },

  async push(): Promise<void> {
    const { toDelete, toUpsert } = await SyncUtils.getPendingChanges("steps");

    if (toDelete.length > 0) {
      for (const row of toDelete) {
        const { error } = await supabase
          .from("steps")
          .delete()
          .eq("user_id", row.user_id)
          .eq("date", row.date);
        if (error) throw new Error(error.message);
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
      } else {
        throw new Error(error.message);
      }
    }
  },
};
