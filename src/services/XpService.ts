import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import { SyncUtils } from "@/sync/SyncUtils";

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

async function addXpLog(
  userId: string,
  date: string,
  delta: number,
  reason: string,
  reward: "WORKOUT" | "CARDIO" | "STEPS" | "PR" | "REST" | "INACTIVE" | null
): Promise<void> {
  // 1. Prevent duplicate logs of the same action type on the same day
  const existing = await db.xpLog
    .where("user_id")
    .equals(userId)
    .filter(
      (x) =>
        x.date === date &&
        x.is_deleted === 0 &&
        (reward ? x.reward === reward : x.reason === reason)
    )
    .first();

  if (existing) {
    console.log(`[XpService] Duplicate ignored for user ${userId}, date ${date}`);
    return;
  }

  let finalDelta = delta;

  // 2. Enforce Daily Cap of 25 XP only for positive rewards
  if (delta > 0) {
    const dailyLogs = await db.xpLog
      .where("user_id")
      .equals(userId)
      .filter((x) => x.date === date && x.is_deleted === 0)
      .toArray();

    const currentDailyXp = dailyLogs.reduce((acc, curr) => acc + (curr.delta || 0), 0);
    if (currentDailyXp >= 25) {
      console.log(`[XpService] Daily XP Cap reached on ${date}`);
      return;
    }

    if (currentDailyXp + delta > 25) {
      finalDelta = 25 - currentDailyXp;
    }
  }

  // 3. Put into Dexie as dirty
  const entry = {
    id: crypto.randomUUID(),
    user_id: userId,
    date,
    delta: finalDelta,
    reason,
    reward,
    is_dirty: 1 as const,
    is_deleted: 0 as const,
    updated_at: new Date().toISOString(),
  };

  await db.xpLog.put(entry);

  // 4. Update Profile XP Total (xp is lifetime, current_xp is monthly)
  const profile = await db.userProfiles.get(userId);
  if (profile) {
    const newXp = Math.max(0, (profile.xp || 0) + finalDelta);
    const newCurrentXp = Math.max(0, (profile.current_xp || 0) + finalDelta);

    await db.userProfiles.put({
      ...profile,
      xp: newXp,
      current_xp: newCurrentXp,
      is_dirty: 1,
      updated_at: new Date().toISOString(),
    });
  }
}

