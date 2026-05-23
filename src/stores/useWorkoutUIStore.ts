import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PRCelebrationPayload {
  exerciseId: string;
  exerciseName: string;
  oldValue: number | null;
  newValue: number;
}

interface WorkoutUIState {
  expandedExercises: Record<string, boolean>;
  lockedExercises: Record<string, boolean>;
  exerciseOrder: string[];
  activeRestTimers: Record<string, number>;
  activePRCelebration: PRCelebrationPayload | null;
  activeWorkoutId: string | null;

  // New helper for instant UI checks
  isWorkoutActive: () => boolean;

  setExpanded: (exerciseId: string, isExpanded: boolean) => void;
  toggleExercise: (exerciseId: string) => void;
  toggleLockExercise: (exerciseId: string) => void;
  setExerciseOrder: (order: string[]) => void;
  setActiveWorkoutId: (id: string | null) => void;

  startRestTimer: (exerciseId: string, durationSec: number) => void;
  decrementRestTimer: (exerciseId: string) => void;
  clearRestTimer: (exerciseId: string) => void;

  triggerPRCelebration: (payload: PRCelebrationPayload) => void;
  clearPRCelebration: () => void;

  clearUIState: () => void;
}

export const useWorkoutUIStore = create<WorkoutUIState>()(
  persist(
    (set, get) => ({
      expandedExercises: {},
      lockedExercises: {},
      exerciseOrder: [],
      activeRestTimers: {},
      activePRCelebration: null,
      activeWorkoutId: null,

      // Implementation of the boolean helper
      isWorkoutActive: () => !!get().activeWorkoutId,

      setExpanded: (exerciseId, isExpanded) =>
        set((state) => ({
          expandedExercises: {
            ...state.expandedExercises,
            [exerciseId]: isExpanded,
          },
        })),

      toggleExercise: (exerciseId) =>
        set((state) => ({
          expandedExercises: {
            ...state.expandedExercises,
            [exerciseId]: !state.expandedExercises[exerciseId],
          },
        })),

      toggleLockExercise: (exerciseId) =>
        set((state) => ({
          lockedExercises: {
            ...state.lockedExercises,
            [exerciseId]: !state.lockedExercises[exerciseId],
          },
        })),

      setExerciseOrder: (order) => set({ exerciseOrder: order }),

      setActiveWorkoutId: (id) => set({ activeWorkoutId: id }),

      startRestTimer: (exerciseId, durationSec) =>
        set((state) => ({
          activeRestTimers: {
            ...state.activeRestTimers,
            [exerciseId]: durationSec,
          },
        })),

      decrementRestTimer: (exerciseId) =>
        set((state) => ({
          activeRestTimers: {
            ...state.activeRestTimers,
            [exerciseId]: Math.max(
              0,
              (state.activeRestTimers[exerciseId] || 0) - 1,
            ),
          },
        })),

      clearRestTimer: (exerciseId) =>
        set((state) => ({
          activeRestTimers: { ...state.activeRestTimers, [exerciseId]: 0 },
        })),

      triggerPRCelebration: (payload) => set({ activePRCelebration: payload }),
      clearPRCelebration: () => set({ activePRCelebration: null }),

      clearUIState: () =>
        set({
          expandedExercises: {},
          lockedExercises: {},
          exerciseOrder: [],
          activeRestTimers: {},
          activePRCelebration: null,
          activeWorkoutId: null,
        }),
    }),
    {
      name: "workout-ui-storage",
    },
  ),
);
