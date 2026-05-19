import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Timer, Calendar, Notebook } from "lucide-react";

import { ExerciseService } from "@/services/ExerciseService";
import { RoutineService } from "@/services/RoutineService";
import { WorkoutService } from "@/services/WorkoutService";
import { WorkoutSetService } from "@/services/SetService";
import { supabase } from "@/lib/supabase";
import { db } from "@/db";
import { useWorkoutUIStore } from "@/stores/useWorkoutUIStore";
import type { Tables } from "@/db/supabase";
import ExerciseCard from "@/components/workout/ExerciseCard";
import ExerciseSelectorModal from "@/components/exercises/ExerciseSelectorModal";
import WorkoutSummaryModal from "@/components/workout/WorkoutSummaryModal";

const getNowIsoString = (): string => new Date().toISOString();
const getTodayDateString = (): string => new Date().toISOString().split("T")[0];

export default function Workout() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const setExpanded = useWorkoutUIStore((state) => state.setExpanded);

  const routineId = searchParams.get("routineId");
  const cloneId = searchParams.get("clone");
  const modeParam = searchParams.get("mode");

  const isRetroModeRequested = modeParam === "retro";

  // Modal Interface State Toggles
  const [pickerOpen, setPickerOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [note, setNote] = useState("");

  // Retroactive Mode Date Selectors
  const [retroDate, setRetroDate] = useState(getTodayDateString());
  const [retroStart, setRetroStart] = useState("10:00");
  const [retroEnd, setRetroEnd] = useState("11:00");

  const [userId, setUserId] = useState<string | null>(null);

  // FIX 1: Initialized cleanly without triggering cascading renders during the effect cycle
  const [nowMs, setNowMs] = useState<number | null>(null);

  // Secure user context on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Pure, side-effect free ticking runtime tracker loop
  useEffect(() => {
    if (isRetroModeRequested || !userId) {
      return;
    }

    // Set the initial value inside an isolated animation frame frame block to protect render threads
    requestAnimationFrame(() => {
      setNowMs(Date.now());
    });

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
      setNowMs(null);
    };
  }, [isRetroModeRequested, userId]);

  // Reactive Dexie Live Queries
  const liveExerciseLibrary =
    useLiveQuery(() => ExerciseService.listActive()) || [];
  const activeWorkout = useLiveQuery(() => WorkoutService.getActiveSession());

  const liveWorkoutSets =
    useLiveQuery(
      () =>
        activeWorkout
          ? WorkoutSetService.getSetsForWorkout(activeWorkout.id)
          : [],
      [activeWorkout?.id],
    ) || [];

  // FIX 2: Wrapped dependencies cleanly to guarantee stable memoization signatures for the React Compiler
  const exerciseLibrary = useMemo(
    () => liveExerciseLibrary,
    [liveExerciseLibrary],
  );
  const currentWorkoutSets = useMemo(() => liveWorkoutSets, [liveWorkoutSets]);

  // Map to resolve static exercise names/equipment specs quickly
  const exerciseMap = useMemo(() => {
    return new Map<string, Tables<"exercises">>(
      exerciseLibrary.map((e) => [e.id, e]),
    );
  }, [exerciseLibrary]);

  // Pure runtime stopwatch duration calculation
  const runningDurationSec = useMemo(() => {
    if (!activeWorkout?.start_time || nowMs === null) return 0;
    return Math.max(
      0,
      Math.floor((nowMs - new Date(activeWorkout.start_time).getTime()) / 1000),
    );
  }, [activeWorkout, nowMs]);

  // Derive active exercise blocks dynamically from the sets table rows to keep order stable
  const trackingBlocks = useMemo(() => {
    if (currentWorkoutSets.length === 0) return [];

    const uniqueIds: string[] = [];
    currentWorkoutSets.forEach((s) => {
      if (!uniqueIds.includes(s.exercise_id)) {
        uniqueIds.push(s.exercise_id);
      }
    });

    return uniqueIds
      .map((id) => exerciseMap.get(id))
      .filter((e): e is Tables<"exercises"> => !!e);
  }, [currentWorkoutSets, exerciseMap]);

  // Routine blueprint or historical clone URL ingestion pipelines
  useEffect(() => {
    if (!userId || exerciseLibrary.length === 0 || activeWorkout) return;

    (async () => {
      if (routineId) {
        const template = await RoutineService.getFullRoutine(routineId);
        if (!template) return;

        const w = await WorkoutService.initializeSession({
          id: crypto.randomUUID(),
          user_id: userId,
          date: getTodayDateString(),
          start_time: getNowIsoString(),
        });

        for (const re of template.exercises) {
          const ex = exerciseMap.get(re.exercise_id);
          const metrics = Array.isArray(ex?.metrics)
            ? (ex.metrics as string[])
            : [];

          for (let s = 1; s <= (re.sets || 3); s++) {
            await db.sets.put({
              id: crypto.randomUUID(),
              workout_id: w.id,
              user_id: userId,
              exercise_id: re.exercise_id,
              set_number: s,
              reps: metrics.includes("reps") ? re.value1 || 10 : null,
              weight: 0,
              distance_meters: metrics.includes("distance")
                ? re.value2 || 0
                : null,
              duration_sec: metrics.includes("duration")
                ? re.value2 || 0
                : null,
              set_type: "MAIN",
              completed: 0,
              is_dirty: 1,
              is_deleted: 0,
              updated_at: getNowIsoString(),
            });
          }
          setExpanded(re.exercise_id, true);
        }
        setSearchParams({}, { replace: true });
      }

      if (cloneId) {
        const pastWorkout = await db.workouts.get(cloneId);
        if (!pastWorkout) return;

        const w = await WorkoutService.initializeSession({
          id: crypto.randomUUID(),
          user_id: userId,
          date: getTodayDateString(),
          start_time: getNowIsoString(),
        });

        const pastSets = await WorkoutSetService.getSetsForWorkout(cloneId);
        for (const ps of pastSets) {
          await db.sets.put({
            ...ps,
            id: crypto.randomUUID(),
            workout_id: w.id,
            user_id: userId,
            completed: 0,
            is_dirty: 1,
            is_deleted: 0,
            updated_at: getNowIsoString(),
          });
          setExpanded(ps.exercise_id, true);
        }
        setSearchParams({}, { replace: true });
      }
    })();
  }, [
    routineId,
    cloneId,
    userId,
    exerciseLibrary,
    activeWorkout,
    exerciseMap,
    setSearchParams,
    setExpanded,
  ]);

  // Multi-Exercise Selection Injection Array Processing
  const handleAddExercises = async (
    selectedExercises: Tables<"exercises">[],
  ): Promise<void> => {
    if (selectedExercises.length === 0 || !userId) return;

    const w =
      activeWorkout ||
      (await WorkoutService.initializeSession({
        id: crypto.randomUUID(),
        user_id: userId,
        date: getTodayDateString(),
        start_time: getNowIsoString(),
      }));

    for (const ex of selectedExercises) {
      await WorkoutSetService.addSetRow(w.id, ex.id, userId);
      setExpanded(ex.id, true);
    }
    setPickerOpen(false);
  };

  const handleDiscardClose = async (): Promise<void> => {
    if (!activeWorkout) return;
    for (const s of currentWorkoutSets) {
      await db.sets.delete(s.id);
    }
    await WorkoutService.deleteSessionLocal(activeWorkout.id);
    setDiscardOpen(false);
    navigate("/library");
  };

  const formatSecondsToClock = (totalSec: number): string => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // SCREEN VIEW 1: Manual form entry displayed ONLY if custom retroactive param matches
  if (!activeWorkout && isRetroModeRequested) {
    return (
      <div className="space-y-4 text-foreground bg-background p-6 max-w-md mx-auto select-none">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Setup Retroactive Log Parameters
            </span>
          </div>

          <div className="space-y-3">
            <input
              type="date"
              max={getTodayDateString()}
              value={retroDate}
              onChange={(e) => setRetroDate(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground outline-none focus:border-primary/40"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                value={retroStart}
                onChange={(e) => setRetroStart(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground outline-none focus:border-primary/40"
              />
              <input
                type="time"
                value={retroEnd}
                onChange={(e) => setRetroEnd(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground outline-none focus:border-primary/40"
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!userId) return;
                const startIso = new Date(
                  `${retroDate}T${retroStart}:00`,
                ).toISOString();
                await WorkoutService.initializeSession({
                  id: crypto.randomUUID(),
                  user_id: userId,
                  date: retroDate,
                  start_time: startIso,
                });
              }}
              className="h-14 w-full bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl shadow-lg cursor-pointer"
            >
              Open Tracking Layout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN VIEW 2: Fresh live tracking initializer fallback trigger
  if (!activeWorkout && !isRetroModeRequested) {
    return (
      <div className="py-20 text-center max-w-md mx-auto px-6">
        <button
          type="button"
          onClick={async () => {
            if (!userId) return;
            await WorkoutService.initializeSession({
              id: crypto.randomUUID(),
              user_id: userId,
              date: getTodayDateString(),
              start_time: getNowIsoString(),
            });
          }}
          className="h-16 w-full bg-primary text-primary-foreground text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl cursor-pointer"
        >
          Initialize Live Tracking Canvas
        </button>
      </div>
    );
  }

  if (!activeWorkout) return null;

  return (
    <div className="space-y-4 pb-36 select-none relative">
      {/* TIMING CONTAINER SCREEN HEADER */}
      <div className="flex items-center justify-between border-b border-border bg-background py-3 sticky top-0 z-30">
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            Elapsed Runtime
          </span>
          {nowMs === null ? (
            <span className="text-muted-foreground font-bold text-sm mt-1 flex items-center gap-1">
              <Calendar size={14} /> Back-logged Split
            </span>
          ) : (
            <div className="flex items-center gap-1.5 mt-0.5 text-primary">
              <Timer size={18} className="animate-pulse" />
              <span className="font-mono text-2xl font-black tracking-tight tabular-nums">
                {formatSecondsToClock(runningDurationSec)}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={14} strokeWidth={3} /> Add Exercise
        </button>
      </div>

      {/* RENDER DYNAMIC TRACKING CARDS LIST */}
      <div className="space-y-3">
        {trackingBlocks.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            workoutId={activeWorkout.id}
            allWorkoutSets={currentWorkoutSets}
            userId={userId || ""}
          />
        ))}
      </div>

      {trackingBlocks.length === 0 && (
        <div className="py-24 text-center border-2 border-dashed border-border rounded-2xl opacity-20 flex flex-col items-center justify-center">
          <Notebook size={32} className="mb-2" />
          <p className="uppercase text-xs font-black tracking-widest">
            Workspace Empty • Add Exercises
          </p>
        </div>
      )}

      {/* FLOATING PERSISTENT FOOTER ACTION SWITCHBOARD */}
      <footer className="fixed bottom-6 inset-x-6 z-40">
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl p-2.5 flex gap-3 shadow-2xl">
          <button
            type="button"
            onClick={() => setDiscardOpen(true)}
            className="px-5 h-13 rounded-xl bg-destructive/10 text-destructive text-xs font-black uppercase tracking-widest border border-destructive/20 active:scale-95 transition-all cursor-pointer"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => setDoneOpen(true)}
            className="flex-1 h-13 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
          >
            Workout Done
          </button>
        </div>
      </footer>

      {/* OVERLAY SELECTION DIALOG MODAL LAYERS */}
      {pickerOpen && (
        <ExerciseSelectorModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onConfirm={handleAddExercises}
          library={exerciseLibrary}
        />
      )}

      {discardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-black text-lg uppercase tracking-tight text-foreground">
              Discard Session Log?
            </h3>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              This action terminates tracking operations and clears records
              indexed locally.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDiscardOpen(false)}
                className="flex-1 h-12 rounded-xl bg-secondary text-foreground text-xs font-black uppercase tracking-widest border border-border cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDiscardClose}
                className="flex-1 h-12 rounded-xl bg-destructive text-destructive-foreground text-xs font-black uppercase tracking-widest cursor-pointer"
              >
                Confirm Wipe
              </button>
            </div>
          </div>
        </div>
      )}

      {doneOpen && (
        <WorkoutSummaryModal
          isOpen={doneOpen}
          onClose={() => setDoneOpen(false)}
          workout={activeWorkout}
          allWorkoutSets={currentWorkoutSets}
          isRetroactive={nowMs === null}
          retroDate={retroDate}
          retroStart={retroStart}
          retroEnd={retroEnd}
          runningDurationSec={runningDurationSec}
          note={note}
          setNote={setNote}
        />
      )}
    </div>
  );
}
