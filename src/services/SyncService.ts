import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/db/supabase";
import { ProfileService } from "./ProfileService";
import { BodyMetricsService } from "./BodyMetricsService";
import { GoalService } from "./GoalService";

type TableName = keyof Database["public"]["Tables"];

const TABLE_MAP: Record<TableName, string> = {
  user_profiles: "userProfiles",
  body_metrics: "bodyMetrics",
  goals: "goals",
  muscle_groups: "muscleGroups",
  muscles: "muscles",
  exercises: "exercises",
  routines: "routines",
  routine_exercises: "routineExercises",
  workouts: "workouts",
  sets: "sets",
  personal_records: "personalRecords",
  steps: "steps",
  xp_log: "xpLog",
};

let isPulling = false;
let isPushing = false;

export const SyncService = {
  async pullAll() {
    if (isPulling) {
      console.warn(
        "[Sync] Pull already running. Aborting overlapping request.",
      );
      return;
    }
    isPulling = true;
    try {
      for (const table of Object.keys(TABLE_MAP) as TableName[]) {
        await this.pullTable(table);
      }
    } catch (error) {
      console.error("[Sync] Pull cycle collapsed:", error);
    } finally {
      isPulling = false;
    }
  },

  async pullTable(supabaseTable: TableName) {
    const dexieTable = TABLE_MAP[supabaseTable];
    try {
      const meta = await db.syncMetadata.get(supabaseTable);
      const lastTimestamp = meta?.last_pulled_at || "2026-01-01T00:00:00.000Z";
      const timeColumn = "updated_at";

      const { data, error } = await supabase
        .from(supabaseTable)
        .select("*")
        .gt(timeColumn, lastTimestamp)
        .order(timeColumn, { ascending: true });

      if (error) {
        console.error(
          `[Sync] Server query failed for ${supabaseTable}:`,
          error.message,
        );
        return;
      }
      if (!data || data.length === 0) return;

      const sanitized = data.map((row: any) => ({
        ...row,
        is_dirty: false,
        is_deleted: false,
      }));

      await db.table(dexieTable).bulkPut(sanitized);

      const newestAt = data[data.length - 1][timeColumn];
      await db.syncMetadata.put({
        table_name: supabaseTable,
        last_pulled_at: newestAt,
      });

      console.log(`[Sync] Hydrated ${data.length} records into ${dexieTable}`);
    } catch (localError) {
      console.error(
        `[Sync] IndexedDB write failure on ${supabaseTable}:`,
        localError,
      );
    }
  },

  async pushAll() {
    if (isPushing) return;
    isPushing = true;

    const services = [ProfileService, BodyMetricsService, GoalService];
    console.log("push called");
    try {
      await Promise.all(
        services.map(async (service) => {
          try {
            await service.push();
          } catch (e) {
            console.error(`[Sync] Service push runtime crash:`, e);
          }
        }),
      );
    } finally {
      isPushing = false;
    }
  },
};