export const XpService = {
  // Reward Triggers
  async rewardWorkout(userId: string, date: string = getTodayStr()) {
    await addXpLog(userId, date, 7, "Strength Workout Completion", "WORKOUT");
  },

  async rewardCardio(userId: string, date: string = getTodayStr()) {
    await addXpLog(userId, date, 5, "Cardio Workout Completion", "CARDIO");
  },

  async rewardSteps(userId: string, date: string = getTodayStr()) {
    await addXpLog(userId, date, 3, "Daily 8,000 Steps Goal", "STEPS");
  },

  async rewardPR(userId: string, date: string = getTodayStr()) {
    await addXpLog(userId, date, 10, "Achieved Exercise Personal Record", "PR");
  },

  async rewardRestDay(userId: string, date: string = getTodayStr()) {
    // Rest Day Reward logic with consecutive limit of 3 days
    const previousDates = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(date);
      d.setDate(d.getDate() - (i + 1));
      return d.toISOString().split("T")[0];
    });

    let consecutiveRestDays = 0;
    for (const prevDate of previousDates) {
      const restLog = await db.xpLog
        .where("user_id")
        .equals(userId)
        .filter(
          (x) =>
            x.date === prevDate &&
            x.is_deleted === 0 &&
            !!x.reason?.startsWith("Recovery Rest Day")
        )
        .first();
      if (restLog) {
        consecutiveRestDays++;
      } else {
        break;
      }
    }

    if (consecutiveRestDays >= 3) {
      console.log(`[XpService] Exceeded consecutive rest day limit.`);
      return;
    }

    const label = `Recovery Rest Day ${consecutiveRestDays + 1}`;
    await addXpLog(userId, date, 2, label, "REST");
  },

  // Inactivity Evaluator
  async evaluateInactivityPenalty(userId: string) {
    const workoutLogs = await db.xpLog
      .where("user_id")
      .equals(userId)
      .filter((x) => x.is_deleted === 0 && (x.reward === "WORKOUT" || x.reward === "CARDIO"))
      .toArray();

    workoutLogs.sort((a, b) => b.date.localeCompare(a.date));

    const todayStr = getTodayStr();
    const today = new Date(todayStr);

    let lastWorkoutDateStr = "";
    if (workoutLogs.length > 0) {
      lastWorkoutDateStr = workoutLogs[0].date;
    } else {
      const profile = await db.userProfiles.get(userId);
      if (profile) lastWorkoutDateStr = profile.created_at.split("T")[0];
      else return;
    }

    const lastWorkoutDate = new Date(lastWorkoutDateStr);
    const diffTime = Math.abs(today.getTime() - lastWorkoutDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 3) {
      for (let i = 4; i <= diffDays; i++) {
        const penaltyDateObj = new Date(lastWorkoutDate);
        penaltyDateObj.setDate(penaltyDateObj.getDate() + i);
        const penaltyDateStr = penaltyDateObj.toISOString().split("T")[0];

        const existingPenalty = await db.xpLog
          .where("user_id")
          .equals(userId)
          .filter((x) => x.date === penaltyDateStr && x.is_deleted === 0 && x.reason === "Inactivity Penalty")
          .first();

        if (!existingPenalty) {
          await addXpLog(userId, penaltyDateStr, -5, "Inactivity Penalty", "INACTIVE");
        }
      }
    }
  },

  // Levels mapper utilities
  getMonthlyLevel(monthlyXp: number) {
    if (monthlyXp <= 50) return { level: "Rookie", min: 0, max: 50 };
    if (monthlyXp <= 100) return { level: "Starter", min: 51, max: 100 };
    if (monthlyXp <= 150) return { level: "Grinder", min: 101, max: 150 };
    if (monthlyXp <= 200) return { level: "Warrior", min: 151, max: 200 };
    if (monthlyXp <= 250) return { level: "Athlete", min: 201, max: 250 };
    if (monthlyXp <= 300) return { level: "Elite", min: 251, max: 300 };
    return { level: "Champion", min: 301, max: Infinity };
  },

  getLifetimeLevel(lifetimeXp: number) {
    if (lifetimeXp <= 300) return { level: "Rookie", min: 0, max: 300 };
    if (lifetimeXp <= 900) return { level: "Grinder", min: 301, max: 900 };
    if (lifetimeXp <= 1800) return { level: "Warrior", min: 901, max: 1800 };
    if (lifetimeXp <= 3000) return { level: "Elite", min: 1801, max: 3000 };
    if (lifetimeXp <= 5000) return { level: "Veteran", min: 3001, max: 5000 };
    if (lifetimeXp <= 7500) return { level: "Pro", min: 5001, max: 7500 };
    if (lifetimeXp <= 10500) return { level: "Champion", min: 7501, max: 10500 };
    if (lifetimeXp <= 13500) return { level: "Legend", min: 10501, max: 13500 };
    if (lifetimeXp <= 16500) return { level: "Mythic", min: 13501, max: 16500 };
    if (lifetimeXp <= 20000) return { level: "Immortal", min: 16501, max: 20000 };
    return { level: "G.O.A.T", min: 20001, max: Infinity };
  },

  // Synced pushes
  async push(): Promise<void> {
    const { toDelete, toUpsert } = await SyncUtils.getPendingChanges("xpLog");

    if (toDelete.length > 0) {
      const ids = toDelete.map((row) => row.id);
      const { error } = await supabase.from("xp_log").delete().in("id", ids);
      if (!error) {
        await db.xpLog.bulkDelete(ids);
      }
    }

    if (toUpsert.length > 0) {
      const payload = toUpsert.map(
        ({ is_dirty: _d, is_deleted: _del, ...rest }) => rest
      );
      const { error } = await supabase.from("xp_log").upsert(payload);
      if (!error) {
        await db.xpLog.bulkUpdate(
          toUpsert.map((row) => ({
            key: row.id,
            changes: { is_dirty: 0, is_deleted: 0 },
          }))
        );
      }
    }
  },
};
