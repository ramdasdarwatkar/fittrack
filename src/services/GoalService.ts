import { db } from "@/db";
import type { Tables } from "@/db/supabase";
import { SyncUtils } from "@/sync/SyncUtils";
import { supabase } from "@/lib/supabase";

export const GoalService = {
  async createGoal(
    goal: Omit<Tables<"goals">, "id" | "created_at" | "updated_at">,
  ) {
    const now = new Date().toISOString();
    return await db.goals.put({
      ...goal,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      is_dirty: 1,
      is_deleted: 0,
    });
  },

  async push() {
    const { toDelete, toUpsert } = await SyncUtils.getPendingChanges("goals");
    console.log("push called goals");
    // 1. Handle Deletes
    if (toDelete.length > 0) {
      const ids = toDelete.map((g) => g.id);
      const { error } = await supabase.from("goals").delete().in("id", ids);
      if (!error) await db.goals.bulkDelete(ids);
    }

    // 2. Handle Upserts
    if (toUpsert.length > 0) {
      const payload = toUpsert.map(
        ({ is_dirty: _d, is_deleted: _del, ...rest }) => rest,
      );
      const { error } = await supabase.from("goals").upsert(payload);
      console.log("push completed goals");
      if (!error) {
        await db.goals.bulkUpdate(
          toUpsert.map((g) => ({
            key: g.id as string,
            changes: { is_dirty: 0, is_deleted: 0 },
          })),
        );
      }
    }
  },
};
