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
      // Initial State
      theme: "system",
      accentColor: "default",
      weightUnit: "kg",
      heightUnit: "cm",
      durationUnit: "sec",
      distanceUnit: "km",
      defaultRestTimer: 90,

      // Actions
      setTheme: (theme) => {
        // Logic to update the DOM class for Tailwind
        const isDark =
          theme === "dark" ||
          (theme === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);

        if (isDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }

        set({ theme });
      },

      // Add to your useSettingsStore.ts inside the persist function:
      setAccentColor: (accentColor) => {
        // Remove all existing accent classes
        const accentClasses = ['accent-blue', 'accent-orange', 'accent-green', 'accent-purple', 'accent-pink', 'accent-yellow'];
        document.documentElement.classList.remove(...accentClasses);

        // Add the new one
        if (accentColor !== 'default') {
          document.documentElement.classList.add(`accent-${accentColor}`);
        }

        set({ accentColor });
      },

      setWeightUnit: (weightUnit) => set({ weightUnit }),

      setHeightUnit: (heightUnit) => set({ heightUnit }),

      setDurationUnit: (durationUnit) => set({ durationUnit }),

      setDistanceUnit: (distanceUnit) => set({ distanceUnit }),

      setDefaultRestTimer: (defaultRestTimer) => set({ defaultRestTimer }),
    }),
    {
      name: "fittrack-settings-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);