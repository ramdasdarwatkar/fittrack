export const APP_TABS = {
  DASHBOARD: "dashboard",
  WORKOUTS: "workouts",
  NUTRITION: "nutrition",
  PROFILE: "profile",
} as const;

export type AppTab = (typeof APP_TABS)[keyof typeof APP_TABS];

// Sub-tabs for the Workouts/Library section
export const WORKOUT_SUB_TABS = {
  ROUTINES: "routines",
  EXERCISES: "exercises",
  HISTORY: "history",
} as const;

export type WorkoutSubTab =
  (typeof WORKOUT_SUB_TABS)[keyof typeof WORKOUT_SUB_TABS];
