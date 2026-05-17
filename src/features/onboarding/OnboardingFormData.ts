export interface OnboardingFormData {
  name: string;
  gender: string;
  dob: string;
  height: number | "";
  weight: number | "";
  goalWeight: number | "";
  weeklyTarget: number;
  monthlyTarget: number | "";
  xp_level: "beginner" | "intermediate" | "advanced" | "elite" | "";
  initXp: number;
}
