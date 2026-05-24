import { db } from "@/db";

export const SyncUtils = {
  /**
   * Finds all records in a Dexie table that need to be sent to the server.
   */
  async getPendingChanges(tableName: string) {
    // Highly optimized index scan matching binary integer 1
    const dirtyRecords = await db
      .table(tableName)
      .where("is_dirty")
      .equals(1)
      .toArray();

    // Fast in-memory separation
    const toDelete = dirtyRecords.filter((row) => row.is_deleted === 1);
    let toUpsert = dirtyRecords.filter((row) => row.is_deleted === 0);

    // Only push completed workouts/sets to the server
    if (tableName === "workouts" || tableName === "sets") {
      toUpsert = toUpsert.filter((row) => row.completed === 1);
    }

    return { toDelete, toUpsert };
  },
};
