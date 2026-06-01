import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/db/supabase";
import { ProfileService } from "./ProfileService";
import { BodyMetricsService } from "./BodyMetricsService";
import { GoalService } from "./GoalService";
import { ExerciseService } from "./ExerciseService";
import { RoutineService } from "./RoutineService";
import { WorkoutService } from "./WorkoutService";
import { WorkoutSetService } from "./SetService";
import { PersonalRecordsService } from "./PersonalRecordsService";
import { StepsService } from "./StepsService";
import { XpService } from "./XpService";

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

const TABLE_DAYS: Record<TableName, number | null> = {
  user_profiles: null,
  body_metrics: null,
  goals: null,
  muscle_groups: null,
  muscles: null,
  exercises: null,
  routines: null,
  routine_exercises: null,
  workouts: 180,
  sets: 180,
  personal_records: 180,
  steps: 180,
  xp_log: 30,
};

function getStartDateLimit(days: number | null | undefined): string {
  if (days === null || days === undefined) {
    return "2026-05-01T00:00:00.000Z";
  }
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

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
        const days = TABLE_DAYS[table];
        await this.pullTable(table, days);
      }
    } catch (error) {
      console.error("[Sync] Pull cycle collapsed:", error);
    } finally {
      isPulling = false;
    }
  },

  async pullTable(supabaseTable: TableName, days?: number | null) {
    const dexieTable = TABLE_MAP[supabaseTable];
    try {
      const meta = await db.syncMetadata.get(supabaseTable);
      const lastPulledAt = meta?.last_pulled_at;

      const daysLimit = days !== undefined ? days : TABLE_DAYS[supabaseTable];
      const maxDaysStart = getStartDateLimit(daysLimit);

      let lastTimestamp = maxDaysStart;
      if (lastPulledAt && lastPulledAt > maxDaysStart) {
        lastTimestamp = lastPulledAt;
      }

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

      const sanitized = data.map((row: any) => {
        const item: any = {
          ...row,
          is_dirty: 0,
          is_deleted: 0,
        };
        if (supabaseTable === "workouts" || supabaseTable === "sets") {
          item.completed = 1;
        }
        return item;
      });

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

  async pushTable(supabaseTable: TableName) {
    switch (supabaseTable) {
      case "user_profiles":
        await ProfileService.push();
        break;
      case "body_metrics":
        await BodyMetricsService.push();
        break;
      case "goals":
        await GoalService.push();
        break;
      case "exercises":
        await ExerciseService.push();
        break;
      case "routines":
        await RoutineService.push();
        break;
      case "workouts":
        await WorkoutService.push();
        break;
      case "sets":
        await WorkoutSetService.push();
        break;
      case "personal_records":
        await PersonalRecordsService.push();
        break;
      case "steps":
        await StepsService.push();
        break;
      case "xp_log":
        await XpService.push();
        break;
      default:
        console.warn(`[Sync] No push service registered for ${supabaseTable}`);
    }
  },

  async recoverUnsyncedRecords() {
    console.log("[Sync] Executing robust memory-based self-healing recovery scan for all local tables...");
    try {
      // 1. User Profiles
      const localProfiles = await db.userProfiles.toArray();
      const dirtyProfiles = localProfiles.filter((p) => p.is_deleted !== 1);
      if (dirtyProfiles.length > 0) {
        await db.userProfiles.bulkUpdate(
          dirtyProfiles.map((p) => ({ key: p.user_id, changes: { is_dirty: 1, is_deleted: 0 } }))
        );
      }

      // 2. Body Metrics
      const localMetrics = await db.bodyMetrics.toArray();
      const dirtyMetrics = localMetrics.filter((m) => m.is_deleted !== 1);
      if (dirtyMetrics.length > 0) {
        await db.bodyMetrics.bulkUpdate(
          dirtyMetrics.map((m) => ({ key: [m.user_id, m.date], changes: { is_dirty: 1, is_deleted: 0 } }))
        );
      }

      // 3. Goals
      const localGoals = await db.goals.toArray();
      const dirtyGoals = localGoals.filter((g) => g.is_deleted !== 1);
      if (dirtyGoals.length > 0) {
        await db.goals.bulkUpdate(
          dirtyGoals.map((g) => ({ key: g.id, changes: { is_dirty: 1, is_deleted: 0 } }))
        );
      }

      // 4. Exercises
      const localExercises = await db.exercises.toArray();
      const dirtyExercises = localExercises.filter((e) => e.is_deleted !== 1);
      if (dirtyExercises.length > 0) {
        await db.exercises.bulkUpdate(
          dirtyExercises.map((e) => ({ key: e.id, changes: { is_dirty: 1, is_deleted: 0 } }))
        );
      }

      // 5. Routines
      const localRoutines = await db.routines.toArray();
      const dirtyRoutines = localRoutines.filter((r) => r.is_deleted !== 1);
      if (dirtyRoutines.length > 0) {
        await db.routines.bulkUpdate(
          dirtyRoutines.map((r) => ({ key: r.id, changes: { is_dirty: 1, is_deleted: 0 } }))
        );
      }
      
      // 6. Routine Exercises
      const localRE = await db.routineExercises.toArray();
      const dirtyRE = localRE.filter((re) => re.is_deleted !== 1);
      if (dirtyRE.length > 0) {
        await db.routineExercises.bulkUpdate(
          dirtyRE.map((re) => ({ key: [re.routine_id, re.exercise_id], changes: { is_dirty: 1, is_deleted: 0 } }))
        );
      }
      
      // 7. Workouts (only completed ones)
      const localWorkouts = await db.workouts.toArray();
      const dirtyWorkouts = localWorkouts.filter((w) => w.completed === 1 && w.is_deleted !== 1);
      if (dirtyWorkouts.length > 0) {
        await db.workouts.bulkUpdate(
          dirtyWorkouts.map((w) => ({ key: w.id, changes: { is_dirty: 1, is_deleted: 0 } }))
        );
      }
      
      // 8. Sets (only completed ones)
      const localSets = await db.sets.toArray();
      const dirtySets = localSets.filter((s) => s.completed === 1 && s.is_deleted !== 1);
      if (dirtySets.length > 0) {
        await db.sets.bulkUpdate(
          dirtySets.map((s) => ({ key: s.id, changes: { is_dirty: 1, is_deleted: 0 } }))
        );
      }
      
      // 9. Personal Records
      const localPR = await db.personalRecords.toArray();
      const dirtyPR = localPR.filter((pr) => pr.is_deleted !== 1);
      if (dirtyPR.length > 0) {
        await db.personalRecords.bulkUpdate(
          dirtyPR.map((pr) => ({ key: pr.id, changes: { is_dirty: 1, is_deleted: 0 } }))
        );
      }
      
      // 10. Steps
      const localSteps = await db.steps.toArray();
      const dirtySteps = localSteps.filter((s) => s.is_deleted !== 1);
      if (dirtySteps.length > 0) {
        await db.steps.bulkUpdate(
          dirtySteps.map((s) => ({ key: [s.user_id, s.date], changes: { is_dirty: 1, is_deleted: 0 } }))
        );
      }

      // 11. XP Log
      const localXp = await db.xpLog.toArray();
      const dirtyXp = localXp.filter((x) => x.is_deleted !== 1);
      if (dirtyXp.length > 0) {
        await db.xpLog.bulkUpdate(
          dirtyXp.map((x) => ({ key: x.id, changes: { is_dirty: 1, is_deleted: 0 } }))
        );
      }

      console.log("[Sync] Robust memory-based self-healing recovery scan complete.");
    } catch (err) {
      console.error("[Sync] Robust memory-based self-healing recovery scan failed:", err);
    }
  },

  async pushAll() {
    if (isPushing) return;
    isPushing = true;

    console.log("[Sync] Initiating sequential self-healing push...");
    try {
      // 1. Run self-healing recovery scan to re-queue any unsynced local data
      await this.recoverUnsyncedRecords();

      // 2. Execute pushes sequentially in topological dependency order
      // Each is wrapped in try-catch so one table error does not collapse the entire pipeline.
      console.log("[Sync] Pushing user profiles...");
      try {
        await ProfileService.push();
      } catch (err) {
        console.error("[Sync] User profiles push failed:", err);
      }

      console.log("[Sync] Pushing body metrics...");
      try {
        await BodyMetricsService.push();
      } catch (err) {
        console.error("[Sync] Body metrics push failed:", err);
      }

      console.log("[Sync] Pushing goals...");
      try {
        await GoalService.push();
      } catch (err) {
        console.error("[Sync] Goals push failed:", err);
      }

      console.log("[Sync] Pushing exercises...");
      try {
        await ExerciseService.push();
      } catch (err) {
        console.error("[Sync] Exercises push failed:", err);
      }

      console.log("[Sync] Pushing routines...");
      try {
        await RoutineService.push();
      } catch (err) {
        console.error("[Sync] Routines push failed:", err);
      }

      console.log("[Sync] Pushing workouts...");
      try {
        await WorkoutService.push();
      } catch (err) {
        console.error("[Sync] Workouts push failed:", err);
      }

      console.log("[Sync] Pushing sets...");
      try {
        await WorkoutSetService.push();
      } catch (err) {
        console.error("[Sync] Sets push failed:", err);
      }

      console.log("[Sync] Pushing personal records...");
      try {
        await PersonalRecordsService.push();
      } catch (err) {
        console.error("[Sync] Personal records push failed:", err);
      }

      console.log("[Sync] Pushing steps...");
      try {
        await StepsService.push();
      } catch (err) {
        console.error("[Sync] Steps push failed:", err);
      }

      console.log("[Sync] Pushing XP logs...");
      try {
        await XpService.push();
      } catch (err) {
        console.error("[Sync] XP logs push failed:", err);
      }

      console.log("[Sync] Sequential push cycles completed.");
    } catch (e) {
      console.error("[Sync] Push cycle collapsed at top level:", e);
    } finally {
      isPushing = false;
    }
  },
};
