import { create } from "zustand";

interface WorkoutUIState {
  expandedExercises: Record<string, boolean>;
  setExpanded: (exerciseId: string, isExpanded: boolean) => void;
  toggleExercise: (exerciseId: string) => void;
  clearUIState: () => void;
}

export const useWorkoutUIStore = create<WorkoutUIState>((set) => ({
  expandedExercises: {},
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
  clearUIState: () => set({ expandedExercises: {} }),
}));
