export type ThemeMode = "light" | "dark" | "system";

export type AccentColor = "default" | "blue" | "orange" | "green";

export interface SettingsState {
  theme: ThemeMode;
  accentColor: AccentColor;
  weightUnit: "kg" | "lbs";
  heightUnit: "ft" | "cm";
  durationUnit: "min" | "sec";
  distanceUnit: "km" | "m";
  defaultRestTimer: number; // in seconds
}
