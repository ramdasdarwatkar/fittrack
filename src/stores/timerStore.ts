import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TimerState, TimerEntry } from "@/types/timer";

interface TimerActions {
  startTimer: (id: string, label?: string) => void;
  startRestTimer: (durationSeconds: number) => void;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  stopTimer: (id: string) => void;
  clearRestTimer: () => void;
}

export const useTimerStore = create<TimerState & TimerActions>()(
  persist(
    (set) => ({
      activeTimers: {},
      activeRestTimerId: null,

      startTimer: (id, label) =>
        set((state) => ({
          activeTimers: {
            ...state.activeTimers,
            [id]: {
              id,
              startTime: Date.now(),
              pausedAt: null,
              elapsedMs: 0,
              label,
            },
          },
        })),

      startRestTimer: (durationSeconds) => {
        const id = "rest-timer";
        set((state) => ({
          activeRestTimerId: id,
          activeTimers: {
            ...state.activeTimers,
            [id]: {
              id,
              startTime: Date.now(),
              pausedAt: null,
              elapsedMs: 0,
              targetSeconds: durationSeconds, // Now correctly utilized
              label: "Rest",
            },
          },
        }));
      },

      pauseTimer: (id) =>
        set((state) => {
          const timer = state.activeTimers[id];
          if (!timer || timer.pausedAt) return state;
          return {
            activeTimers: {
              ...state.activeTimers,
              [id]: {
                ...timer,
                pausedAt: Date.now(),
                elapsedMs: timer.elapsedMs + (Date.now() - timer.startTime),
              },
            },
          };
        }),

      resumeTimer: (id) =>
        set((state) => {
          const timer = state.activeTimers[id];
          if (!timer || !timer.pausedAt) return state;
          return {
            activeTimers: {
              ...state.activeTimers,
              [id]: {
                ...timer,
                startTime: Date.now(),
                pausedAt: null,
              },
            },
          };
        }),

      stopTimer: (id) =>
        set((state) => {
          const nextTimers = { ...state.activeTimers };
          delete nextTimers[id];
          return {
            activeTimers: nextTimers,
            activeRestTimerId:
              state.activeRestTimerId === id ? null : state.activeRestTimerId,
          };
        }),

      clearRestTimer: () =>
        set((state) => {
          const nextTimers = { ...state.activeTimers };
          delete nextTimers["rest-timer"];
          return {
            activeTimers: nextTimers,
            activeRestTimerId: null,
          };
        }),
    }),
    {
      name: "fittrack-timer-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
