import { useEffect, useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ExerciseService } from "@/services/ExerciseService";
import { WorkoutService } from "@/services/WorkoutService";
import { WorkoutSetService } from "@/services/SetService";
import { useWorkoutUIStore } from "@/stores/useWorkoutUIStore";
import { useWorkoutInitializer } from "@/hooks/useWorkoutInitializer";

import type { LocalSet as LocalWorkoutSet } from "@/db";
import type { Tables } from "@/db/supabase";
import ExerciseCard from "@/components/workout/ExerciseCard";
import PRCelebrationModal from "@/components/workout/PRCelebrationModal";
import ExerciseSelectorModal from "@/components/exercises/ExerciseSelectorModal";
import WorkoutSummaryModal from "@/components/workout/WorkoutSummaryModal";

export default function Workout() {
  const { exerciseOrder, setExerciseOrder, setExpanded, clearUIState } =
    useWorkoutUIStore();
  const navigate = useNavigate();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [note, setNote] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const intervalRef = useRef<number | undefined>(undefined);

  const activeWorkout = useLiveQuery(() => WorkoutService.getActiveSession());
  const exerciseLibrary =
    useLiveQuery(() => ExerciseService.listActive()) ?? [];

  // PATCHED: Sorting by numeric set_number instead of integer
  const currentWorkoutSets =
    useLiveQuery(
      async () =>
        activeWorkout
          ? (await WorkoutSetService.getSetsForWorkout(activeWorkout.id)).sort(
            (a, b) => Number(a.set_number) - Number(b.set_number),
          )
          : [],
      [activeWorkout?.id],
    ) ?? [];

  const lastWorkoutId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (activeWorkout?.id && activeWorkout.id !== lastWorkoutId.current) {
      clearUIState();
      lastWorkoutId.current = activeWorkout.id;
    }
  }, [activeWorkout?.id, clearUIState]);

  useEffect(() => {
    if (
      activeWorkout &&
      currentWorkoutSets.length > 0 &&
      exerciseOrder.length === 0
    ) {
      const uniqueIds = currentWorkoutSets.reduce((acc: string[], curr) => {
        if (!acc.includes(curr.exercise_id)) acc.push(curr.exercise_id);
        return acc;
      }, []);
      setExerciseOrder(uniqueIds);
    }
  }, [
    activeWorkout?.id,
    currentWorkoutSets.length,
    exerciseOrder.length,
    setExerciseOrder,
  ]);

  useWorkoutInitializer({ userId, setUserId, activeWorkout });

  const isRetro = activeWorkout?.end_time !== null;
  const isRest = activeWorkout?.note === "REST_DAY";
  const isLive = !isRetro && !isRest;
  const isInitializing = !activeWorkout || !activeWorkout.start_time;

  useEffect(() => {
    if (!isLive || !userId || isInitializing) return;
    intervalRef.current = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isLive, userId, isInitializing]);

  const handleMoveCard = (currentIndex: number, direction: -1 | 1) => {
    const newOrder = [...exerciseOrder];
    const target = currentIndex + direction;
    if (target >= 0 && target < newOrder.length) {
      [newOrder[currentIndex], newOrder[target]] = [
        newOrder[target],
        newOrder[currentIndex],
      ];
      setExerciseOrder(newOrder);
    }
  };

  const handleAddExercises = async (selected: Tables<"exercises">[]) => {
    if (!activeWorkout || !userId) return;
    
    // Filter out exercises that already exist in the workout to prevent duplicates
    const newUniqueSelected = selected.filter(
      (ex) => !exerciseOrder.includes(ex.id)
    );
    
    const newAddedIds: string[] = [];
    for (const ex of newUniqueSelected) {
      // PATCHED: Use numeric sequence (ex index + 1.01)
      const base =
        Math.floor(
          Math.max(0, ...currentWorkoutSets.map((s) => Number(s.set_number))),
        ) + 1;
      await WorkoutSetService.addSetRow(
        activeWorkout.id,
        ex.id,
        userId,
        base + 0.1,
      );
      newAddedIds.push(ex.id);
      setExpanded(ex.id, true);
    }
    
    // Append the new unique exercises in the selection order
    setExerciseOrder([...exerciseOrder, ...newAddedIds]);
    setPickerOpen(false);
  };

  const handleDiscard = async () => {
    if (!activeWorkout) return;
    await WorkoutService.deleteSessionLocal(activeWorkout.id);
    await WorkoutSetService.deleteSetsForWorkout(activeWorkout.id);
    clearUIState();
    setDiscardOpen(false);
    navigate("/");
  };

  if (isInitializing)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
            style={{
              borderColor: "var(--primary)",
              borderTopColor: "transparent",
            }}
          />
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--muted-foreground)" }}
          >
            Initializing
          </span>
        </div>
      </div>
    );

  const startTime = activeWorkout.start_time
    ? new Date(activeWorkout.start_time).getTime()
    : 0;

  const elapsed =
    isLive && startTime > 0
      ? new Date(nowMs - startTime).toISOString().substring(11, 19)
      : "00:00:00";

  const [hh, mm, ss] = elapsed.split(":");

  return (
    <div className="w-full h-full pb-36">
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between"
        style={{
          background: "var(--background)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {isLive ? (
          <div className="flex items-baseline gap-0.5">
            <span
              className="font-mono text-2xl font-black tabular-nums leading-none"
              style={{ color: "var(--primary)" }}
            >
              {hh !== "00" && (
                <>
                  {hh}
                  <span
                    style={{
                      color: "var(--muted-foreground)",
                      fontSize: "0.7em",
                    }}
                  >
                    h{" "}
                  </span>
                </>
              )}
              {mm}
              <span
                style={{ color: "var(--muted-foreground)", fontSize: "0.7em" }}
              >
                m{" "}
              </span>
              {ss}
              <span
                style={{ color: "var(--muted-foreground)", fontSize: "0.7em" }}
              >
                s
              </span>
            </span>
          </div>
        ) : (
          <span
            className="text-xs font-black uppercase tracking-widest"
            style={{ color: "var(--muted-foreground)" }}
          >
            {isRest ? "Rest Day" : "Retroactive"}
          </span>
        )}
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-black uppercase tracking-widest transition-opacity active:opacity-70"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          <Plus size={13} strokeWidth={3} />
          <span>Exercise</span>
        </button>
      </div>

      <div className="space-y-3 pt-4 px-0">
        {exerciseOrder.length === 0 ? (
          <div
            className="mx-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-14 gap-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--muted)" }}
            >
              <Plus size={22} style={{ color: "var(--muted-foreground)" }} />
            </div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--muted-foreground)" }}
            >
              Add your first exercise
            </p>
          </div>
        ) : (
          exerciseOrder.map((id, idx) => {
            const ex = exerciseLibrary.find((e) => e.id === id);
            if (!ex) return null;
            return (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                index={idx}
                totalExercises={exerciseOrder.length}
                workoutId={activeWorkout.id}
                allWorkoutSets={currentWorkoutSets as LocalWorkoutSet[]}
                userId={userId ?? ""}
                onMoveCard={handleMoveCard}
              />
            );
          })
        )}
      </div>

      <footer className="fixed bottom-4 inset-x-4 z-40">
        <div
          className="rounded-2xl p-2 flex gap-2"
          style={{
            background: "color-mix(in srgb, var(--card) 92%, transparent)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          <button
            onClick={() => setDiscardOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-opacity active:opacity-70"
            style={{
              background: "var(--secondary)",
              color: "var(--secondary-foreground)",
              border: "1px solid var(--border)",
            }}
          >
            <Trash2 size={13} strokeWidth={2.5} /> <span>Discard</span>
          </button>
          <button
            onClick={() => setDoneOpen(true)}
            className="flex-1 h-12 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest transition-opacity active:opacity-70"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <CheckCircle2 size={14} strokeWidth={2.5} />{" "}
            <span>Finish Workout</span>
          </button>
        </div>
      </footer>

      <PRCelebrationModal />
      <ExerciseSelectorModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleAddExercises}
        library={exerciseLibrary}
        existingExerciseIds={exerciseOrder}
      />
      <WorkoutSummaryModal
        isOpen={doneOpen}
        onClose={() => setDoneOpen(false)}
        workout={activeWorkout}
        allWorkoutSets={currentWorkoutSets as LocalWorkoutSet[]}
        isRetroactive={isRetro}
        runningDurationSec={activeWorkout.duration_sec ?? 0}
        note={note}
        setNote={setNote}
      />

      {discardOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    "color-mix(in srgb, var(--destructive) 15%, transparent)",
                }}
              >
                <Trash2 size={18} style={{ color: "var(--destructive)" }} />
              </div>
              <div>
                <h3
                  className="font-black text-base uppercase tracking-wide"
                  style={{ color: "var(--foreground)" }}
                >
                  Discard session?
                </h3>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  All sets and progress will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDiscardOpen(false)}
                className="flex-1 h-11 rounded-xl text-sm font-bold transition-opacity active:opacity-70"
                style={{
                  background: "var(--secondary)",
                  color: "var(--secondary-foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                Keep it
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 h-11 rounded-xl text-sm font-bold text-white transition-opacity active:opacity-70"
                style={{ background: "var(--destructive)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
