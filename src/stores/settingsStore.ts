import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SettingsState, ThemeMode, AccentColor } from "@/types/settings";

interface SettingsActions {
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (accent: AccentColor) => void;
  setWeightUnit: (unit: "kg" | "lbs") => void;
  setHeightUnit: (unit: "ft" | "cm") => void;
  setDurationUnit: (unit: "min" | "sec") => void;
  setDistanceUnit: (unit: "km" | "m") => void;
  setDefaultRestTimer: (seconds: number) => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      // Updated Initial State
      theme: "system",
      accentColor: "default",
      weightUnit: "kg",
      heightUnit: "cm",
      durationUnit: "sec",
      distanceUnit: "km",
      defaultRestTimer: 90,

      // Actions
      setTheme: (theme) => set({ theme }),

      setAccentColor: (accentColor) => set({ accentColor }),

      setWeightUnit: (weightUnit) => set({ weightUnit }),

      setHeightUnit: (heightUnit) => set({ heightUnit }),

      setDurationUnit: (durationUnit) => set({ durationUnit }),

      setDistanceUnit: (distanceUnit) => set({ distanceUnit }),

      setDefaultRestTimer: (defaultRestTimer) => set({ defaultRestTimer }),
    }),
    {
      name: "fittrack-settings-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
