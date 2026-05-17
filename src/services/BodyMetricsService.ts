import { db } from "@/db";
import type { Tables } from "@/db/supabase";
import { SyncUtils } from "@/sync/SyncUtils";
import { supabase } from "@/lib/supabase";

export const BodyMetricsService = {
  async addEntry(metric: Tables<"body_metrics">) {
    return await db.bodyMetrics.put({
      ...metric,
      is_dirty: 1,
      is_deleted: 0,
      updated_at: new Date().toISOString(),
    });
  },

  async push() {
    const { toDelete, toUpsert } =
      await SyncUtils.getPendingChanges("bodyMetrics");
    console.log("push called bodymetrcis");
    // 1. Handle Deletes
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from("body_metrics")
        .delete()
        .in(
          "user_id",
          toDelete.map((m) => m.user_id),
        )
        .in(
          "date",
          toDelete.map((m) => m.date),
        );

      if (!error) {
        await db.bodyMetrics.bulkDelete(
          toDelete.map((m) => [m.user_id, m.date]),
        );
      }
    }

    // 2. Handle Upserts
    if (toUpsert.length > 0) {
      const payload = toUpsert.map(
        ({ is_dirty: _d, is_deleted: _del, ...rest }) => rest,
      );
      const { error } = await supabase.from("body_metrics").upsert(payload);
      console.log("push completed bodymetrics");
      if (!error) {
        await db.bodyMetrics.bulkUpdate(
          toUpsert.map((m) => ({
            key: [m.user_id, m.date],
            changes: { is_dirty: 0, is_deleted: 0 },
          })),
        );
      }
    }
  },
};
