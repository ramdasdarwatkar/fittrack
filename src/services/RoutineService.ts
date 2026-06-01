import { db } from "@/db";
import type { Tables } from "@/db/supabase";
import { SyncUtils } from "@/sync/SyncUtils";
import { supabase } from "@/lib/supabase";

export interface RoutinePayload {
  routine: Tables<"routines">;
  exercises: Tables<"routine_exercises">[];
}

export const RoutineService = {
  /**
   * Pulls an active routine package and aggregates its corresponding, non-deleted exercise parameters.
   */
  async getFullRoutine(id: string) {
    const routine = await db.routines.get(id);
    if (!routine) return null;

    const mappingRows = await db.routineExercises
      .where("routine_id")
      .equals(id)
      .toArray();

    const activeMappings = mappingRows.filter((me) => me.is_deleted === 0);

    return {
      routine,
      exercises: activeMappings.sort(
        (a, b) => a.sequence_number - b.sequence_number,
      ),
    };
  },

  /**
   * Queries active routines out of Dexie memory and computes their sub-movement sequence lengths.
   */
  async listActiveWithCount() {
    const activeRoutines = await db.routines
      .where("is_deleted")
      .equals(0)
      .toArray();

    return await Promise.all(
      activeRoutines.map(async (routine) => {
        const matchingExerciseCount = await db.routineExercises
          .where("routine_id")
          .equals(routine.id)
          .filter((link) => link.is_deleted === 0)
          .count();

        return {
          ...routine,
          exerciseCount: matchingExerciseCount,
        };
      }),
    );
  },

  /**
   * Local Transactional Upsert: Atomically saves parent routine data and shifts relational
   * exercise children setups inside an exclusive read-write lock channel block.
   */
  async upsertLocal(payload: RoutinePayload) {
    const now = new Date().toISOString();

    return await db.transaction(
      "rw",
      [db.routines, db.routineExercises],
      async () => {
        // 1. Commit primary card identity data
        await db.routines.put({
          ...payload.routine,
          is_dirty: 1,
          is_deleted: 0,
          updated_at: now,
        });

        // 2. Clear pre-existing joints to cleanly preserve fresh sorting sequences
        await db.routineExercises
          .where("routine_id")
          .equals(payload.routine.id)
          .delete();

        // 3. Batch commit incoming mappings with tracking signatures
        if (payload.exercises.length > 0) {
          const enrichedMappings = payload.exercises.map((item) => ({
            ...item,
            is_dirty: 1,
            is_deleted: 0,
            updated_at: now,
          }));
          await db.routineExercises.bulkPut(enrichedMappings);
        }
      },
    );
  },

  /**
   * Transactional Deletion Link: Packages logical delete operations across both relational sets.
   */
  async deleteRoutine(id: string) {
    const now = new Date().toISOString();

    return await db.transaction(
      "rw",
      [db.routines, db.routineExercises],
      async () => {
        await db.routines.update(id, {
          is_deleted: 1,
          is_dirty: 1,
          updated_at: now,
        });

        const links = await db.routineExercises
          .where("routine_id")
          .equals(id)
          .toArray();
        if (links.length > 0) {
          await db.routineExercises.bulkUpdate(
            links.map((l) => ({
              key: [l.routine_id, l.exercise_id],
              changes: { is_dirty: 1, is_deleted: 1, updated_at: now },
            })),
          );
        }
      },
    );
  },

  /**
   * Double-Barreled Cloud Sync Routine: Sequentially processes outbound mutations across both targets.
   */
  async push() {
    // Pipeline Part 1: Resolve Routines
    const routineChanges = await SyncUtils.getPendingChanges("routines");
    if (routineChanges.toDelete.length > 0) {
      const ids = routineChanges.toDelete.map((r) => r.id);
      const { error } = await supabase.from("routines").delete().in("id", ids);
      if (!error) {
        await db.routines.bulkDelete(ids);
      } else {
        throw new Error(error.message);
      }
    }
    if (routineChanges.toUpsert.length > 0) {
      const payload = routineChanges.toUpsert.map(
        ({ is_dirty: _d, is_deleted: _del, ...rest }) => rest,
      );
      const { error } = await supabase.from("routines").upsert(payload);
      if (!error) {
        await db.routines.bulkUpdate(
          routineChanges.toUpsert.map((r) => ({
            key: r.id,
            changes: { is_dirty: 0, is_deleted: 0 },
          })),
        );
      } else {
        throw new Error(error.message);
      }
    }

    // Pipeline Part 2: Resolve Routine-Exercise Intersects
    const relationChanges =
      await SyncUtils.getPendingChanges("routineExercises");
    if (relationChanges.toDelete.length > 0) {
      for (const row of relationChanges.toDelete) {
        const { error } = await supabase
          .from("routine_exercises")
          .delete()
          .eq("routine_id", row.routine_id)
          .eq("exercise_id", row.exercise_id);
        if (!error) {
          await db.routineExercises.delete([row.routine_id, row.exercise_id]);
        } else {
          throw new Error(error.message);
        }
      }
    }
    if (relationChanges.toUpsert.length > 0) {
      const payload = relationChanges.toUpsert.map(
        ({ is_dirty: _d, is_deleted: _del, ...rest }) => rest,
      );
      const { error } = await supabase
        .from("routine_exercises")
        .upsert(payload);
      if (!error) {
        await db.routineExercises.bulkUpdate(
          relationChanges.toUpsert.map((re) => ({
            key: [re.routine_id, re.exercise_id],
            changes: { is_dirty: 0, is_deleted: 0 },
          })),
        );
      } else {
        throw new Error(error.message);
      }
    }
  },

  /**
   * Cloud Replication Pull: Sequentially updates both parent routine parameters
   * and child relational mapping intersects from the cloud.
   */
  async pull() {
    const now = new Date().toISOString();

    // Part I: Pull Parent Routines Table Delta
    const routineMeta = await db.syncMetadata.get("routines");
    let routineQuery = supabase.from("routines").select("*");
    if (routineMeta?.last_pulled_at) {
      routineQuery = routineQuery.gt("updated_at", routineMeta.last_pulled_at);
    }
    const { data: remoteRoutines, error: routineError } = await routineQuery;

    if (!routineError && remoteRoutines && remoteRoutines.length > 0) {
      const localizedRoutines = remoteRoutines.map((r) => ({
        ...r,
        is_dirty: 0 as const,
        is_deleted: 0 as const,
      }));
      await db.routines.bulkPut(localizedRoutines);
    }
    if (!routineError) {
      await db.syncMetadata.put({
        table_name: "routines",
        last_pulled_at: now,
      });
    }

    // Part II: Pull Child Mapping Intersects Delta
    const relationMeta = await db.syncMetadata.get("routineExercises");
    let relationQuery = supabase.from("routine_exercises").select("*");
    if (relationMeta?.last_pulled_at) {
      relationQuery = relationQuery.gt(
        "updated_at",
        relationMeta.last_pulled_at,
      );
    }
    const { data: remoteRelations, error: relationError } = await relationQuery;

    if (!relationError && remoteRelations && remoteRelations.length > 0) {
      const localizedRelations = remoteRelations.map((re) => ({
        ...re,
        is_dirty: 0 as const,
        is_deleted: 0 as const,
      }));
      await db.routineExercises.bulkPut(localizedRelations);
    }
    if (!relationError) {
      await db.syncMetadata.put({
        table_name: "routineExercises",
        last_pulled_at: now,
      });
    }
  },
};
