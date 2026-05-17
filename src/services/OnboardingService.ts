import { ProfileService } from "@/services/ProfileService";
import { BodyMetricsService } from "@/services/BodyMetricsService";
import { GoalService } from "@/services/GoalService";
import { db } from "@/db";

export interface OnboardingData {
  name: string;
  gender: string;
  dob: string;
  height: number;
  weight: number;
  goalWeight: number;
  weeklyTarget: number;
  monthlyTarget: number;
  initXp: number;
}

export const onboardingService = {
  async completeOnboarding(userId: string, data: OnboardingData) {
    const now = new Date().toISOString();

    return await db.transaction(
      "rw",
      [db.userProfiles, db.bodyMetrics, db.goals],
      async () => {
        // Create Profile
        await ProfileService.upsertLocal({
          user_id: userId,
          name: data.name,
          dob: data.dob,
          gender: data.gender,
          role: "USER",
          current_xp: data.initXp,
          xp: data.initXp,
          created_at: now,
          updated_at: now,
        });

        // Initial Metrics
        await BodyMetricsService.addEntry({
          user_id: userId,
          date: now.split("T")[0],
          weight: data.weight,
          height: data.height,
          updated_at: now,
          belly: null,
          bicep: null,
          chest: null,
          forearm: null,
          hip: null,
          shoulder: null,
          thigh: null,
          waist: null,
        });

        // Measurement Goal
        await GoalService.createGoal({
          user_id: userId,
          name: "Weight Goal",
          target: data.goalWeight,
          goaltype: "MEASUREMENT",
          completed_at: null,
        });

        // Consistency Goal
        await GoalService.createGoal({
          user_id: userId,
          name: "Weekly Frequency",
          target: data.weeklyTarget,
          goaltype: "WORKOUT_DAYS",
          completed_at: null,
        });

        // Consistency Goal
        await GoalService.createGoal({
          user_id: userId,
          name: "Monthly Frequency",
          target: data.monthlyTarget,
          goaltype: "WORKOUT_DAYS",
          completed_at: null,
        });
      },
    );
  },
};
