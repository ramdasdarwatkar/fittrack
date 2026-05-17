import { db, type LocalProfile } from "@/db";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/db/supabase";
import { SyncUtils } from "@/sync/SyncUtils";

export const ProfileService = {
  /**
   * Hybrid Check: Used by AuthGuard to verify entry.
   * If found on Supabase, it "upserts" to local Dexie with is_dirty: false.
   */
  async checkAndSyncProfile(userId: string): Promise<boolean> {
    const local = await db.userProfiles.get(userId);
    if (local && local.is_deleted === 0) return true;

    const { data: remote } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (remote) {
      // Upsert to local: dirty is false because it matches server
      await db.userProfiles.put({
        ...remote,
        is_dirty: 0,
        is_deleted: 0,
      });
      return true;
    }
    return false;
  },

  /**
   * Local Upsert: Used by Onboarding to save new data.
   * Marks is_dirty: true so the Sync Engine knows to push to Supabase.
   */
  async upsertLocal(profile: Tables<"user_profiles">) {
    const record: LocalProfile = {
      ...profile,
      is_dirty: 1,
      is_deleted: 0,
      updated_at: new Date().toISOString(),
    };
    return await db.userProfiles.put(record);
  },

  async getLocal(userId: string): Promise<LocalProfile | undefined> {
    return await db.userProfiles.get(userId);
  },

  async push() {
    const { toDelete, toUpsert } =
      await SyncUtils.getPendingChanges("userProfiles");

    // 1. Handle Deletes
    if (toDelete.length > 0) {
      const ids = toDelete.map((p) => p.user_id);
      const { error } = await supabase
        .from("user_profiles")
        .delete()
        .in("user_id", ids);

      if (!error) await db.userProfiles.bulkDelete(ids);
    }
    console.log("push called user");
    // 2. Handle Upserts
    if (toUpsert.length > 0) {
      // Use underscore to ignore the extracted variables
      const payload = toUpsert.map(
        ({ is_dirty: _d, is_deleted: _del, ...rest }) => rest,
      );

      const { error } = await supabase.from("user_profiles").upsert(payload);
      console.log("push completed user");
      if (!error) {
        await db.userProfiles.bulkUpdate(
          toUpsert.map((p) => ({
            key: p.user_id as string, // Ensure key is string
            changes: {
              is_dirty: 0,
              is_deleted: 0, // Use boolean false, not number 0
            },
          })),
        );
      }
    }
  },
};
