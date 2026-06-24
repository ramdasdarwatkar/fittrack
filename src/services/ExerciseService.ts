import { db } from "@/db";
import type { Tables } from "@/db/supabase";
import { SyncUtils } from "@/sync/SyncUtils";
import { supabase } from "@/lib/supabase";

export const ExerciseService = {
  /**
   * Fetches an individual exercise by its unique string identifier out of Dexie memory.
   */
  async get(id: string) {
    return await db.exercises.get(id);
  },

  /**
   * Queries local Dexie memory for all active movements, ignoring logical deletions.
   * Perfect target for useLiveQuery subscription loops inside the UI.
   */
  async listActive() {
    return await db.exercises.where("is_deleted").equals(0).toArray();
  },

  /**
   * Local Upsert: Saves or modifies data locally.
   * Marks is_dirty: 1 so the background sync knows to replicate this change to Supabase.
   */
  async upsertLocal(exercise: Tables<"exercises">) {
    return await db.exercises.put({
      ...exercise,
      is_dirty: 1,
      is_deleted: 0,
      updated_at: new Date().toISOString(),
    });
  },

  /**
   * Logical Delete: Flags a row as deleted locally so it can sync over the wire.
   * If it has never hit the server before (no updated_at), it drops it completely from memory.
   */
  async delete(id: string) {
    const local = await db.exercises.get(id);
    if (!local) return;

    if (local.is_dirty === 1 && !local.updated_at) {
      return await db.exercises.delete(id);
    }

    return await db.exercises.update(id, {
      is_deleted: 1,
      is_dirty: 1,
      updated_at: new Date().toISOString(),
    });
  },

  /**
   * Cloud Replication Push: Scans for changes, issues deletes, and upserts payloads to Supabase.
   */
  async push() {
    const { toDelete, toUpsert } =
      await SyncUtils.getPendingChanges("exercises");

    if (toDelete.length > 0) {
      const ids = toDelete.map((e) => e.id);
      const { error } = await supabase.from("exercises").delete().in("id", ids);
      if (!error) {
        await db.exercises.bulkDelete(ids);
      } else {
        throw new Error(error.message);
      }
    }

    if (toUpsert.length > 0) {
      const payload = toUpsert.map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ is_dirty: _d, is_deleted: _del, ...rest }) => rest,
      );
      const { error } = await supabase.from("exercises").upsert(payload);
      if (!error) {
        await db.exercises.bulkUpdate(
          toUpsert.map((e) => ({
            key: e.id,
            changes: { is_dirty: 0, is_deleted: 0 },
          })),
        );
      } else {
        throw new Error(error.message);
      }
    }
  },

  /**
   * Cloud Replication Pull: Fetches delta updates from Supabase since the last sync milestone
   * and merges them directly into your local Dexie cache.
   */
  async pull() {
    const meta = await db.syncMetadata.get("exercises");
    const lastPulledAt = meta?.last_pulled_at;

    let query = supabase.from("exercises").select("*");
    if (lastPulledAt) {
      query = query.gt("updated_at", lastPulledAt);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const localRecords = data.map((remoteItem) => ({
        ...remoteItem,
        is_dirty: 0 as const,
        is_deleted: 0 as const,
      }));

      await db.exercises.bulkPut(localRecords);
    }

    if (!error) {
      await db.syncMetadata.put({
        table_name: "exercises",
        last_pulled_at: new Date().toISOString(),
      });
    }
  },
};
