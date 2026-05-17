import Dexie, { type Table } from "dexie";
import type { Database } from "@/db/supabase";

// Helper type to dynamically pull structural fields directly from your Supabase Types schema definitions
type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/**
 * Adds local sync metadata modifiers for offline-first tables.
 * Uses 1 (true) and 0 (false) binary flags for rock-solid indexing performance.
 */
export type Syncable<T> = T & {
  is_dirty: 1 | 0;
  is_deleted: 1 | 0;
};

/**
 * Tracks synchronization timeline milestones per table to calculate delta pulls
 */
export interface SyncMetadata {
  table_name: string;
  last_pulled_at: string | null;
}

// Explicit Type aliases for easier imports across your service layers
export type LocalProfile = Syncable<Tables<"user_profiles">>;
export type LocalBodyMetric = Syncable<Tables<"body_metrics">>;
export type LocalGoal = Syncable<Tables<"goals">>;
export type LocalExercise = Syncable<Tables<"exercises">>;
export type LocalRoutine = Syncable<Tables<"routines">>;
export type LocalRoutineExercise = Syncable<Tables<"routine_exercises">>;
export type LocalWorkout = Syncable<Tables<"workouts">>;
export type LocalSet = Syncable<Tables<"sets">>;
export type LocalPersonalRecord = Syncable<Tables<"personal_records">>;
export type LocalStep = Syncable<Tables<"steps">>;
export type LocalXpLog = Syncable<Tables<"xp_log">>;

export class FitTrackDB extends Dexie {
  // ==========================================
  // Sync Status Metadata
  // ==========================================
  syncMetadata!: Table<SyncMetadata, string>;

  // ==========================================
  // Authenticated User Data Space (Syncable)
  // ==========================================
  userProfiles!: Table<LocalProfile, string>;
  bodyMetrics!: Table<LocalBodyMetric, [string, string]>; // Composite Key: [user_id, date]
  goals!: Table<LocalGoal, string>;
  exercises!: Table<LocalExercise, string>;
  routines!: Table<LocalRoutine, string>;
  routineExercises!: Table<LocalRoutineExercise, [string, string]>; // Composite Key: [routine_id, exercise_id]
  workouts!: Table<LocalWorkout, string>;
  sets!: Table<LocalSet, string>;
  personalRecords!: Table<LocalPersonalRecord, string>;
  steps!: Table<LocalStep, [string, string]>; // Composite Key: [user_id, date]
  xpLog!: Table<LocalXpLog, string>;

  // ==========================================
  // Static Reference / App Platform Data (Read-Only System Data)
  // ==========================================
  muscleGroups!: Table<Tables<"muscle_groups">, number>;
  muscles!: Table<Tables<"muscles">, number>;

  constructor() {
    super("FitTrackDB");

    // Version 1 Core Database Stores Configuration Schema
    this.version(1).stores({
      // Primary Key Tracking Configuration
      syncMetadata: "table_name",

      // Syncable User Stores
      // We index 'is_dirty' and 'is_deleted' as flat integer fields to support O(log n) searches
      userProfiles: "user_id, is_dirty, is_deleted",
      bodyMetrics: "[user_id+date], user_id, date, is_dirty, is_deleted",
      exercises:
        "id, user_id, muscle_group_id, muscle_id, is_dirty, is_deleted",
      goals: "id, user_id, goaltype, completed_at, is_dirty, is_deleted",
      personalRecords: "id, user_id, exercise_id, prtype, is_dirty, is_deleted",
      routines: "id, user_id, updated_at, is_dirty, is_deleted",
      routineExercises:
        "[routine_id+exercise_id], routine_id, exercise_id, is_dirty, is_deleted",
      workouts: "id, user_id, date, is_dirty, is_deleted",
      sets: "id, workout_id, exercise_id, user_id, is_dirty, is_deleted",
      steps: "[user_id+date], user_id, date, is_dirty, is_deleted",
      xpLog: "id, user_id, date, is_dirty, is_deleted",

      // Static Reference Collections
      muscleGroups: "id, name",
      muscles: "id, muscle_group, name",
    });
  }
}

/**
 * Shared Global Singleton Database Instance
 */
export const db = new FitTrackDB();
