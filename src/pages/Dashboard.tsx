import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell,
  Flame,
  Sunrise,
  Sun,
  Sparkle,
  Sunset,
  Moon,
  CloudMoon,
  Footprints,
  Droplet,
  Edit3,
  Check,
  X,
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
  ArrowRight,
  Wind,
  ChevronRight,
  Activity,
  Target,
} from "lucide-react";
import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import { SyncService } from "@/services/SyncService";
import { WorkoutService } from "@/services/WorkoutService";
import { StepsService } from "@/services/StepsService";
import { WorkoutSuggestionService } from "@/services/WorkoutSuggestionService";
import { HumanAnatomy } from "@/components/anatomy/HumanAnatomy";
import { DashboardSkeleton } from "@/components/common/Skeletons";

const getTodayDateString = (): string => new Date().toISOString().split("T")[0];

// ── Animated SVG ring with gradient ──────────────────────────────────────────
function GlowRing({
  size = 120,
  strokeWidth = 9,
  percent,
  color,
  trailColor = "rgba(255,255,255,0.05)",
  gradId,
  gradFrom,
  gradTo,
  children,
}: {
  size?: number;
  strokeWidth?: number;
  percent: number;
  color?: string;
  trailColor?: string;
  gradId?: string;
  gradFrom?: string;
  gradTo?: string;
  children?: React.ReactNode;
}) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(percent, 100)) / 100;
  const cx = size / 2;
  const strokePaint = gradId ? `url(#${gradId})` : color || "var(--primary)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        style={{ filter: `drop-shadow(0 0 8px ${gradFrom || color || "var(--primary)"}55)` }}
      >
        {gradId && gradFrom && gradTo && (
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradFrom} />
              <stop offset="100%" stopColor={gradTo} />
            </linearGradient>
          </defs>
        )}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={trailColor} strokeWidth={strokeWidth} />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={strokePaint}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const activeDate = getTodayDateString();

  const [isEditingSteps, setIsEditingSteps] = useState(false);
  const [tempSteps, setTempSteps] = useState("");

  const location = useLocation();
  const navigate = useNavigate();

  const activeSession = useLiveQuery(() => WorkoutService.getActiveSession());
  const suggestedWorkout = useLiveQuery(
    async () => (userId ? await WorkoutSuggestionService.getSuggestedWorkout(userId) : null),
    [userId]
  );

  useEffect(() => {
    if (location.state?.syncOnMount) {
      const executeAuthSync = async () => {
        try { await SyncService.pushAll(); } catch (err) { console.error(err); }
        try { await SyncService.pullAll(); } catch (err) { console.error(err); }
      };
      executeAuthSync();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const getSessionUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) setUserId(user.id);
    };
    getSessionUser();
  }, []);

  const profile = useLiveQuery(
    async () => (userId ? await db.userProfiles.get(userId) : null),
    [userId],
  );

  const streak = profile?.active_days?.length ?? 0;
  const firstName = useMemo(() => {
    const name = profile?.name?.trim().split(" ")[0] || "Athlete";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }, [profile?.name]);

  const todayRecord = useLiveQuery(
    async () => (userId ? await db.steps.get([userId, activeDate]) : null),
    [userId, activeDate]
  );
  const todaySteps = todayRecord?.steps ?? 0;
  const todayWater = todayRecord?.water ?? 0;
  const stepsGoal = 8000;
  const waterGoal = 2500;

  const selectedMusclesThisWeek = useLiveQuery(
    async () => {
      if (!userId) return [];
      const startOfWeekDate = new Date();
      const day = startOfWeekDate.getDay();
      const diff = startOfWeekDate.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeekDate.setDate(diff);
      startOfWeekDate.setHours(0, 0, 0, 0);
      const startOfWeekStr = startOfWeekDate.toISOString().split("T")[0];

      const weeklyWorkouts = await db.workouts
        .where("user_id").equals(userId)
        .filter((w) => w.completed === 1 && w.is_deleted === 0 && w.date >= startOfWeekStr)
        .toArray();
      if (weeklyWorkouts.length === 0) return [];

      const workoutIds = weeklyWorkouts.map((w) => w.id);
      const sets = await db.sets.where("workout_id").anyOf(workoutIds).filter((s) => s.is_deleted === 0).toArray();
      if (sets.length === 0) return [];

      const exerciseIds = Array.from(new Set(sets.map((s) => s.exercise_id).filter(Boolean)));
      if (exerciseIds.length === 0) return [];

      const exercises = (await db.exercises.bulkGet(exerciseIds)).filter((e): e is NonNullable<typeof e> => !!e && e.is_deleted === 0);
      const muscleIds = Array.from(new Set(exercises.map((e) => e.muscle_id).filter(Boolean))) as number[];
      if (muscleIds.length === 0) return [];

      const muscles = (await db.muscles.bulkGet(muscleIds)).filter(Boolean);
      const mapTexts = muscles.map((m) => m.muscle_map_text).filter((text): text is string => typeof text === "string" && text.trim().length > 0);
      return Array.from(new Set(mapTexts)) as string[];
    },
    [userId]
  ) || [];

  const monthlyXp = useLiveQuery(
    async () => {
      if (!userId) return 0;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const logs = await db.xpLog.where("user_id").equals(userId).filter((log) => log.is_deleted === 0 && log.date !== null && log.date >= startOfMonth).toArray();
      return logs.reduce((sum, log) => sum + (log.delta || 0), 0);
    },
    [userId]
  ) || 0;

  const monthlyXpTarget = 300;
  const monthlyXpPercent = Math.min(100, Math.round((monthlyXp / monthlyXpTarget) * 100));

  const handleSaveSteps = async (count: number) => {
    if (!userId) return;
    try {
      await StepsService.logSteps(userId, activeDate, Math.max(0, count));
      setIsEditingSteps(false);
    } catch (err) { console.error(err); }
  };

  const handleQuickAddSteps = async (amount: number) => handleSaveSteps(todaySteps + amount);

  const handleSaveWater = async (amount: number) => {
    if (!userId) return;
    try {
      await StepsService.logWater(userId, activeDate, Math.max(0, amount));
    } catch (err) { console.error(err); }
  };

  const handleQuickAddWater = async (amount: number) => handleSaveWater(todayWater + amount);

  const workoutCounts = useLiveQuery(
    async () => {
      if (!userId) return { weekCount: 0, monthCount: 0 };
      const now = new Date();
      const currentDay = now.getDay();
      const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + distanceToMon);
      monday.setHours(0, 0, 0, 0);
      const startOfWeekStr = monday.toISOString().split("T")[0];
      const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      const allWorkouts = await db.workouts.where("user_id").equals(userId).filter((w) => w.completed === 1 && w.is_deleted === 0).toArray();
      return {
        weekCount: allWorkouts.filter((w) => w.date >= startOfWeekStr).length,
        monthCount: allWorkouts.filter((w) => w.date >= startOfMonthStr).length,
      };
    },
    [userId]
  );
  const weeklyWorkoutsCount = workoutCounts?.weekCount ?? 0;
  const monthlyWorkoutsCount = workoutCounts?.monthCount ?? 0;

  const goalsList = useLiveQuery(
    async () => (userId ? await db.goals.where("user_id").equals(userId).toArray() : []),
    [userId]
  );
  const weeklyWorkoutTarget = useMemo(() => {
    const goal = goalsList?.find((g) => g.goaltype === "WORKOUT_DAYS" && g.name === "Weekly Frequency");
    return goal?.target ?? 4;
  }, [goalsList]);

  const monthlyWorkoutTarget = useMemo(() => {
    const goal = goalsList?.find((g) => g.goaltype === "WORKOUT_DAYS" && g.name === "Monthly Frequency");
    return goal?.target ?? weeklyWorkoutTarget * 4;
  }, [goalsList, weeklyWorkoutTarget]);

  const weeklyWorkoutPercent = Math.min(100, Math.round((weeklyWorkoutsCount / weeklyWorkoutTarget) * 100));
  const monthlyWorkoutPercent = Math.min(100, Math.round((monthlyWorkoutsCount / monthlyWorkoutTarget) * 100));

  const weightLogs = useLiveQuery(
    async () => (userId ? await db.bodyMetrics.where("user_id").equals(userId).toArray() : []),
    [userId]
  );

  const latestWeight = useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) return 0;
    return [...weightLogs].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.weight ?? 0;
  }, [weightLogs]);

  const previousWeight = useMemo(() => {
    if (!weightLogs || weightLogs.length <= 1) return 0;
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.at(-2)?.weight ?? 0;
  }, [weightLogs]);

  const weightChange = latestWeight > 0 && previousWeight > 0 ? latestWeight - previousWeight : 0;

  const sparklineData = useMemo(() => {
    if (!weightLogs || weightLogs.length < 2) {
      return [
        { x: 10, y: 55, val: 78.5 },
        { x: 68, y: 35, val: 77.8 },
        { x: 126, y: 45, val: 77.9 },
        { x: 184, y: 20, val: 77.1 },
        { x: 242, y: 30, val: 77.3 },
        { x: 290, y: 10, val: 76.5 },
      ];
    }
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date)).slice(-6);
    const minW = Math.min(...sorted.map((d) => d.weight)) * 0.99;
    const maxW = Math.max(...sorted.map((d) => d.weight)) * 1.01;
    const range = maxW - minW || 1;
    return sorted.map((d, idx) => ({
      x: 10 + (idx * 280) / (sorted.length - 1),
      y: 60 - ((d.weight - minW) / range) * 45,
      val: d.weight,
      date: d.date,
    }));
  }, [weightLogs]);

  const headerMeta = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    let greeting: string;
    let Icon: typeof Sunrise;
    if (hour >= 5 && hour < 9) { greeting = "Early bird"; Icon = CloudMoon; }
    else if (hour >= 9 && hour < 12) { greeting = "Good morning"; Icon = Sun; }
    else if (hour >= 12 && hour < 17) { greeting = "Good afternoon"; Icon = Sparkle; }
    else if (hour >= 17 && hour < 21) { greeting = "Good evening"; Icon = Sunset; }
    else { greeting = "Good night"; Icon = Moon; }

    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
    return {
      dayNum: String(now.getDate()).padStart(2, "0"),
      shortMonth: months[now.getMonth()],
      shortDay: days[now.getDay()],
      timeGreeting: greeting,
      TimeIcon: Icon,
    };
  }, []);

  if (profile === undefined) return <DashboardSkeleton />;

  const stepsPercent = Math.min(100, Math.round((todaySteps / stepsGoal) * 100));
  const waterPercent = Math.min(100, Math.round((todayWater / waterGoal) * 100));

  return (
    <div
      className="min-h-screen select-none pb-24"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="px-4 pt-5 pb-4 space-y-5 max-w-lg mx-auto">

        {/* ── HEADER ── */}
        <header className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-1.5"
            >
              <headerMeta.TimeIcon size={11} style={{ color: "var(--primary)" }} />
              <span
                className="text-[10px] font-black uppercase tracking-[0.18em]"
                style={{ color: "var(--primary)" }}
              >
                {headerMeta.timeGreeting}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06 }}
              className="font-black leading-none"
              style={{ fontSize: 30, letterSpacing: "-0.045em" }}
            >
              {firstName} 👋
            </motion.h1>
          </div>

          {/* Calendar chip */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            onClick={() => navigate("/history")}
            whileTap={{ scale: 0.93 }}
            className="rounded-[18px] overflow-hidden shrink-0 border"
            style={{
              width: 52,
              borderColor: "var(--border)",
              background: "var(--card)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            }}
          >
            <div className="w-full py-1 flex justify-center" style={{ background: "var(--primary)" }}>
              <span className="text-[8px] font-black tracking-widest leading-none" style={{ color: "var(--primary-foreground)" }}>
                {headerMeta.shortMonth}
              </span>
            </div>
            <div className="flex flex-col items-center pb-1.5 pt-1" style={{ background: "var(--card)" }}>
              <span className="font-black tabular-nums leading-none text-foreground" style={{ fontSize: 20, letterSpacing: "-0.03em" }}>
                {headerMeta.dayNum}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-tight mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {headerMeta.shortDay}
              </span>
            </div>
          </motion.button>
        </header>

        {/* ── STREAK BANNER (if streak > 0) ── */}
        <AnimatePresence>
          {streak > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8, scaleX: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleX: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="relative overflow-hidden rounded-2xl px-4 py-3 flex items-center justify-between border"
              style={{
                background: "linear-gradient(105deg, color-mix(in srgb, var(--warning) 14%, var(--card)), var(--card))",
                borderColor: "color-mix(in srgb, var(--warning) 30%, var(--border))",
              }}
            >
              <div className="absolute right-0 top-0 w-24 h-full pointer-events-none opacity-20"
                style={{ background: "radial-gradient(ellipse at right, var(--warning), transparent 70%)" }} />
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--warning) 18%, transparent)" }}>
                  <Flame size={16} className="text-warning fill-current" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Active Streak</p>
                  <p className="text-sm font-black text-foreground leading-none">{streak} Day{streak !== 1 ? "s" : ""} 🔥</p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-warning">Keep it up!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SUGGESTED WORKOUT CARD ── */}
        <AnimatePresence>
          {suggestedWorkout && !activeSession && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="relative overflow-hidden rounded-3xl p-5 border flex flex-col justify-between gap-4 cursor-pointer group"
              onClick={() => navigate(`/workout?mode=routine&routineId=${suggestedWorkout.routine.id}`)}
              style={{
                background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, var(--card)), var(--card))",
                borderColor: "color-mix(in srgb, var(--primary) 30%, var(--border))",
                boxShadow: "0 8px 32px rgba(0,0,0,0.05)",
              }}
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[32px] pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity"
                style={{ background: "var(--primary)" }} />

              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary/10">
                    <Sparkles size={15} className="text-primary animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">Suggested Next Workout</span>
                    <h3 className="text-base font-black text-foreground uppercase italic tracking-tight leading-none mt-0.5">
                      {suggestedWorkout.routine.name}
                    </h3>
                  </div>
                </div>
                {suggestedWorkout.sequenceNumber > 0 && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    Seq #{suggestedWorkout.sequenceNumber}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {suggestedWorkout.reason}
                </span>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest cursor-pointer shadow-md shadow-primary/10"
                >
                  <span>Start</span>
                  <ArrowRight size={12} />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CTA CARDS: Workout + Cardio ── */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Start Workout */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            onClick={() => navigate(activeSession ? "/workout" : "/workout?mode=live")}
            whileTap={{ scale: 0.97 }}
            className="rounded-3xl p-4 flex flex-col justify-between border relative overflow-hidden cursor-pointer group"
            style={{
              background: activeSession
                ? "linear-gradient(145deg, color-mix(in srgb, var(--warning) 18%, var(--card)) 0%, var(--card) 100%)"
                : "linear-gradient(145deg, color-mix(in srgb, var(--primary) 18%, var(--card)) 0%, var(--card) 100%)",
              borderColor: activeSession
                ? "color-mix(in srgb, var(--warning) 40%, var(--border))"
                : "color-mix(in srgb, var(--primary) 25%, var(--border))",
              minHeight: 130,
              boxShadow: activeSession
                ? "0 8px 24px color-mix(in srgb, var(--warning) 15%, transparent)"
                : "0 8px 24px color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-[28px] pointer-events-none opacity-30 transition-transform duration-500 group-hover:scale-125"
              style={{ background: activeSession ? "var(--warning)" : "var(--primary)" }} />

            <div className="flex justify-between items-start">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ background: activeSession ? "color-mix(in srgb, var(--warning) 16%, transparent)" : "color-mix(in srgb, var(--primary) 16%, transparent)" }}>
                <Dumbbell size={17} className={activeSession ? "text-warning" : "text-primary"} />
              </div>
              <div className={`w-2 h-2 rounded-full mt-1 ${activeSession ? "bg-warning animate-ping" : "bg-primary animate-pulse"}`} />
            </div>

            <div className="mt-auto">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                {activeSession ? "In Progress" : "Strength"}
              </p>
              <h4 className="font-black text-[13px] uppercase tracking-tight text-foreground leading-none">
                {activeSession ? "Resume\nWorkout" : "Start\nWorkout"}
              </h4>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: activeSession ? "var(--warning)" : "var(--primary)" }}>
                  {activeSession ? "Continue" : "Begin"}
                </span>
                <ChevronRight size={9} style={{ color: activeSession ? "var(--warning)" : "var(--primary)" }} />
              </div>
            </div>
          </motion.div>

          {/* Start Cardio */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.13 }}
            onClick={() => navigate("/cardio-log")}
            whileTap={{ scale: 0.97 }}
            className="rounded-3xl p-4 flex flex-col justify-between border relative overflow-hidden cursor-pointer group"
            style={{
              background: "linear-gradient(145deg, color-mix(in srgb, #ff453a 18%, var(--card)) 0%, var(--card) 100%)",
              borderColor: "color-mix(in srgb, #ff453a 30%, var(--border))",
              minHeight: 130,
              boxShadow: "0 8px 24px rgba(255,69,58,0.12)",
            }}
          >
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-[28px] pointer-events-none opacity-30 transition-transform duration-500 group-hover:scale-125"
              style={{ background: "#ff453a" }} />

            <div className="flex justify-between items-start">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ background: "rgba(255,69,58,0.15)" }}>
                <Wind size={17} className="text-[#ff453a]" />
              </div>
              <Flame size={12} className="text-[#ff453a] opacity-60 mt-1 animate-pulse" />
            </div>

            <div className="mt-auto">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Cardio</p>
              <h4 className="font-black text-[13px] uppercase tracking-tight text-foreground leading-none">
                Start<br />Cardio
              </h4>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#ff453a]">Log</span>
                <ChevronRight size={9} className="text-[#ff453a]" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── DAILY PROGRESS: Steps + Water in big horizontal cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="grid grid-cols-2 gap-3.5"
        >
          {/* Steps Card */}
          <div
            className="rounded-3xl p-4 flex flex-col gap-3 border relative overflow-hidden"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
            }}
          >
            <div className="absolute bottom-0 right-0 w-16 h-16 rounded-full blur-[28px] pointer-events-none opacity-15"
              style={{ background: "var(--primary)" }} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Footprints size={13} style={{ color: "var(--primary)" }} />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Steps</span>
              </div>
              <button
                onClick={() => { setTempSteps(String(todaySteps)); setIsEditingSteps(!isEditingSteps); }}
                className="p-1.5 rounded-lg hover:bg-secondary transition-all active:scale-90 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Edit3 size={12} />
              </button>
            </div>

            <div className="flex justify-center">
              <GlowRing
                size={108}
                strokeWidth={9}
                percent={stepsPercent}
                gradId="steps-grad"
                gradFrom="var(--primary)"
                gradTo="#a78bfa"
                trailColor="color-mix(in srgb, var(--primary) 8%, transparent)"
              >
                <span className="font-black text-[13px] text-foreground leading-none tabular-nums">
                  {stepsPercent}%
                </span>
                <span className="text-[9px] font-bold text-muted-foreground mt-0.5">
                  {todaySteps >= 1000 ? `${(todaySteps / 1000).toFixed(1)}k` : todaySteps}
                </span>
              </GlowRing>
            </div>

            <div className="border-t pt-2.5" style={{ borderColor: "var(--border)" }}>
              <AnimatePresence mode="wait">
                {isEditingSteps ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-1 w-full"
                  >
                    <input
                      type="number"
                      value={tempSteps}
                      onChange={(e) => setTempSteps(e.target.value)}
                      placeholder="Steps"
                      className="w-full h-7 px-2 rounded-lg text-xs font-bold border focus:outline-none"
                      style={{ background: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }}
                    />
                    <button onClick={() => handleSaveSteps(Number(tempSteps))} className="p-1.5 rounded-lg text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer transition-all active:scale-90">
                      <Check size={11} strokeWidth={3} />
                    </button>
                    <button onClick={() => setIsEditingSteps(false)} className="p-1.5 rounded-lg text-destructive bg-destructive/10 hover:bg-destructive/20 cursor-pointer transition-all active:scale-90">
                      <X size={11} strokeWidth={3} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="quick"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-1.5 w-full"
                  >
                    <button onClick={() => handleQuickAddSteps(-1000)}
                      className="flex-1 py-1.5 rounded-xl text-[10px] font-black bg-secondary text-foreground active:scale-95 border border-border transition-all cursor-pointer text-center">
                      −1K
                    </button>
                    <button onClick={() => handleQuickAddSteps(1000)}
                      className="flex-1 py-1.5 rounded-xl text-[10px] font-black text-primary-foreground active:scale-95 transition-all cursor-pointer text-center"
                      style={{ background: "var(--primary)" }}>
                      +1K
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Water Card */}
          <div
            className="rounded-3xl p-4 flex flex-col gap-3 border relative overflow-hidden"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
            }}
          >
            <div className="absolute bottom-0 right-0 w-16 h-16 rounded-full blur-[28px] pointer-events-none opacity-15"
              style={{ background: "#00d2ff" }} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Droplet size={13} style={{ color: "#00d2ff" }} />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Water</span>
              </div>
            </div>

            <div className="flex justify-center">
              <GlowRing
                size={108}
                strokeWidth={9}
                percent={waterPercent}
                gradId="water-grad"
                gradFrom="#00d2ff"
                gradTo="#0ea5e9"
                trailColor="rgba(0,210,255,0.08)"
              >
                <span className="font-black text-[13px] text-foreground leading-none tabular-nums">
                  {waterPercent}%
                </span>
                <span className="text-[9px] font-bold text-muted-foreground mt-0.5">
                  {todayWater}ml
                </span>
              </GlowRing>
            </div>

            <div className="border-t pt-2.5" style={{ borderColor: "var(--border)" }}>
              <div className="flex gap-1.5 w-full">
                <button
                  onClick={() => handleQuickAddWater(-250)}
                  disabled={todayWater <= 0}
                  className="flex-1 py-1.5 rounded-xl text-[10px] font-black bg-secondary text-foreground disabled:opacity-40 disabled:pointer-events-none active:scale-95 border border-border transition-all cursor-pointer text-center"
                >
                  −250
                </button>
                <button
                  onClick={() => handleQuickAddWater(250)}
                  className="flex-1 py-1.5 rounded-xl text-[10px] font-black text-white active:scale-95 transition-all cursor-pointer text-center"
                  style={{ background: "linear-gradient(135deg, #00d2ff, #0ea5e9)" }}
                >
                  +250
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── ACTIVITY RINGS (Workouts + XP) ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="grid grid-cols-2 gap-3.5"
        >
          {/* Workout Rings */}
          <div
            className="rounded-3xl p-4 flex flex-col gap-3 border relative overflow-hidden"
            style={{ background: "var(--card)", borderColor: "var(--border)", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Goals</p>
                <h3 className="font-black text-[11px] uppercase tracking-tight text-foreground leading-none mt-0.5">Activity</h3>
              </div>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,45,85,0.12)" }}>
                <Target size={13} className="text-[#ff2d55]" />
              </div>
            </div>

            {/* Apple-style concentric rings */}
            <div className="flex justify-center relative">
              <div className="relative" style={{ width: 108, height: 108 }}>
                <svg width={108} height={108} viewBox="0 0 108 108" className="-rotate-90" style={{ filter: "drop-shadow(0 0 6px rgba(255,45,85,0.3))" }}>
                  {/* Outer ring track */}
                  <circle cx={54} cy={54} r={44} fill="none" stroke="rgba(255,45,85,0.08)" strokeWidth={9} />
                  {/* Outer ring */}
                  <circle cx={54} cy={54} r={44} fill="none" stroke="#ff2d55" strokeWidth={9}
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={(2 * Math.PI * 44) - (2 * Math.PI * 44 * monthlyWorkoutPercent) / 100}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }} />
                  {/* Inner ring track */}
                  <circle cx={54} cy={54} r={30} fill="none" stroke="rgba(0,210,255,0.08)" strokeWidth={9} />
                  {/* Inner ring */}
                  <circle cx={54} cy={54} r={30} fill="none" stroke="#00d2ff" strokeWidth={9}
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={(2 * Math.PI * 30) - (2 * Math.PI * 30 * weeklyWorkoutPercent) / 100}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity size={14} className="text-muted-foreground opacity-60" />
                </div>
              </div>
            </div>

            <div className="border-t pt-2 space-y-1.5" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d55] shrink-0" />Month
                </span>
                <span className="text-foreground tabular-nums">{monthlyWorkoutsCount}/{monthlyWorkoutTarget}</span>
              </div>
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] shrink-0" />Week
                </span>
                <span className="text-foreground tabular-nums">{weeklyWorkoutsCount}/{weeklyWorkoutTarget}</span>
              </div>
            </div>
          </div>

          {/* XP Ring */}
          <div
            className="rounded-3xl p-4 flex flex-col gap-3 border relative overflow-hidden"
            style={{ background: "var(--card)", borderColor: "var(--border)", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Monthly</p>
                <h3 className="font-black text-[11px] uppercase tracking-tight text-foreground leading-none mt-0.5">XP Ring</h3>
              </div>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)" }}>
                <Sparkles size={13} className="text-[#a855f7]" />
              </div>
            </div>

            <div className="flex justify-center">
              <GlowRing
                size={108}
                strokeWidth={9}
                percent={monthlyXpPercent}
                gradId="xp-grad"
                gradFrom="var(--primary)"
                gradTo="#a855f7"
                trailColor="rgba(111,111,238,0.08)"
              >
                <Zap size={15} className="text-[#a855f7] fill-current" />
                <span className="text-[10px] font-black text-foreground tabular-nums mt-0.5">{monthlyXpPercent}%</span>
              </GlowRing>
            </div>

            <div className="border-t pt-2 space-y-1.5" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                <span className="text-muted-foreground">Earned</span>
                <span className="text-foreground tabular-nums">{monthlyXp} XP</span>
              </div>
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                <span className="text-muted-foreground">Target</span>
                <span className="text-foreground tabular-nums">{monthlyXpTarget} XP</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── ANATOMY MUSCLE MAP ── */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="rounded-3xl p-5 flex flex-col items-center justify-center relative border overflow-hidden"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
            minHeight: 420,
          }}
        >
          {/* Glow accent */}
          <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full blur-[56px] pointer-events-none opacity-15"
            style={{ background: "var(--primary)" }} />
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-[40px] pointer-events-none opacity-10"
            style={{ background: "#a855f7" }} />

          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              <Sparkle size={11} style={{ color: "var(--primary)" }} />
            </div>
            <h3 className="font-black text-[11px] uppercase tracking-wider" style={{ color: "var(--foreground)" }}>
              Weekly Muscle Map
            </h3>
          </div>

          <div className="w-full flex-1 pt-8 flex items-center justify-center"
            style={{ filter: "drop-shadow(0 15px 30px rgba(0,0,0,0.4))" }}>
            <HumanAnatomy
              gender={profile?.gender || "female"}
              backgroundColor="var(--background)"
              defaultMuscleColor="rgb(80,80,84)"
              primaryHighlightColor="var(--primary)"
              primaryOpacity={0.85}
              selectedPrimaryMuscleGroups={selectedMusclesThisWeek}
            />
          </div>

          {selectedMusclesThisWeek.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 justify-center mt-4 w-full px-2 overflow-y-auto no-scrollbar" style={{ maxHeight: 80 }}>
              {selectedMusclesThisWeek.map((muscle) => (
                <span
                  key={muscle}
                  className="inline-flex items-center text-[9px] font-black uppercase px-2.5 py-1 rounded-full border"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 10%, var(--background))",
                    borderColor: "color-mix(in srgb, var(--primary) 30%, var(--border))",
                    color: "var(--primary)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {muscle}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[9px] font-black uppercase text-muted-foreground mt-4 tracking-wider opacity-60">
              No muscles trained yet this week
            </p>
          )}
        </motion.section>

        {/* ── WEIGHT SPARKLINE ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="rounded-3xl p-5 border relative overflow-hidden group"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
          }}
        >
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full blur-[32px] pointer-events-none opacity-10 transition-all duration-500 group-hover:scale-110"
            style={{ background: "var(--primary)" }} />

          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2.5 items-center">
              <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                <TrendingUp size={14} style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Biometric</p>
                <h3 className="font-black text-[11px] uppercase tracking-tight text-foreground leading-none mt-0.5">Weight Trend</h3>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-foreground tabular-nums">
                {latestWeight > 0 ? `${latestWeight} kg` : "—"}
              </span>
              <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mt-0.5">Current</p>
            </div>
          </div>

          <div className="relative w-full h-[88px]">
            <svg width="100%" height="100%" viewBox="0 0 300 75" preserveAspectRatio="none" className="overflow-visible">
              <defs>
                <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
                <filter id="glow-line">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <line x1="0" y1="20" x2="300" y2="20" stroke="var(--border)" strokeWidth="0.5" opacity="0.15" strokeDasharray="4 4" />
              <line x1="0" y1="40" x2="300" y2="40" stroke="var(--border)" strokeWidth="0.5" opacity="0.15" strokeDasharray="4 4" />
              <line x1="0" y1="60" x2="300" y2="60" stroke="var(--border)" strokeWidth="0.5" opacity="0.15" strokeDasharray="4 4" />
              <path
                d={`M ${sparklineData[0].x} 72 ${sparklineData.map(p => `L ${p.x} ${p.y}`).join(" ")} L ${sparklineData.at(-1)!.x} 72 Z`}
                fill="url(#area-grad)"
              />
              <path
                d={`M ${sparklineData[0].x} ${sparklineData[0].y} ${sparklineData.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")}`}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow-line)"
              />
              {sparklineData.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r={5} fill="var(--card)" stroke="var(--primary)" strokeWidth={2.5} />
                  <circle cx={p.x} cy={p.y} r={1.5} fill="var(--primary)" />
                </g>
              ))}
            </svg>
          </div>

          <div className="flex justify-between items-center mt-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${weightChange < 0 ? "bg-emerald-400" : weightChange > 0 ? "bg-amber-400" : "bg-muted-foreground"}`} />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                {weightChange < 0
                  ? `Lost ${Math.abs(weightChange).toFixed(1)} kg`
                  : weightChange > 0
                    ? `Gained +${weightChange.toFixed(1)} kg`
                    : "No change"}
              </span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Last 6 logs</span>
          </div>
        </motion.div>

        {/* ── TROPHY CASE BADGES ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.28 }}
          className="rounded-3xl p-5 border relative overflow-hidden group"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
          }}
        >
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-[32px] pointer-events-none opacity-10 transition-all duration-500 group-hover:scale-110"
            style={{ background: "var(--warning)" }} />

          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center bg-amber-500/10">
              <Trophy size={14} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Milestones</p>
              <h3 className="font-black text-[11px] uppercase tracking-tight text-foreground leading-none mt-0.5">Trophy Case</h3>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Streak Badge */}
            <motion.div
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={`p-3 rounded-2xl flex flex-col items-center text-center border relative overflow-hidden transition-all ${
                streak > 0
                  ? "bg-amber-500/10 border-amber-500/25 text-amber-400 shadow-[0_4px_16px_rgba(245,158,11,0.12)]"
                  : "bg-secondary/40 border-transparent opacity-40 text-muted-foreground"
              }`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-background/80 mb-2 border border-current/20">
                <Flame size={18} className={streak > 0 ? "fill-current animate-pulse" : ""} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wide leading-none mb-1">Streak</span>
              <span className="text-[9px] font-bold tabular-nums tracking-widest uppercase" style={{ color: "inherit" }}>
                {streak > 0 ? `${streak}d` : "Locked"}
              </span>
            </motion.div>

            {/* Step Master Badge */}
            <motion.div
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={`p-3 rounded-2xl flex flex-col items-center text-center border relative overflow-hidden transition-all ${
                todaySteps >= stepsGoal
                  ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-400 shadow-[0_4px_16px_rgba(99,102,241,0.12)]"
                  : "bg-secondary/40 border-transparent opacity-40 text-muted-foreground"
              }`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-background/80 mb-2 border border-current/20">
                <Footprints size={18} className={todaySteps >= stepsGoal ? "animate-pulse" : ""} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wide leading-none mb-1">Steps</span>
              <span className="text-[9px] font-bold tabular-nums tracking-widest uppercase">
                {todaySteps >= stepsGoal ? "Goal ✓" : `${Math.round((todaySteps / stepsGoal) * 100)}%`}
              </span>
            </motion.div>

            {/* Hydro Badge */}
            <motion.div
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={`p-3 rounded-2xl flex flex-col items-center text-center border relative overflow-hidden transition-all ${
                todayWater >= waterGoal
                  ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400 shadow-[0_4px_16px_rgba(6,182,212,0.12)]"
                  : "bg-secondary/40 border-transparent opacity-40 text-muted-foreground"
              }`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-background/80 mb-2 border border-current/20">
                <Droplet size={18} className={todayWater >= waterGoal ? "fill-current animate-pulse" : ""} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wide leading-none mb-1">Hydro</span>
              <span className="text-[9px] font-bold tabular-nums tracking-widest uppercase">
                {todayWater >= waterGoal ? "Goal ✓" : `${Math.round((todayWater / waterGoal) * 100)}%`}
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* ── QUICK LINKS FOOTER ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { label: "History", sub: "Past workouts", icon: Activity, route: "/history", color: "#6f6fee" },
            { label: "Goals", sub: "Track targets", icon: Target, route: "/goals", color: "#a855f7" },
          ].map(({ label, sub, icon: Icon, route, color }) => (
            <button
              key={route}
              onClick={() => navigate(route)}
              className="rounded-2xl p-3.5 flex items-center justify-between border transition-all active:scale-95 cursor-pointer group text-left"
              style={{ background: "var(--card)", borderColor: "var(--border)", boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${color}18` }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-foreground leading-none">{label}</p>
                  <p className="text-[9px] font-bold text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </div>
              <ArrowRight size={13} className="text-muted-foreground opacity-40 group-hover:opacity-80 transition-opacity" />
            </button>
          ))}
        </motion.div>

      </div>
    </div>
  );
}
