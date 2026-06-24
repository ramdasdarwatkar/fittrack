import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Scale,
  Calendar,
  Sparkle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Dumbbell,
  Ruler,
  Clock,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { db } from "@/db";
import type { Tables } from "@/db/supabase";
import { supabase } from "@/lib/supabase";
import ExerciseSelectorModal from "@/components/exercises/ExerciseSelectorModal";

const EMPTY_EXERCISES: Tables<"exercises">[] = [];
const EMPTY_PR_RECORDS: Tables<"personal_records">[] = [];
const EMPTY_METRIC_RECORDS: Tables<"body_metrics">[] = [];

export default function Trends() {
  const [userId, setUserId] = useState<string | null>(null);

  // Timeframe and Category Selection States
  const [activeTimeframe, setActiveTimeframe] = useState<"1m" | "3m" | "6m" | "1y" | "all">("3m");
  const [selectedCategory, setSelectedCategory] = useState<"movements" | "biometrics">("movements");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("weight");
  const [selectedMetricId, setSelectedMetricId] = useState<string>("weight");

  // Modal control
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);

  // Server Data Fetching States (for "all" timeframe)
  const [serverPRRecords, setServerPRRecords] = useState<Tables<"personal_records">[]>([]);
  const [serverMetricRecords, setServerMetricRecords] = useState<Tables<"body_metrics">[]>([]);
  const [isLoadingServer, setIsLoadingServer] = useState(false);

  // ── Auth Session Resolver ──
  useEffect(() => {
    const getSessionUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) setUserId(user.id);
    };
    getSessionUser();
  }, []);

  // ── Exercises Library & Selection ──
  const allExercises = useLiveQuery(async () => {
    return await db.exercises.toArray();
  }, []) || EMPTY_EXERCISES;

  const availableExercises = useLiveQuery(async () => {
    if (!userId) return [];
    const prs = await db.personalRecords.where("user_id").equals(userId).toArray();
    const uniqueExerciseIds = Array.from(new Set(prs.map((p) => p.exercise_id)));
    const exercises = await db.exercises.bulkGet(uniqueExerciseIds);
    return exercises.filter(Boolean);
  }, [userId]) || EMPTY_EXERCISES;

  // ── Predefined Biometric Metrics ──
  const availableBiometrics = useMemo(() => [
    { id: "weight", name: "Body Weight", unit: "kg", Icon: Scale, color: "#6f6fee" },
    { id: "height", name: "Height", unit: "cm", Icon: Ruler, color: "#10b981" },
    { id: "waist", name: "Waist", unit: "cm", Icon: TrendingUp, color: "#06b6d4" },
    { id: "belly", name: "Belly", unit: "cm", Icon: TrendingUp, color: "#3b82f6" },
    { id: "chest", name: "Chest", unit: "cm", Icon: TrendingUp, color: "#ec4899" },
    { id: "bicep", name: "Bicep", unit: "cm", Icon: TrendingUp, color: "#a855f7" },
    { id: "forearm", name: "Forearm", unit: "cm", Icon: TrendingUp, color: "#f97316" },
    { id: "hip", name: "Hip", unit: "cm", Icon: TrendingUp, color: "#f43f5e" },
    { id: "shoulder", name: "Shoulder", unit: "cm", Icon: TrendingUp, color: "#14b8a6" },
    { id: "thigh", name: "Thigh", unit: "cm", Icon: TrendingUp, color: "#eab308" },
  ], []);

  const activeMetricObj = useMemo(() => {
    return availableBiometrics.find((b) => b.id === selectedMetricId) || availableBiometrics[0];
  }, [availableBiometrics, selectedMetricId]);

  // ── Set default selections when category changes ──
  useEffect(() => {
    if (selectedCategory === "movements") {
      if (availableExercises.length > 0 && !selectedExerciseId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedExerciseId(availableExercises[0].id);
      }
    } else {
      setSelectedMetricId("weight");
    }
  }, [selectedCategory, availableExercises, selectedExerciseId]);

  // ── Calculate Timeframe Cutoff Dates (ISO strings) ──
  const cutoffDateISO = useMemo(() => {
    const d = new Date();
    if (activeTimeframe === "1m") d.setDate(d.getDate() - 30);
    else if (activeTimeframe === "3m") d.setDate(d.getDate() - 90);
    else if (activeTimeframe === "6m") d.setDate(d.getDate() - 180);
    else if (activeTimeframe === "1y") d.setDate(d.getDate() - 365);
    return d.toISOString();
  }, [activeTimeframe]);

  // ── Fetch Local DB Records (<= 1Y timeframes) ──
  const localPRRecords = useLiveQuery(async () => {
    if (selectedCategory !== "movements" || activeTimeframe === "all" || !selectedExerciseId || !userId) {
      return [];
    }
    const prs = await db.personalRecords
      .where("exercise_id")
      .equals(selectedExerciseId)
      .filter((p) => p.created_at >= cutoffDateISO && p.is_deleted === 0 && p.user_id === userId)
      .toArray();

    return prs.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [selectedCategory, activeTimeframe, selectedExerciseId, cutoffDateISO, userId]) || EMPTY_PR_RECORDS;

  const localMetricRecords = useLiveQuery(async () => {
    if (selectedCategory !== "biometrics" || activeTimeframe === "all" || !userId) {
      return [];
    }
    const metrics = await db.bodyMetrics
      .where("user_id")
      .equals(userId)
      .filter((m) => m.date >= cutoffDateISO.split("T")[0] && m.is_deleted === 0)
      .toArray();

    return metrics.sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedCategory, activeTimeframe, cutoffDateISO, userId]) || EMPTY_METRIC_RECORDS;

  const exerciseProgression = useLiveQuery(
    () => {
      if (selectedCategory !== "movements" || !selectedExerciseId || !userId) return null;
      return db.exerciseProgressions.get([selectedExerciseId, userId]);
    },
    [selectedCategory, selectedExerciseId, userId]
  );

  const allPastSetsForTrends = useLiveQuery(async () => {
    if (selectedCategory !== "movements" || !selectedExerciseId || !userId) return [];
    const sets = await db.sets
      .where("exercise_id")
      .equals(selectedExerciseId)
      .filter((s) => s.is_deleted === 0)
      .toArray();
    if (sets.length === 0) return [];
    const workoutIds = [...new Set(sets.map((s) => s.workout_id))];
    const workouts = await db.workouts.where("id").anyOf(workoutIds).toArray();
    const workoutMap = new Map(workouts.map((w) => [w.id, w]));

    return sets
      .map((s) => ({
        set: s,
        startTime: workoutMap.get(s.workout_id)?.start_time || workoutMap.get(s.workout_id)?.date || "",
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedCategory, selectedExerciseId, userId]);

  const progressionPrediction = useMemo(() => {
    if (!exerciseProgression || !allPastSetsForTrends || allPastSetsForTrends.length === 0) return null;

    const lastSetEntry = allPastSetsForTrends[allPastSetsForTrends.length - 1];
    if (!lastSetEntry) return null;
    const lastWorkoutId = lastSetEntry.set.workout_id;

    const lastWorkoutSets = allPastSetsForTrends
      .filter((item) => item.set.workout_id === lastWorkoutId)
      .map((item) => item.set)
      .sort((a, b) => Number(a.set_number) - Number(b.set_number));

    if (lastWorkoutSets.length === 0) return null;

    const lastWeight = lastWorkoutSets[lastWorkoutSets.length - 1].weight || exerciseProgression.target_weight || 0;
    const targetWeight = exerciseProgression.target_weight || 0;

    if (targetWeight <= lastWeight) {
      return { weeks: 0, dateStr: "Achieved" };
    }

    const setsAtCurrentWeight = allPastSetsForTrends.filter((item) => item.set.weight === lastWeight);

    const workoutIdsOrdered: string[] = [];
    const workoutsAtWeight: Record<string, any[]> = {};
    setsAtCurrentWeight.forEach((item) => {
      const wId = item.set.workout_id;
      if (!workoutsAtWeight[wId]) {
        workoutsAtWeight[wId] = [];
        workoutIdsOrdered.push(wId);
      }
      workoutsAtWeight[wId].push(item.set);
    });

    const historyPayload = workoutIdsOrdered.map((wId) => {
      return workoutsAtWeight[wId].sort(
        (a, b) => Number(a.set_number) - Number(b.set_number)
      );
    });

    const minReps = exerciseProgression.min_reps;
    const maxReps = exerciseProgression.max_reps;
    const numSets = lastWorkoutSets.length;

    let currentTargetReps = Array(numSets).fill(minReps);
    let weightIncrement = false;

    for (let i = 0; i < historyPayload.length; i++) {
      const logged = historyPayload[i].map((s) => s.reps || 0);
      if (currentTargetReps.length !== logged.length) {
        currentTargetReps = Array(logged.length).fill(minReps);
      }

      const succeeded = logged.every((reps, idx) => reps >= currentTargetReps[idx]);

      if (succeeded) {
        const allReachedMax = currentTargetReps.every((r) => r >= maxReps);
        if (allReachedMax) {
          weightIncrement = true;
          currentTargetReps = Array(logged.length).fill(minReps);
        } else {
          weightIncrement = false;
          const minVal = Math.min(...currentTargetReps);
          const idxToIncrement = currentTargetReps.indexOf(minVal);
          if (idxToIncrement !== -1) {
            currentTargetReps[idxToIncrement] = Math.min(maxReps, currentTargetReps[idxToIncrement] + 1);
          }
        }
      } else {
        weightIncrement = false;
      }
    }

    const weightDistance = targetWeight - lastWeight;
    const progressWeight = exerciseProgression.progress_weight && exerciseProgression.progress_weight > 0
      ? exerciseProgression.progress_weight
      : 2.5;
    const weightSteps = Math.ceil(weightDistance / progressWeight);

    const firstStepWorkouts = currentTargetReps.reduce((sum, r) => sum + (maxReps - r), 0);
    const subsequentWorkouts = (weightSteps - 1) * (numSets * (maxReps - minReps));
    const totalWorkouts = firstStepWorkouts + subsequentWorkouts;

    const estDate = new Date();
    estDate.setDate(estDate.getDate() + totalWorkouts * 7);
    const dateStr = estDate.toLocaleDateString(undefined, { year: "emerald" ? "numeric" : "numeric", month: "short", day: "numeric" });

    return {
      weeks: totalWorkouts,
      dateStr,
    };
  }, [exerciseProgression, allPastSetsForTrends]);

  // ── Fetch Server Table Records ("ALL" timeframe) ──
  useEffect(() => {
    if (activeTimeframe !== "all" || !userId) return;

    const fetchServerMilestones = async () => {
      setIsLoadingServer(true);
      try {
        if (selectedCategory === "movements") {
          if (!selectedExerciseId) {
            setServerPRRecords([]);
            return;
          }
          const { data, error } = await supabase
            .from("personal_records")
            .select("*")
            .eq("user_id", userId)
            .eq("exercise_id", selectedExerciseId)
            .order("created_at", { ascending: true });
          if (!error && data) {
            setServerPRRecords(data);
          }
        } else {
          const { data, error } = await supabase
            .from("body_metrics")
            .select("*")
            .eq("user_id", userId)
            .order("date", { ascending: true });
          if (!error && data) {
            setServerMetricRecords(data);
          }
        }
      } catch (err) {
        console.error("[Trends] Supabase retrieval error:", err);
      } finally {
        setIsLoadingServer(false);
      }
    };

    fetchServerMilestones();
  }, [activeTimeframe, selectedCategory, selectedExerciseId, selectedMetricId, userId]);

  // ── Normalize Data Structure for the Spline Chart ──
  const normalizedData = useMemo(() => {
    const formatValue = (record: Tables<"body_metrics">, field: keyof Tables<"body_metrics">) => {
      const val = record[field];
      return typeof val === "number" ? val : parseFloat(String(val)) || 0;
    };

    if (activeTimeframe === "all") {
      if (selectedCategory === "movements") {
        return serverPRRecords.map((r) => ({
          date: r.created_at.split("T")[0],
          value: r.value,
          label: `${r.value} kg`,
        }));
      } else {
        return serverMetricRecords
          .map((r) => ({
            date: r.date,
            value: formatValue(r, selectedMetricId as keyof Tables<"body_metrics">),
            label: `${formatValue(r, selectedMetricId as keyof Tables<"body_metrics">)} ${activeMetricObj.unit}`,
          }))
          .filter((d) => d.value > 0);
      }
    } else {
      if (selectedCategory === "movements") {
        return localPRRecords.map((r) => ({
          date: r.created_at.split("T")[0],
          value: r.value,
          label: `${r.value} kg`,
        }));
      } else {
        return localMetricRecords
          .map((r) => ({
            date: r.date,
            value: formatValue(r, selectedMetricId as keyof Tables<"body_metrics">),
            label: `${formatValue(r, selectedMetricId as keyof Tables<"body_metrics">)} ${activeMetricObj.unit}`,
          }))
          .filter((d) => d.value > 0);
      }
    }
  }, [
    activeTimeframe,
    selectedCategory,
    selectedMetricId,
    localPRRecords,
    localMetricRecords,
    serverPRRecords,
    serverMetricRecords,
    activeMetricObj,
  ]);

  // ── Coordinates and Statistics Calculations ──
  const stats = useMemo(() => {
    if (normalizedData.length === 0) return { start: 0, peak: 0, change: 0, percent: 0 };
    const values = normalizedData.map((d) => d.value);
    const start = values[0];
    const latest = values[values.length - 1];
    const peak = Math.max(...values);
    const change = latest - start;
    const percent = start > 0 ? Math.round((change / start) * 100) : 0;
    return { start, peak, latest, change, percent };
  }, [normalizedData]);

  const svgCoordinates = useMemo(() => {
    if (normalizedData.length === 0) return [];
    if (normalizedData.length === 1) {
      return [{ x: 150, y: 40, ...normalizedData[0] }];
    }
    const values = normalizedData.map((d) => d.value);
    const minVal = Math.min(...values) * 0.98;
    const maxVal = Math.max(...values) * 1.02;
    const range = maxVal - minVal || 1;

    return normalizedData.map((d, idx) => {
      const x = 15 + (idx * 270) / (normalizedData.length - 1);
      const y = 85 - ((d.value - minVal) / range) * 60; // Inverted height offset (viewbox height 100)
      return { x, y, ...d };
    });
  }, [normalizedData]);

  const historyLogs = useMemo(() => [...normalizedData].reverse(), [normalizedData]);

  const currentExerciseName = useMemo(() => {
    const found = allExercises.find((e) => e.id === selectedExerciseId);
    return found?.name || "Select Exercise";
  }, [allExercises, selectedExerciseId]);

  const handleExerciseConfirm = (selected: Tables<"exercises">[]) => {
    if (selected.length > 0) {
      setSelectedExerciseId(selected[0].id);
    }
    setIsExerciseModalOpen(false);
  };

  return (
    <div
      className="min-h-screen select-none pb-24"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="px-4 pt-4 space-y-5 max-w-lg mx-auto">
        
        {/* ── Header Title HUD ── */}
        <header className="flex flex-col pt-2">
          <div className="flex items-center gap-1.5 mb-1 animate-pulse">
            <Sparkle size={12} style={{ color: "var(--primary)" }} />
            <span
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: "var(--primary)" }}
            >
              PERFORMANCE INSIGHTS
            </span>
          </div>
          <h1
            className="font-black text-2xl leading-none bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent"
            style={{ letterSpacing: "-0.04em" }}
          >
            Analytics & Trends
          </h1>
        </header>

        {/* ── Timeline Selection Pills ── */}
        <div
          className="rounded-2xl p-1 flex justify-between border shadow-sm"
          style={{
            background: "color-mix(in srgb, var(--card) 60%, transparent)",
            backdropFilter: "blur(12px)",
            borderColor: "var(--border)",
          }}
        >
          {(["1m", "3m", "6m", "1y", "all"] as const).map((timeframe) => {
            const isActive = activeTimeframe === timeframe;
            return (
              <button
                key={timeframe}
                onClick={() => setActiveTimeframe(timeframe)}
                className={`flex-1 py-1.5 text-xs font-black uppercase rounded-xl transition-all relative ${
                  isActive
                    ? "text-primary-foreground shadow-[0_0_12px_rgba(111,111,238,0.25)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={{
                  background: isActive ? "var(--primary)" : "transparent",
                }}
              >
                {timeframe}
              </button>
            );
          })}
        </div>

        {/* ── Selector HUD Control Panel (Tabs Category + Context Selector) ── */}
        <div
          className="rounded-3xl p-4 border space-y-4"
          style={{
            background: "color-mix(in srgb, var(--card) 60%, transparent)",
            backdropFilter: "blur(12px)",
            borderColor: "var(--border)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
          }}
        >
          {/* Category Switcher Tabs */}
          <div className="flex gap-2 p-0.5 bg-secondary/50 rounded-xl border border-border/40">
            <button
              onClick={() => setSelectedCategory("movements")}
              className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                selectedCategory === "movements"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Dumbbell size={12} />
              Movements
            </button>
            <button
              onClick={() => setSelectedCategory("biometrics")}
              className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                selectedCategory === "biometrics"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Scale size={12} />
              Biometrics
            </button>
          </div>

          {/* Dynamic Context Selector */}
          <AnimatePresence mode="wait">
            {selectedCategory === "movements" ? (
              <motion.div
                key="movements-hud"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-1.5"
              >
                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest leading-none">
                  Active Movement Tracker
                </p>
                {/* Trigger Card: The ENTIRE card acts as the clickable button */}
                <button
                  onClick={() => setIsExerciseModalOpen(true)}
                  className="w-full py-4 px-4 rounded-xl bg-secondary hover:bg-secondary/70 border border-border text-left flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary border border-primary/15 transition-all group-hover:scale-105">
                      <Dumbbell size={14} className="animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-foreground uppercase tracking-tight">
                        {currentExerciseName}
                      </span>
                      <span className="text-[7px] font-black text-muted-foreground uppercase tracking-wider mt-0.5">
                        Tap card to pick another movement
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-muted-foreground opacity-60 transition-transform group-hover:translate-x-0.5" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="biometrics-hud"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-2"
              >
                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest leading-none">
                  Select Biometric Column (All 10 available)
                </p>
                {/* Dropdown Selector for Biometrics */}
                <div className="relative">
                  <select
                    value={selectedMetricId}
                    onChange={(e) => setSelectedMetricId(e.target.value)}
                    className="w-full py-3.5 px-4 rounded-xl bg-secondary border border-border text-xs font-black uppercase tracking-wider focus:outline-none appearance-none cursor-pointer pr-10 text-foreground"
                    style={{
                      background: "color-mix(in srgb, var(--secondary) 80%, transparent)",
                    }}
                  >
                    {availableBiometrics.map((metric) => (
                      <option key={metric.id} value={metric.id} className="bg-card text-foreground font-black uppercase">
                        {metric.name} ({metric.unit})
                      </option>
                    ))}
                  </select>
                  {/* Custom chevron icon */}
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-muted-foreground">
                    <ChevronRight size={14} className="transform rotate-90" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Target Achievement Progression Roadmap ── */}
        {selectedCategory === "movements" && exerciseProgression && exerciseProgression.target_weight && (
          <div
            className="rounded-3xl p-5 border relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4"
            style={{
              background: "color-mix(in srgb, var(--card) 75%, transparent)",
              backdropFilter: "blur(12px)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex justify-between items-center">
              <div className="flex gap-2 items-center">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center bg-primary/10 text-primary"
                >
                  <Sparkle size={14} />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-wider mb-0.5" style={{ color: "var(--muted-foreground)" }}>
                    Target Achievement
                  </p>
                  <h3 className="font-black text-xs uppercase tracking-tight text-foreground leading-none">
                    Progression Roadmap
                  </h3>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">
                {Math.round(((stats.latest || 0) / exerciseProgression.target_weight) * 100)}% Reached
              </span>
            </div>

            {/* Target Progress Bar */}
            <div className="space-y-2">
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden border border-border/30">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-indigo-500 to-emerald-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(((stats.latest || 0) / exerciseProgression.target_weight) * 100))}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase">
                <span>PR: {stats.latest || 0} kg</span>
                <span>Target: {exerciseProgression.target_weight} kg</span>
              </div>
            </div>

            {/* Timeline Prediction */}
            {progressionPrediction && (
              <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase py-1.5 border-t border-b border-border/20">
                <Calendar size={12} className="text-primary" />
                <span>
                  Est. Completion: {progressionPrediction.weeks === 0 ? "Target Achieved 🏆" : `${progressionPrediction.dateStr} (${progressionPrediction.weeks} weeks left)`}
                </span>
              </div>
            )}

            {/* Micro Message / Stat Info */}
            <div className="text-[10px] font-bold text-foreground/80 leading-relaxed bg-secondary/50 rounded-xl p-3 border border-border/30">
              {(stats.latest || 0) >= exerciseProgression.target_weight ? (
                <span>🎉 Target fully achieved! Excellent work. You are ready to increase your baseline goals.</span>
              ) : (
                <span>
                  🔥 You are only <strong>{(exerciseProgression.target_weight - (stats.latest || 0)).toFixed(1)} kg</strong> away from your double progression target. Keep pushing!
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Spline Chart Glowing Panel ── */}
        <div
          className="rounded-3xl p-5 border relative overflow-hidden group shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
          style={{
            background: "color-mix(in srgb, var(--card) 70%, transparent)",
            backdropFilter: "blur(12px)",
            borderColor: "var(--border)",
          }}
        >
          {/* Subtle neon glowing accent */}
          <div
            className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-[48px] pointer-events-none opacity-20 transition-transform duration-700 group-hover:scale-110"
            style={{
              background: selectedCategory === "movements" ? "var(--primary)" : activeMetricObj.color,
            }}
          />

          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2 items-center">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    selectedCategory === "movements"
                      ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                      : `color-mix(in srgb, ${activeMetricObj.color} 12%, transparent)`,
                  color: selectedCategory === "movements" ? "var(--primary)" : activeMetricObj.color,
                }}
              >
                <TrendingUp size={14} />
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-wider mb-0.5" style={{ color: "var(--muted-foreground)" }}>
                  Progress Chart
                </p>
                <h3 className="font-black text-xs uppercase tracking-tight text-foreground leading-none">
                  {selectedCategory === "movements" ? currentExerciseName : activeMetricObj.name}
                </h3>
              </div>
            </div>

            {/* Change KPI status */}
            {normalizedData.length > 1 && (
              <div className="text-right">
                <div
                  className={`flex items-center justify-end gap-0.5 text-xs font-black leading-none ${
                    stats.change > 0
                      ? "text-emerald-400"
                      : stats.change < 0
                      ? "text-rose-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {stats.change > 0 ? (
                    <ArrowUpRight size={13} strokeWidth={3} />
                  ) : stats.change < 0 ? (
                    <ArrowDownRight size={13} strokeWidth={3} />
                  ) : null}
                  <span>
                    {stats.change > 0 ? "+" : ""}
                    {stats.change.toFixed(1)}
                    {selectedCategory === "movements" ? "kg" : activeMetricObj.unit}
                  </span>
                </div>
                <p className="text-[6px] font-black uppercase tracking-widest text-muted-foreground mt-0.5 leading-none">
                  Delta ({stats.percent > 0 ? "+" : ""}{stats.percent}%)
                </p>
              </div>
            )}
          </div>

          {/* SVG Graph Area */}
          <div className="relative w-full h-[120px] flex items-center justify-center">
            {isLoadingServer ? (
              <div className="flex flex-col items-center justify-center opacity-60">
                <Loader2 className="animate-spin text-primary mb-1.5" size={18} />
                <span className="text-[8px] font-black uppercase tracking-wider">Synchronizing with server...</span>
              </div>
            ) : normalizedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center opacity-50 p-6 text-center">
                <AlertCircle className="text-muted-foreground mb-1.5" size={18} />
                <span className="text-[9px] font-black uppercase tracking-wider text-foreground leading-none">
                  No Trends Recorded
                </span>
                <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                  Try widening timeframe or logging metrics
                </p>
              </div>
            ) : (
              <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none" className="overflow-visible">
                <defs>
                  <linearGradient id="trends-area-glow" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={selectedCategory === "movements" ? "var(--primary)" : activeMetricObj.color}
                      stopOpacity="0.25"
                    />
                    <stop
                      offset="100%"
                      stopColor={selectedCategory === "movements" ? "var(--primary)" : activeMetricObj.color}
                      stopOpacity="0.0"
                    />
                  </linearGradient>
                </defs>

                {/* Dashed guidelines */}
                <line x1="0" y1="25" x2="300" y2="25" stroke="var(--border)" strokeWidth="0.5" opacity="0.1" strokeDasharray="3 3" />
                <line x1="0" y1="55" x2="300" y2="55" stroke="var(--border)" strokeWidth="0.5" opacity="0.1" strokeDasharray="3 3" />
                <line x1="0" y1="85" x2="300" y2="85" stroke="var(--border)" strokeWidth="0.5" opacity="0.1" strokeDasharray="3 3" />

                {/* Glow Mask fill below the Bezier curve */}
                {svgCoordinates.length > 1 && (
                  <path
                    d={`M ${svgCoordinates[0].x} 95 ${svgCoordinates.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${svgCoordinates[svgCoordinates.length - 1].x} 95 Z`}
                    fill="url(#trends-area-glow)"
                    style={{ transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
                  />
                )}

                {/* Spline Path */}
                {svgCoordinates.length > 1 ? (
                  <path
                    d={`M ${svgCoordinates[0].x} ${svgCoordinates[0].y} ${svgCoordinates.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`}
                    fill="none"
                    stroke={selectedCategory === "movements" ? "var(--primary)" : activeMetricObj.color}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      filter: `drop-shadow(0 2px 8px ${
                        selectedCategory === "movements" ? "rgba(111,111,238,0.4)" : "rgba(34,197,94,0.4)"
                      })`,
                      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                ) : (
                  // Singular record horizontal baseline line
                  <line
                    x1="15"
                    y1="50"
                    x2="285"
                    y2="50"
                    stroke={selectedCategory === "movements" ? "var(--primary)" : activeMetricObj.color}
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />
                )}

                {/* Glowing Node dots */}
                {svgCoordinates.map((p, idx) => (
                  <g key={idx} className="group/dot cursor-pointer">
                    <circle cx={p.x} cy={p.y} r="5" fill="var(--card)" stroke={selectedCategory === "movements" ? "var(--primary)" : activeMetricObj.color} strokeWidth="2.5" />
                    <circle cx={p.x} cy={p.y} r="1.5" fill={selectedCategory === "movements" ? "var(--primary)" : activeMetricObj.color} />
                  </g>
                ))}
              </svg>
            )}
          </div>

          {/* Quick HUD Metrics */}
          {normalizedData.length > 0 && !isLoadingServer && (
            <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t text-center" style={{ borderColor: "var(--border)" }}>
              <div>
                <p className="text-[6px] font-black uppercase tracking-wider text-muted-foreground leading-none mb-0.5">
                  Starting
                </p>
                <span className="text-[10px] font-black text-foreground tabular-nums leading-none">
                  {stats.start.toFixed(1)} {selectedCategory === "movements" ? "kg" : activeMetricObj.unit}
                </span>
              </div>
              <div>
                <p className="text-[6px] font-black uppercase tracking-wider text-muted-foreground leading-none mb-0.5">
                  Peak Record
                </p>
                <span className="text-[10px] font-black text-foreground tabular-nums leading-none">
                  {stats.peak.toFixed(1)} {selectedCategory === "movements" ? "kg" : activeMetricObj.unit}
                </span>
              </div>
              <div>
                <p className="text-[6px] font-black uppercase tracking-wider text-muted-foreground leading-none mb-0.5">
                  Latest Logged
                </p>
                <span className="text-[10px] font-black text-foreground tabular-nums leading-none">
                  {stats.latest.toFixed(1)} {selectedCategory === "movements" ? "kg" : activeMetricObj.unit}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Details Log Feed List ── */}
        <section className="space-y-3">
          <div className="flex gap-1 items-center px-1">
            <Clock size={12} className="text-muted-foreground" />
            <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">
              History Log Timeline
            </h3>
          </div>

          <div className="space-y-2">
            {isLoadingServer ? (
              <div className="rounded-2xl p-6 border flex items-center justify-center opacity-60" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <Loader2 className="animate-spin text-primary" size={16} />
              </div>
            ) : historyLogs.length === 0 ? (
              <div
                className="rounded-2xl p-6 border text-center opacity-50"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                  Timeline Empty
                </span>
              </div>
            ) : (
              historyLogs.map((log, idx) => {
                // Calculate historical diff between adjacent items
                const nextLog = historyLogs[idx + 1];
                const delta = nextLog ? log.value - nextLog.value : 0;

                return (
                  <div
                    key={log.date + idx}
                    className="rounded-2xl p-4 border flex justify-between items-center relative overflow-hidden transition-all active:scale-[0.99]"
                    style={{
                      background: "color-mix(in srgb, var(--card) 80%, transparent)",
                      backdropFilter: "blur(8px)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0 border" style={{ borderColor: "var(--border)" }}>
                        <Calendar size={13} className="text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-black text-xs text-foreground uppercase tracking-tight leading-none mb-1">
                          {log.label}
                        </h4>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                          {new Date(log.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Historical delta indicator */}
                    {delta !== 0 && (
                      <div className="flex items-center gap-0.5 text-right font-black uppercase text-[9px]">
                        <span className={delta > 0 ? "text-emerald-400" : "text-rose-400"}>
                          {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                        </span>
                        <span className="text-[7px] text-muted-foreground tracking-tight">
                          {selectedCategory === "movements" ? "kg" : activeMetricObj.unit}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

      </div>

      {/* ── High-Fidelity Exercise Selector Modal ── */}
      <ExerciseSelectorModal
        isOpen={isExerciseModalOpen}
        onClose={() => setIsExerciseModalOpen(false)}
        onConfirm={handleExerciseConfirm}
        library={allExercises}
        existingExerciseIds={selectedExerciseId ? [selectedExerciseId] : []}
      />
    </div>
  );
}