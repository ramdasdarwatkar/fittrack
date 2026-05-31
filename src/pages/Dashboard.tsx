import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Play,
  Dumbbell,
  Calendar,
  Flame,
  Sunrise,
  Sun,
  Sparkle,
  Sunset,
  Moon,
  CloudMoon,
  Clock,
  RotateCcw,
  Footprints,
  Droplet,
  Edit3,
  Check,
  X,
  Undo2,
  Award,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import { SyncService } from "@/services/SyncService";
import { WorkoutService } from "@/services/WorkoutService";
import { StepsService } from "@/services/StepsService";
import { XpService } from "@/services/XpService";
import { HumanAnatomy } from "@/components/anatomy/HumanAnatomy";

const getTodayDateString = (): string => new Date().toISOString().split("T")[0];

export default function Dashboard() {
  const BASE_URL = import.meta.env.BASE_URL || "/";
  const [userId, setUserId] = useState<string | null>(null);

  // Time Travel Date state (defaults to today)
  const [activeDate, setActiveDate] = useState(getTodayDateString());

  // Step editing states
  const [isEditingSteps, setIsEditingSteps] = useState(false);
  const [tempSteps, setTempSteps] = useState("");

  // Weight editing states
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [tempWeight, setTempWeight] = useState("");

  const location = useLocation();
  const navigate = useNavigate();

  const activeSession = useLiveQuery(() => WorkoutService.getActiveSession());

  useEffect(() => {
    if (location.state?.syncOnMount) {
      const executeAuthSync = async () => {
        try {
          await SyncService.pushAll();
        } catch (err) {
          console.error(err);
        }
        try {
          await SyncService.pullAll();
        } catch (err) {
          console.error(err);
        }
      };
      executeAuthSync();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const getSessionUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) setUserId(user.id);
    };
    getSessionUser();
  }, []);

  // ── Database Queries ──
  const profile = useLiveQuery(
    async () => (userId ? await db.userProfiles.get(userId) : null),
    [userId],
  );

  const pastCompletedWorkouts = useLiveQuery(
    async () => {
      if (!userId) return [];
      return await db.workouts
        .where("user_id")
        .equals(userId)
        .filter((w) => w.completed === 1 && w.is_deleted === 0)
        .toArray();
    },
    [userId]
  ) || [];

  const streak = profile?.active_days?.length ?? 0;
  const firstName = useMemo(() => {
    const name = profile?.name?.trim().split(" ")[0] || "Athlete";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }, [profile?.name]);

  // Today / Selected Active Date DB query for Steps & Water
  const todayRecord = useLiveQuery(
    async () => (userId ? await db.steps.get([userId, activeDate]) : null),
    [userId, activeDate]
  );
  const todaySteps = todayRecord?.steps ?? 0;
  const todayWater = todayRecord?.water ?? 0;

  const stepsGoal = 8000;
  const waterGoal = 2500;

  // Log steps using real DB StepsService
  const handleSaveSteps = async (count: number) => {
    if (!userId) return;
    const validatedCount = Math.max(0, count);
    try {
      await StepsService.logSteps(userId, activeDate, validatedCount);
      setIsEditingSteps(false);
    } catch (err) {
      console.error("[Dashboard] Error logging steps:", err);
    }
  };

  const handleQuickAddSteps = async (amount: number) => {
    await handleSaveSteps(todaySteps + amount);
  };

  // Log water using real DB StepsService
  const handleSaveWater = async (amount: number) => {
    if (!userId) return;
    const validatedAmount = Math.max(0, amount);
    try {
      await StepsService.logWater(userId, activeDate, validatedAmount);
    } catch (err) {
      console.error("[Dashboard] Error logging water:", err);
    }
  };

  const handleQuickAddWater = async (amount: number) => {
    await handleSaveWater(todayWater + amount);
  };

  // Weekly & Monthly Workout Completed Counters
  const workoutCounts = useLiveQuery(
    async () => {
      if (!userId) return { weekCount: 0, monthCount: 0 };
      const now = new Date();

      // Current calendar week start (Monday)
      const currentDay = now.getDay();
      const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + distanceToMon);
      monday.setHours(0, 0, 0, 0);
      const startOfWeekStr = monday.toISOString().split("T")[0];

      // Current month start
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonthStr = firstOfMonth.toISOString().split("T")[0];

      const allWorkouts = await db.workouts
        .where("user_id")
        .equals(userId)
        .filter((w) => w.completed === 1 && w.is_deleted === 0)
        .toArray();

      const weekWorkouts = allWorkouts.filter((w) => w.date >= startOfWeekStr);
      const monthWorkouts = allWorkouts.filter((w) => w.date >= startOfMonthStr);

      return {
        weekCount: weekWorkouts.length,
        monthCount: monthWorkouts.length,
      };
    },
    [userId]
  );
  const weeklyWorkoutsCount = workoutCounts?.weekCount ?? 0;
  const monthlyWorkoutsCount = workoutCounts?.monthCount ?? 0;

  // Goals table query to retrieve weekly target workouts
  const goalsList = useLiveQuery(
    async () => (userId ? await db.goals.where("user_id").equals(userId).toArray() : []),
    [userId]
  );
  const weeklyWorkoutTarget = useMemo(() => {
    const goal = goalsList?.find((g) => g.goaltype === "WORKOUT_DAYS" && g.name === "week");
    return goal?.target ?? 4; // Default to 4 workouts/week
  }, [goalsList]);

  const monthlyWorkoutTarget = useMemo(() => {
    const goal = goalsList?.find((g) => g.goaltype === "WORKOUT_DAYS" && g.name === "month");
    return goal?.target ?? (weeklyWorkoutTarget * 4); // Default to 16 workouts/month
  }, [goalsList, weeklyWorkoutTarget]);

  const weeklyWorkoutPercent = Math.min(100, Math.round((weeklyWorkoutsCount / weeklyWorkoutTarget) * 100));
  const monthlyWorkoutPercent = Math.min(100, Math.round((monthlyWorkoutsCount / monthlyWorkoutTarget) * 100));

  // Body Metrics Weight Logs Query
  const weightLogs = useLiveQuery(
    async () => (userId ? await db.bodyMetrics.where("user_id").equals(userId).toArray() : []),
    [userId]
  );

  const latestWeight = useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) return 0;
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[sorted.length - 1]?.weight ?? 0;
  }, [weightLogs]);

  const previousWeight = useMemo(() => {
    if (!weightLogs || weightLogs.length <= 1) return 0;
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[sorted.length - 2]?.weight ?? 0;
  }, [weightLogs]);

  const weightChange = useMemo(() => {
    if (latestWeight === 0 || previousWeight === 0) return 0;
    return latestWeight - previousWeight;
  }, [latestWeight, previousWeight]);

  const handleSaveWeight = async (weightVal: number) => {
    if (!userId) return;
    const validatedWeight = Math.max(0, weightVal);
    const todayStr = getTodayDateString();

    const sortedMetrics = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
    const latestMetric = sortedMetrics[sortedMetrics.length - 1];

    const record = {
      user_id: userId,
      date: todayStr,
      weight: validatedWeight,
      height: latestMetric?.height ?? 170,
      updated_at: new Date().toISOString(),
      is_dirty: 1 as const,
      is_deleted: 0 as const,
    };

    try {
      await db.bodyMetrics.put(record);
      setIsEditingWeight(false);
    } catch (err) {
      console.error("[Dashboard] Error logging weight:", err);
    }
  };

  // Weekly calendar constructor (Monday to Sunday)
  const currentCalendarWeek = useMemo(() => {
    const list = [];
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMon);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayName = days[d.getDay()];
      const isCompleted = profile?.active_days?.includes(dateStr) ?? false;
      list.push({
        dateStr,
        dayName,
        dayNum: d.getDate(),
        isCompleted,
        isToday: dateStr === getTodayDateString(),
        isSelected: dateStr === activeDate,
      });
    }
    return list;
  }, [profile?.active_days, activeDate]);

  const last14Days = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const days = ["S", "M", "T", "W", "T", "F", "S"];
      const dayName = days[d.getDay()];
      const isCompleted = profile?.active_days?.includes(dateStr) ?? false;
      list.push({
        dateStr,
        dayName,
        dayNum: d.getDate(),
        isCompleted,
        isToday: dateStr === getTodayDateString(),
      });
    }
    return list;
  }, [profile?.active_days]);

  const activeDaysCount = useMemo(() => {
    const last14Str = last14Days.map((d) => d.dateStr);
    const trained = profile?.active_days?.filter((d) => last14Str.includes(d)) ?? [];
    return trained.length;
  }, [last14Days, profile?.active_days]);

  const consistencyScore = Math.round((activeDaysCount / 14) * 100);

  const sparklineData = useMemo(() => {
    if (!weightLogs || weightLogs.length < 2) {
      // Elegant default trend line to guarantee stunning visuals
      return [
        { x: 10, y: 55, val: 78.5 },
        { x: 68, y: 35, val: 77.8 },
        { x: 126, y: 45, val: 77.9 },
        { x: 184, y: 20, val: 77.1 },
        { x: 242, y: 30, val: 77.3 },
        { x: 290, y: 10, val: 76.5 },
      ];
    }
    const sorted = [...weightLogs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-6);
    const minW = Math.min(...sorted.map((d) => d.weight)) * 0.99;
    const maxW = Math.max(...sorted.map((d) => d.weight)) * 1.01;
    const range = maxW - minW || 1;

    return sorted.map((d, idx) => {
      const x = 10 + (idx * 280) / (sorted.length - 1);
      const y = 60 - ((d.weight - minW) / range) * 45; // Map weight to Y-axis (height 75)
      return { x, y, val: d.weight, date: d.date };
    });
  }, [weightLogs]);

  // Weekly trained muscle sets query
  const weeklyTrainedMusclesData = useLiveQuery(
    async () => {
      if (!userId) return null;

      const weekDates = currentCalendarWeek.map((w) => w.dateStr);

      const weekWorkouts = await db.workouts
        .where("user_id")
        .equals(userId)
        .filter((w) => weekDates.includes(w.date) && w.completed === 1 && w.is_deleted === 0)
        .toArray();

      const workoutIds = weekWorkouts.map((w) => w.id);
      const weekSets = await db.sets
        .where("user_id")
        .equals(userId)
        .filter((s) => workoutIds.includes(s.workout_id) && s.is_deleted === 0)
        .toArray();

      const exerciseIds = Array.from(new Set(weekSets.map((s) => s.exercise_id)));
      const weekExercises = await db.exercises
        .where("id")
        .anyOf(exerciseIds)
        .toArray();

      const muscleGroupIds = Array.from(new Set(weekExercises.map((e) => e.muscle_group_id)));
      const muscleGroups = await db.muscleGroups.bulkGet(muscleGroupIds);
      const muscleGroupMap = new Map(
        muscleGroups.filter(Boolean).map((mg) => [mg!.id, mg!.name])
      );

      const muscleCounts: Record<string, number> = {};
      weekSets.forEach((set) => {
        const exercise = weekExercises.find((e) => e.id === set.exercise_id);
        if (exercise) {
          const groupName = muscleGroupMap.get(exercise.muscle_group_id) || "Strength";
          muscleCounts[groupName] = (muscleCounts[groupName] || 0) + 1;
        }
      });

      return {
        workoutsCount: weekWorkouts.length,
        setsCount: weekSets.length,
        muscleCounts,
      };
    },
    [userId, currentCalendarWeek]
  );

  const strongestMuscleThisWeek = useMemo(() => {
    if (!weeklyTrainedMusclesData) return "Strength";
    const { muscleCounts } = weeklyTrainedMusclesData;
    let maxSets = 0;
    let topMuscle = "Strength";
    Object.entries(muscleCounts).forEach(([muscle, sets]) => {
      if (sets > maxSets) {
        maxSets = sets;
        topMuscle = muscle;
      }
    });
    return topMuscle;
  }, [weeklyTrainedMusclesData]);



  // Personal Records logs query to fetch the actual latest PR
  const recentPRs = useLiveQuery(
    async () => (userId ? await db.personalRecords.where("user_id").equals(userId).toArray() : []),
    [userId]
  );

  const latestPR = useMemo(() => {
    if (!recentPRs || recentPRs.length === 0) return null;
    const sorted = [...recentPRs].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return sorted[0];
  }, [recentPRs]);

  const prExercise = useLiveQuery(
    async () => {
      if (!latestPR) return null;
      return await db.exercises.get(latestPR.exercise_id);
    },
    [latestPR]
  );



  const headerMeta = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    let greeting = "Good morning",
      Icon = Sunrise;
    if (hour >= 9 && hour < 12) {
      greeting = "Good morning";
      Icon = Sun;
    } else if (hour >= 12 && hour < 17) {
      greeting = "Good afternoon";
      Icon = Sparkle;
    } else if (hour >= 17 && hour < 21) {
      greeting = "Good evening";
      Icon = Sunset;
    } else if (hour >= 21 || hour < 5) {
      greeting = "Good night";
      Icon = Moon;
    } else {
      greeting = "Early bird";
      Icon = CloudMoon;
    }

    const months = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return {
      dayNum: String(now.getDate()).padStart(2, "0"),
      shortMonth: months[now.getMonth()],
      shortDay: days[now.getDay()],
      timeGreeting: greeting,
      TimeIcon: Icon,
    };
  }, []);

  const bottlePercent = Math.min(100, Math.max(0, (todayWater / waterGoal) * 100));

  return (
    <div
      className="min-h-screen select-none pb-12"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="px-4 pt-4 pb-4 space-y-6 max-w-lg mx-auto">

        {/* ── 1. Stylish Header (Dynamic greeting + right side calendar history chip) ── */}
        <header className="flex justify-between items-center pt-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-1 animate-pulse">
              <headerMeta.TimeIcon
                size={12}
                style={{ color: "var(--primary)" }}
              />
              <span
                className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: "var(--primary)" }}
              >
                {headerMeta.timeGreeting}
              </span>
            </div>
            <h1
              className="font-black leading-none bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent"
              style={{
                fontSize: 28,
                letterSpacing: "-0.04em",
                color: "var(--foreground)"
              }}
            >
              {firstName}
            </h1>
          </div>

          {/* Calendar chip button on the right side */}
          <button
            onClick={() => navigate("/history")}
            className="rounded-2xl overflow-hidden transition-all active:scale-95 border shrink-0 hover:border-primary/50"
            style={{
              width: 52,
              borderColor: "var(--border)",
              background: "var(--card)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div
              className="w-full py-1 flex justify-center"
              style={{ background: "var(--primary)" }}
            >
              <span
                className="text-[8px] font-black tracking-widest leading-none"
                style={{ color: "var(--primary-foreground)" }}
              >
                {headerMeta.shortMonth}
              </span>
            </div>
            <div
              className="flex flex-col items-center pb-1.5 pt-1"
              style={{ background: "var(--card)" }}
            >
              <span
                className="font-black tabular-nums leading-none text-foreground"
                style={{ fontSize: 20, letterSpacing: "-0.03em" }}
              >
                {headerMeta.dayNum}
              </span>
              <span
                className="text-[8px] font-bold uppercase tracking-tight mt-0.5"
                style={{ color: "var(--muted-foreground)" }}
              >
                {headerMeta.shortDay}
              </span>
            </div>
          </button>
        </header>

        {/* ── ROW 1: Workout Goals & Steps HUD (2-Column Grid) ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* LEFT COLUMN: Goals Concentric Apple Progress Rings */}
          <div
            className="rounded-3xl p-4 flex flex-col justify-between border relative overflow-hidden"
            style={{
              background: "color-mix(in srgb, var(--card) 70%, transparent)",
              backdropFilter: "blur(12px)",
              borderColor: "var(--border)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.03)",
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--muted-foreground)" }}>
                  Workout Goals
                </p>
                <h3 className="font-black text-xs uppercase tracking-tight text-foreground leading-none">
                  Activity Rings
                </h3>
              </div>
              <Trophy size={14} style={{ color: "var(--warning)" }} />
            </div>

            {/* Apple Progress Rings Visualizer */}
            <div className="flex items-center justify-center py-2 relative">
              <svg width="105" height="105" viewBox="0 0 100 100" className="transform -rotate-90">
                {/* Background tracks */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--border)" strokeWidth="8" opacity="0.12" />
                <circle cx="50" cy="50" r="28" fill="transparent" stroke="var(--border)" strokeWidth="8" opacity="0.12" />

                {/* Monthly Progress (Outer Ring) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#ff2d55"
                  strokeWidth="8"
                  strokeDasharray="251.3"
                  strokeDashoffset={251.3 - (251.3 * Math.min(100, monthlyWorkoutPercent)) / 100}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
                />

                {/* Weekly Progress (Inner Ring) */}
                <circle
                  cx="50"
                  cy="50"
                  r="28"
                  fill="transparent"
                  stroke="#00d2ff"
                  strokeWidth="8"
                  strokeDasharray="175.9"
                  strokeDashoffset={175.9 - (175.9 * Math.min(100, weeklyWorkoutPercent)) / 100}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
                />
              </svg>

              {/* Central Flame Icon for style */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Flame size={14} className="text-warning fill-current" />
              </div>
            </div>

            {/* Mini HUD indicators */}
            <div className="flex flex-col gap-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground border-t pt-2 mt-1" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d55]" />
                  Month
                </span>
                <span className="text-foreground font-black tabular-nums">
                  {monthlyWorkoutsCount}/{monthlyWorkoutTarget}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]" />
                  Week
                </span>
                <span className="text-foreground font-black tabular-nums">
                  {weeklyWorkoutsCount}/{weeklyWorkoutTarget}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Steps Tracker Card with controls */}
          <div
            className="rounded-3xl p-4 flex flex-col justify-between border relative overflow-hidden"
            style={{
              background: "color-mix(in srgb, var(--card) 70%, transparent)",
              backdropFilter: "blur(12px)",
              borderColor: "var(--border)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.03)",
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-1.5 items-center">
                <Footprints size={14} style={{ color: "var(--primary)" }} />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: "var(--muted-foreground)" }}>
                    Daily Steps
                  </p>
                  <h3 className="font-black text-xs uppercase tracking-tight text-foreground leading-none">
                    Footsteps HUD
                  </h3>
                </div>
              </div>

              {/* Edit button */}
              <button
                onClick={() => {
                  setTempSteps(String(todaySteps));
                  setIsEditingSteps(!isEditingSteps);
                }}
                className="p-1 rounded-lg hover:bg-muted-foreground/10 text-muted-foreground active:scale-90 transition-all cursor-pointer"
              >
                <Edit3 size={11} />
              </button>
            </div>

            {/* Apple Progress Ring Visualizer for Steps */}
            <div className="flex items-center justify-center py-2 relative">
              <svg width="105" height="105" viewBox="0 0 100 100" className="transform -rotate-90">
                {/* Background track */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="var(--border)"
                  strokeWidth="8"
                  opacity="0.12"
                />

                {/* Steps Progress (Outer Ring style matching outer ring height) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="var(--primary)"
                  strokeWidth="8"
                  strokeDasharray="251.3"
                  strokeDashoffset={251.3 - (251.3 * Math.min(100, (todaySteps / stepsGoal) * 100)) / 100}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
                />
              </svg>

              {/* Central Steps Icon at center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Footprints size={18} className="text-primary animate-pulse" />
              </div>
            </div>

            {/* Mini HUD indicators matching left card height */}
            <div className="flex flex-col gap-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground border-t pt-2 mt-1" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <span>Steps</span>
                <span className="text-foreground font-black tabular-nums">
                  {todaySteps.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Goal</span>
                <span className="text-foreground font-black tabular-nums">
                  {stepsGoal.toLocaleString()} ({Math.round((todaySteps / stepsGoal) * 100)}%)
                </span>
              </div>
            </div>

            {/* Input toggle or rapid add/subtract controllers */}
            <div className="mt-1 border-t pt-2" style={{ borderColor: "var(--border)" }}>
              <AnimatePresence mode="wait">
                {isEditingSteps ? (
                  <motion.div
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    className="flex items-center gap-1 w-full"
                  >
                    <input
                      type="number"
                      value={tempSteps}
                      onChange={(e) => setTempSteps(e.target.value)}
                      placeholder="Steps"
                      className="w-full h-7 px-2 rounded-lg text-xs font-bold border focus:outline-none"
                      style={{
                        background: "var(--secondary)",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                    />
                    <button
                      onClick={() => handleSaveSteps(Number(tempSteps))}
                      className="p-1 rounded-lg text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer"
                    >
                      <Check size={11} strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => setIsEditingSteps(false)}
                      className="p-1 rounded-lg text-destructive bg-destructive/10 hover:bg-destructive/20 cursor-pointer"
                    >
                      <X size={11} strokeWidth={3} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between gap-1 w-full"
                  >
                    <button
                      onClick={() => handleQuickAddSteps(-1000)}
                      className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase bg-secondary text-foreground active:scale-95 border transition-all cursor-pointer text-center font-bold"
                    >
                      -1K
                    </button>
                    <button
                      onClick={() => handleQuickAddSteps(1000)}
                      className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase bg-primary text-primary-foreground active:scale-95 transition-all cursor-pointer text-center font-bold"
                    >
                      +1K
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── ROW 2: Hydration & Workout CTA Grid (2 Columns) ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* LEFT COLUMN: Water Bottle filling SVG card */}
          <div
            className="rounded-3xl p-4 flex flex-col justify-between border relative overflow-hidden"
            style={{
              background: "color-mix(in srgb, var(--card) 70%, transparent)",
              backdropFilter: "blur(12px)",
              borderColor: "var(--border)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.03)",
            }}
          >
            <div className="flex justify-between items-center">
              <div className="flex gap-1.5 items-center">
                <Droplet size={14} style={{ color: "#00d2ff" }} />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: "var(--muted-foreground)" }}>
                    Hydration Level
                  </p>
                  <h3 className="font-black text-xs uppercase tracking-tight text-foreground leading-none">
                    Water Intake
                  </h3>
                </div>
              </div>
            </div>

            {/* Dynamic Water Bottle SVG visualizer using clipping masks */}
            <div className="flex items-center justify-center py-2">
              <div className="relative w-16 h-28 shrink-0 flex items-center justify-center">
                {/* Background outline */}
                <img
                  src={`${BASE_URL}svg/water_bottle.svg`}
                  className="absolute inset-0 w-full h-full object-contain opacity-25"
                  alt="Bottle Background"
                />

                {/* Liquid filling using mask */}
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    maskImage: `url('${BASE_URL}svg/water_bottle.svg')`,
                    WebkitMaskImage: `url('${BASE_URL}svg/water_bottle.svg')`,
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                  }}
                >
                  <div
                    className="absolute bottom-0 w-full transition-all duration-500 ease-out"
                    style={{
                      height: `${bottlePercent}%`,
                      background: "linear-gradient(180deg, #22BED5 0%, #1A85D2 100%)",
                    }}
                  />
                </div>

                {/* Foreground outline & reflections */}
                <img
                  src={`${BASE_URL}svg/water_bottle.svg`}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-multiply dark:mix-blend-screen"
                  alt="Bottle Glass"
                />

                {/* Percentage label floating */}
                <span className="absolute inset-0 flex items-center justify-center font-black text-[10px] tabular-nums text-foreground filter drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {Math.round(bottlePercent)}%
                </span>
              </div>
            </div>

            {/* Controls to add/subtract water */}
            <div className="flex items-center gap-1.5 mt-1 border-t pt-2" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => handleQuickAddWater(-250)}
                disabled={todayWater <= 0}
                className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase bg-secondary text-foreground disabled:opacity-40 disabled:pointer-events-none active:scale-95 border transition-all cursor-pointer text-center font-bold"
              >
                -250ml
              </button>
              <button
                onClick={() => handleQuickAddWater(250)}
                className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase bg-primary text-primary-foreground active:scale-95 transition-all cursor-pointer text-center font-bold"
              >
                +250ml
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Workout Start / Resume CTA Card */}
          <div
            onClick={() => navigate(activeSession ? "/workout" : "/workout?mode=live")}
            className="rounded-3xl p-4 flex flex-col justify-between border relative overflow-hidden cursor-pointer transition-all active:scale-[0.98] group"
            style={{
              background: activeSession
                ? "linear-gradient(135deg, color-mix(in srgb, var(--warning) 15%, var(--card)), color-mix(in srgb, var(--warning) 5%, var(--card)))"
                : "linear-gradient(135deg, color-mix(in srgb, var(--primary) 15%, var(--card)), color-mix(in srgb, var(--primary) 5%, var(--card)))",
              borderColor: activeSession ? "var(--warning)" : "var(--border)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.03)",
            }}
          >
            {/* Pulsing indicator */}
            <div className="absolute top-4 right-4 flex items-center justify-center">
              <span className={`w-2.5 h-2.5 rounded-full ${activeSession ? "bg-warning animate-ping" : "bg-primary animate-pulse"}`} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 items-center">
                <Dumbbell size={14} style={{ color: activeSession ? "var(--warning)" : "var(--primary)" }} />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: "var(--muted-foreground)" }}>
                    Active Training
                  </p>
                  <h3 className="font-black text-xs uppercase tracking-tight text-foreground leading-none">
                    {activeSession ? "Live Session" : "Start Session"}
                  </h3>
                </div>
              </div>
            </div>

            {/* Central Visual CTA */}
            <div className="flex flex-col items-center justify-center py-2">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105"
                style={{
                  background: activeSession
                    ? "color-mix(in srgb, var(--warning) 12%, transparent)"
                    : "color-mix(in srgb, var(--primary) 12%, transparent)",
                  borderColor: activeSession
                    ? "color-mix(in srgb, var(--warning) 24%, transparent)"
                    : "color-mix(in srgb, var(--primary) 24%, transparent)",
                }}
              >
                {activeSession ? (
                  <Play size={20} strokeWidth={2.5} className="text-warning fill-current animate-pulse" />
                ) : (
                  <Plus size={20} strokeWidth={3} className="text-primary" />
                )}
              </div>
            </div>

            {/* Status action text */}
            <div className="text-[9px] font-black uppercase tracking-wider text-right border-t pt-2" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: activeSession ? "var(--warning)" : "var(--primary)" }}>
                {activeSession ? "Resume session →" : "Start workout →"}
              </span>
            </div>
          </div>
        </div>

        {/* ── ROW 3: Anatomy Fatigue Map visualization (Main Hero) ── */}
        <section
          className="rounded-3xl p-4 flex flex-col items-center justify-center relative border overflow-hidden"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
            height: "360px",
          }}
        >
          {/* Subtle neon corner glows */}
          <div
            className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full blur-[48px] pointer-events-none opacity-20"
            style={{ background: "var(--primary)" }}
          />

          <div className="absolute top-4 left-4 z-10">
            <h3
              className="font-black text-xs uppercase tracking-tight flex items-center gap-1.5"
              style={{ color: "var(--foreground)" }}
            >
              <Sparkle size={10} style={{ color: "var(--primary)" }} />
              MUSCLES FATIGUE MAP
            </h3>
          </div>
          <div
            className="w-full h-full pt-4 flex items-center justify-center"
            style={{ filter: "drop-shadow(0 15px 25px rgba(0, 0, 0, 0.45))" }}
          >
            <HumanAnatomy
              gender={profile?.gender || "female"}
              backgroundColor="var(--background)"
              defaultMuscleColor="rgb(80,80,84)"
              primaryHighlightColor="var(--primary)"
              primaryOpacity={0.85}
              selectedPrimaryMuscleGroups={["chest", "triceps", "frontDelts", "sideDelts"]}
            />
          </div>
        </section>

        {/* ── ROW 4: Consistency Radar, Biometric Sparkline & Trophy Rack ── */}
        <div className="space-y-6">
          

          {/* Biometric Performance Sparkline Card */}
          <div
            className="rounded-3xl p-5 border relative overflow-hidden group"
            style={{
              background: "color-mix(in srgb, var(--card) 75%, transparent)",
              backdropFilter: "blur(16px)",
              borderColor: "var(--border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
            }}
          >
            {/* Soft decorative background glow */}
            <div
              className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full blur-[32px] pointer-events-none opacity-10 transition-all duration-500 group-hover:scale-110"
              style={{ background: "var(--primary)" }}
            />

            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2 items-center">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                  <TrendingUp size={14} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider mb-0.5" style={{ color: "var(--muted-foreground)" }}>
                    Biometric Progress
                  </p>
                  <h3 className="font-black text-xs uppercase tracking-tight text-foreground leading-none">
                    Weight Trend Spline
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-foreground tabular-nums">
                  {latestWeight > 0 ? `${latestWeight} kg` : "No Log"}
                </span>
                <p className="text-[6px] font-black uppercase tracking-wider text-muted-foreground">
                  Current Weight
                </p>
              </div>
            </div>

            {/* Glowing Spline Chart */}
            <div className="relative w-full h-[85px] mt-2 flex items-center justify-center">
              <svg width="100%" height="100%" viewBox="0 0 300 75" preserveAspectRatio="none" className="overflow-visible">
                <defs>
                  <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1="0" y1="20" x2="300" y2="20" stroke="var(--border)" strokeWidth="0.5" opacity="0.1" strokeDasharray="3 3" />
                <line x1="0" y1="40" x2="300" y2="40" stroke="var(--border)" strokeWidth="0.5" opacity="0.1" strokeDasharray="3 3" />
                <line x1="0" y1="60" x2="300" y2="60" stroke="var(--border)" strokeWidth="0.5" opacity="0.1" strokeDasharray="3 3" />

                {/* Gradient area underneath the spline curve */}
                <path
                  d={`M ${sparklineData[0].x} 70 ${sparklineData.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${sparklineData[sparklineData.length - 1].x} 70 Z`}
                  fill="url(#chart-glow)"
                  style={{ transition: "all 0.5s ease-in-out" }}
                />

                {/* Spline main glowing path */}
                <path
                  d={`M ${sparklineData[0].x} ${sparklineData[0].y} ${sparklineData.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: "drop-shadow(0 2px 8px rgba(111,111,238,0.4))",
                    transition: "all 0.5s ease-in-out",
                  }}
                />

                {/* Active node markers */}
                {sparklineData.map((p, idx) => (
                  <g key={idx} className="group/node cursor-pointer">
                    <circle cx={p.x} cy={p.y} r="5" fill="var(--card)" stroke="var(--primary)" strokeWidth="2.5" />
                    <circle cx={p.x} cy={p.y} r="1.5" fill="var(--primary)" />
                    {/* Minimal hover dot tracker */}
                    <circle cx={p.x} cy={p.y} r="8" fill="var(--primary)" opacity="0" className="hover:opacity-10 transition-opacity" />
                  </g>
                ))}
              </svg>
            </div>
            
            {/* Sparkline HUD Footer */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${weightChange < 0 ? "bg-emerald-400" : weightChange > 0 ? "bg-amber-400" : "bg-muted-foreground"}`} />
                <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground">
                  {weightChange < 0
                    ? `Lost ${Math.abs(weightChange).toFixed(1)} kg`
                    : weightChange > 0
                    ? `Gained +${weightChange.toFixed(1)} kg`
                    : "No Weight Change"}
                </span>
              </div>
              <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground">
                Last 6 logs
              </span>
            </div>
          </div>

          {/* Trophy Case Milestone Badges Card */}
          <div
            className="rounded-3xl p-5 border relative overflow-hidden group"
            style={{
              background: "color-mix(in srgb, var(--card) 75%, transparent)",
              backdropFilter: "blur(16px)",
              borderColor: "var(--border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
            }}
          >
            {/* Soft decorative background glow */}
            <div
              className="absolute -top-10 -left-10 w-24 h-24 rounded-full blur-[32px] pointer-events-none opacity-10 transition-all duration-500 group-hover:scale-110"
              style={{ background: "var(--warning)" }}
            />

            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2 items-center">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-400">
                  <Trophy size={14} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider mb-0.5" style={{ color: "var(--muted-foreground)" }}>
                    Milestone Tracking
                  </p>
                  <h3 className="font-black text-xs uppercase tracking-tight text-foreground leading-none">
                    Trophy Case Badges
                  </h3>
                </div>
              </div>
            </div>

            {/* Badges Grid (3 Columns) */}
            <div className="grid grid-cols-3 gap-4">
              
              {/* Badge 1: Streak */}
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                className={`p-3.5 rounded-2xl flex flex-col items-center text-center border relative overflow-hidden transition-all duration-500 group/badge ${
                  streak > 0
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-400 shadow-[0_4px_16px_rgba(245,158,11,0.12)]"
                    : "bg-secondary/35 border-transparent opacity-40 text-muted-foreground"
                }`}
              >
                {/* Glowing ring underlay */}
                {streak > 0 && (
                  <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent pointer-events-none" />
                )}
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-background/80 mb-2 border border-current/25 relative">
                  <Flame size={18} className={streak > 0 ? "fill-current animate-pulse text-amber-400" : "text-muted-foreground"} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wide leading-none mb-1">
                  Streak Hero
                </span>
                <span className="text-[7px] font-bold text-muted-foreground tabular-nums tracking-widest uppercase">
                  {streak > 0 ? `${streak} Days` : "Locked"}
                </span>
              </motion.div>

              {/* Badge 2: Steps */}
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                className={`p-3.5 rounded-2xl flex flex-col items-center text-center border relative overflow-hidden transition-all duration-500 group/badge ${
                  todaySteps >= stepsGoal
                    ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-400 shadow-[0_4px_16px_rgba(99,102,241,0.12)]"
                    : "bg-secondary/35 border-transparent opacity-40 text-muted-foreground"
                }`}
              >
                {/* Glowing ring underlay */}
                {todaySteps >= stepsGoal && (
                  <div className="absolute inset-0 bg-radial-gradient from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
                )}
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-background/80 mb-2 border border-current/25 relative">
                  <Footprints size={18} className={todaySteps >= stepsGoal ? "text-indigo-400 animate-pulse" : "text-muted-foreground"} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wide leading-none mb-1">
                  Step Master
                </span>
                <span className="text-[7px] font-bold text-muted-foreground tabular-nums tracking-widest uppercase">
                  {todaySteps >= stepsGoal ? "100% Goal" : `${Math.round((todaySteps / stepsGoal) * 100)}%`}
                </span>
              </motion.div>

              {/* Badge 3: Hydration */}
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                className={`p-3.5 rounded-2xl flex flex-col items-center text-center border relative overflow-hidden transition-all duration-500 group/badge ${
                  todayWater >= waterGoal
                    ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400 shadow-[0_4px_16px_rgba(6,182,212,0.12)]"
                    : "bg-secondary/35 border-transparent opacity-40 text-muted-foreground"
                }`}
              >
                {/* Glowing ring underlay */}
                {todayWater >= waterGoal && (
                  <div className="absolute inset-0 bg-radial-gradient from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
                )}
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-background/80 mb-2 border border-current/25 relative">
                  <Droplet size={18} className={todayWater >= waterGoal ? "fill-current text-cyan-400 animate-pulse" : "text-muted-foreground"} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wide leading-none mb-1">
                  Hydro Legend
                </span>
                <span className="text-[7px] font-bold text-muted-foreground tabular-nums tracking-widest uppercase">
                  {todayWater >= waterGoal ? "100% Goal" : `${Math.round((todayWater / waterGoal) * 100)}%`}
                </span>
              </motion.div>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
