import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import { SyncUtils } from "@/sync/SyncUtils";
import type { LocalPersonalRecord } from "@/db";
import { XpService } from "./XpService";

export const PersonalRecordsService = {
  /**
   * Retrieves the absolute latest personal record milestone for a given exercise.
   * Orders strictly by created_at descending so the newest entry is always first.
   */
  async getLatestPRForExercise(
    exerciseId: string,
  ): Promise<LocalPersonalRecord | null> {
    const records = await db.personalRecords
      .where("exercise_id")
      .equals(exerciseId)
      .toArray();

    if (!records || records.length === 0) return null;

    // Clean, direct sorting by created_at timestamp descending
    const sorted = (records as unknown as LocalPersonalRecord[]).sort(
      (a, b) => {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      },
    );

    // Picking the first entry gives us the absolute latest record
    return sorted[0];
  },

  /**
   * Instantiates a fresh weight breakthrough record directly into offline Dexie cache.
   * Maps precisely to your LocalPersonalRecord properties to clear compilation errors.
   */
  async logNewWeightPR(
    userId: string,
    exerciseId: string,
    absoluteWeight: number,
    setId: string,
  ): Promise<LocalPersonalRecord> {
    const nowIso = new Date().toISOString();

    const newRecord: LocalPersonalRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      exercise_id: exerciseId,
      set_id: setId, // Linked set reference requirement satisfied
      value: absoluteWeight, // Explicitly mapped to your schema's numerical property
      prtype: "weight",
      created_at: nowIso,
      updated_at: nowIso, // Sync update requirement satisfied
      is_dirty: 1,
      is_deleted: 0,
    };

    await db.personalRecords.put(newRecord);

    try {
      await XpService.rewardPR(userId);
    } catch (xpErr) {
      console.error("[PersonalRecordsService] Failed to reward PR XP:", xpErr);
    }

    return newRecord;
  },

  /**
   * Pushes dirty local personal record data milestones onto Supabase.
   */
  async push(): Promise<void> {
    const { toDelete, toUpsert } =
      await SyncUtils.getPendingChanges("personalRecords");

    if (toDelete.length > 0) {
      const ids = toDelete.map((r) => r.id);
      const { error } = await supabase
        .from("personal_records")
        .delete()
        .in("id", ids);
      if (!error) {
        await db.personalRecords.bulkDelete(ids);
      } else {
        throw new Error(error.message);
      }
    }

    if (toUpsert.length > 0) {
      const payload = toUpsert.map(
        ({ is_dirty: _d, is_deleted: _del, ...rest }) => rest,
      );

      const { error } = await supabase.from("personal_records").upsert(payload);
      if (!error) {
        await db.personalRecords.bulkUpdate(
          toUpsert.map((r) => ({
            key: r.id,
            changes: { is_dirty: 0, is_deleted: 0 },
          })),
        );
      } else {
        throw new Error(error.message);
      }
    }
  },
};
