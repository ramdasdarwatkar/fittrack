import { useMemo, useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Trash2,
  Trophy,
} from "lucide-react";
import { WorkoutSetService } from "@/services/SetService";
import { MuscleGroupService } from "@/services/StaticReferenceService";
import { PersonalRecordsService } from "@/services/PersonalRecordsService";
import { useWorkoutUIStore } from "@/stores/useWorkoutUIStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { db } from "@/db";
import type { Tables } from "@/db/supabase";
import type { LocalSet as LocalWorkoutSet } from "@/db";
import WorkoutSetRow from "./WorkoutSetRow";

interface ExerciseCardProps {
  exercise: Tables<"exercises">;
  index: number;
  totalExercises: number;
  workoutId: string;
  allWorkoutSets: LocalWorkoutSet[];
  userId: string;
  onMoveCard?: (currentIndex: number, direction: -1 | 1) => void;
}

interface SmartPlaceholder {
  reps: number | null;
  weight: number | null;
  duration_sec: number | null;
  distance_meters: number | null;
}

export default function ExerciseCard({
  exercise,
  index,
  totalExercises,
  workoutId,
  allWorkoutSets,
  userId,
  onMoveCard,
}: ExerciseCardProps) {
  const {
    expandedExercises,
    toggleExercise,
    lockedExercises,
    toggleLockExercise,
    activeRestTimers,
    startRestTimer,
    decrementRestTimer,
    clearRestTimer,
    activePRCelebration,
    exerciseOrder,
    setExerciseOrder,
  } = useWorkoutUIStore();

  const { weightUnit } = useSettingsStore();

  const progression = useLiveQuery(
    () => db.exerciseProgressions.get([exercise.id, userId]),
    [exercise.id, userId]
  );

  const isExpanded = !!expandedExercises[exercise.id];
  const isLocked = !!lockedExercises[exercise.id];
  const restCountdown = activeRestTimers[exercise.id] || 0;

  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);
  const [historicalMaxWeight, setHistoricalMaxWeight] = useState<number | null>(
    null,
  );
  const [smartPlaceholders, setSmartPlaceholders] = useState<
    Record<number, SmartPlaceholder>
  >({});
  const [allPastSets, setAllPastSets] = useState<
    { set: LocalWorkoutSet; startTime: string }[]
  >([]);

  useEffect(() => {
    if (exercise.muscle_group_id) {
      MuscleGroupService.getMuscleGroupName(exercise.muscle_group_id).then(
        setMuscleGroup,
      );
    }
  }, [exercise.muscle_group_id]);

  useEffect(() => {
    PersonalRecordsService.getLatestPRForExercise(exercise.id).then((pr) => {
      if (pr) setHistoricalMaxWeight(pr.value);
    });
  }, [exercise.id, activePRCelebration]);

  useEffect(() => {
    WorkoutSetService.getLatestPastSetsForExercise(exercise.id, workoutId).then(
      (historyRows) => {
        if (!historyRows || historyRows.length === 0) {
          setSmartPlaceholders({});
          return;
        }
        const placeholderMap: Record<number, SmartPlaceholder> = {};
        [...historyRows]
          .sort((a, b) => Number(a.set_number) - Number(b.set_number))
          .forEach((ts) => {
            placeholderMap[Number(ts.set_number)] = {
              reps: ts.reps,
              weight: ts.weight,
              duration_sec: ts.duration_sec,
              distance_meters: ts.distance_meters,
            };
          });
        setSmartPlaceholders(placeholderMap);
      },
    );
  }, [exercise.id, workoutId]);

  useEffect(() => {
    db.sets
      .where("exercise_id")
      .equals(exercise.id)
      .filter((s) => s.is_deleted === 0 && s.workout_id !== workoutId)
      .toArray()
      .then(async (sets) => {
        if (sets.length === 0) {
          setAllPastSets([]);
          return;
        }
        const workoutIds = [...new Set(sets.map((s) => s.workout_id))];
        const workouts = await db.workouts.where("id").anyOf(workoutIds).toArray();
        const workoutMap = new Map(workouts.map((w) => [w.id, w]));

        const sorted = sets
          .map((s) => {
            const w = workoutMap.get(s.workout_id);
            return {
              set: s,
              startTime: w?.start_time || w?.date || "",
            };
          })
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        setAllPastSets(sorted);
      });
  }, [exercise.id, workoutId]);

  useEffect(() => {
    if (restCountdown <= 0) return;
    const intervalId = setInterval(() => decrementRestTimer(exercise.id), 1000);
    return () => clearInterval(intervalId);
  }, [restCountdown, exercise.id, decrementRestTimer]);

  const exerciseSets = useMemo(() => {
    return allWorkoutSets
      .filter((s) => s.exercise_id === exercise.id)
      .sort((a, b) => Number(a.set_number) - Number(b.set_number));
  }, [allWorkoutSets, exercise.id]);

  const metricsList = useMemo(
    () =>
      Array.isArray(exercise.metrics)
        ? (exercise.metrics as string[])
        : ["reps"],
    [exercise.metrics],
  );
  const showWeight = metricsList.includes("weight");
  const showDistance = metricsList.includes("distance");
  const showDuration = metricsList.includes("duration");

  const plainHistoricalTargetStripText = useMemo(() => {
    if (showDuration || showDistance) return null;
    const sortedKeys = Object.keys(smartPlaceholders)
      .map(Number)
      .sort((a, b) => a - b);
    const validSegments = sortedKeys
      .map((k) => {
        const p = smartPlaceholders[k];
        return p.weight && p.reps ? `${p.weight}×${p.reps}` : null;
      })
      .filter(Boolean);
    return validSegments.length > 0 ? validSegments.join("  ·  ") : null;
  }, [smartPlaceholders, showDuration, showDistance]);

  const doubleProgressionSuggestion = useMemo(() => {
    if (!showWeight || showDuration || showDistance) {
      return null;
    }

    if (allPastSets.length === 0) {
      return null;
    }

    const lastSetEntry = allPastSets[allPastSets.length - 1];
    if (!lastSetEntry) return null;
    const lastWorkoutId = lastSetEntry.set.workout_id;

    const lastWorkoutSets = allPastSets
      .filter((item) => item.set.workout_id === lastWorkoutId)
      .map((item) => item.set)
      .sort((a, b) => Number(a.set_number) - Number(b.set_number));

    if (lastWorkoutSets.length === 0) {
      return null;
    }

    const lastWeight = lastWorkoutSets[lastWorkoutSets.length - 1].weight || (progression ? progression.target_weight : null) || 0;

    if (!progression) {
      const weightUnitStr = weightUnit || "kg";
      const fallbackSetsAtCurrentWeight = allPastSets.filter((item) => item.set.weight === lastWeight);
      const fallbackWorkoutIds = new Set(fallbackSetsAtCurrentWeight.map((item) => item.set.workout_id));
      const count = fallbackWorkoutIds.size;
      const text = lastWorkoutSets.map((s) => `${s.weight || 0}${weightUnitStr} x ${s.reps || 0} reps`).join("    |    ");
      return {
        type: "keep" as const,
        weight: lastWeight,
        workoutCount: count,
        message: `↩️ ${text}`,
      };
    }

    const setsAtCurrentWeight = allPastSets.filter((item) => item.set.weight === lastWeight);

    const workoutIdsOrdered: string[] = [];
    const workoutsAtWeight: Record<string, LocalWorkoutSet[]> = {};
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

    const minReps = progression.min_reps;
    const maxReps = progression.max_reps;

    let currentTargetReps = Array(lastWorkoutSets.length).fill(minReps);
    let weightIncrement = false;

    for (let i = 0; i < historyPayload.length; i++) {
      const logged = historyPayload[i].map((s) => s.reps || 0);
      if (currentTargetReps.length !== logged.length) {
        currentTargetReps = Array(logged.length).fill(minReps);
      }

      const succeeded = logged.every((reps, idx) => reps >= currentTargetReps[idx]);

      if (succeeded) {
        const allReachedMax = logged.every((r) => r >= maxReps);
        if (allReachedMax) {
          weightIncrement = true;
          currentTargetReps = Array(logged.length).fill(minReps);
        } else {
          weightIncrement = false;
          // Fast-forward target to match what they actually achieved, plus 1 rep
          currentTargetReps = [...logged];
          const minVal = Math.min(...currentTargetReps);
          const idxToIncrement = currentTargetReps.indexOf(minVal);
          if (idxToIncrement !== -1 && currentTargetReps[idxToIncrement] < maxReps) {
            currentTargetReps[idxToIncrement] += 1;
          } else {
            // If the minimum is already at maxReps, find any other that is below maxReps
            const belowMaxIdx = currentTargetReps.findIndex((r) => r < maxReps);
            if (belowMaxIdx !== -1) {
              currentTargetReps[belowMaxIdx] += 1;
            }
          }
        }
      } else {
        weightIncrement = false;
      }
    }

    const weightUnitStr = weightUnit || "kg";
    if (weightIncrement) {
      const newWeight = lastWeight + (progression.progress_weight ?? 2.5);
      const repsArray = Array(currentTargetReps.length).fill(minReps);
      const text = repsArray.map((r) => `${newWeight}${weightUnitStr} x ${r} reps`).join("    |    ");
      return {
        type: "progress" as const,
        weight: newWeight,
        workoutCount: 1,
        message: `📈 ${text}`,
      };
    } else {
      const count = workoutIdsOrdered.length + 1;
      const text = currentTargetReps.map((r) => `${lastWeight}${weightUnitStr} x ${r} reps`).join("    |    ");
      return {
        type: "keep" as const,
        weight: lastWeight,
        workoutCount: count,
        message: `🔄 ${text}`,
      };
    }
  }, [allPastSets, progression, showWeight, showDuration, showDistance, weightUnit]);

  const handleTriggerRestOverlay = () =>
    startRestTimer(exercise.id, exercise.rest_seconds || 60);

  const handleAddNewSet = async () => {
    if (isLocked) return;
    const lastSet = exerciseSets[exerciseSets.length - 1];
    if (lastSet && lastSet.completed === 0) return;

    // PATCHED: Use numeric sequence (e.g., 1.01, 1.02)
    const base = Math.floor(Number(exerciseSets[0]?.set_number || 1));
    const newSequence = base + (exerciseSets.length + 1) / 10;

    await WorkoutSetService.addSetRow(
      workoutId,
      exercise.id,
      userId,
      newSequence,
    );
    if (lastSet) {
      await db.sets
        .where({
          workout_id: workoutId,
          exercise_id: exercise.id,
          set_number: newSequence,
        })
        .modify({
          reps: lastSet.reps,
          weight: lastSet.weight,
          duration_sec: lastSet.duration_sec,
          distance_meters: lastSet.distance_meters,
        });
    }
  };

  const handleRemoveExerciseCard = async () => {
    if (isLocked) return;
    const linkedSetIds = exerciseSets.map((s) => s.id);
    if (linkedSetIds.length > 0) await db.sets.bulkDelete(linkedSetIds);
    setExerciseOrder(exerciseOrder.filter((id) => id !== exercise.id));
  };

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: "var(--card)",
        border: `1px solid ${isLocked ? "var(--muted)" : "var(--border)"}`,
        opacity: isLocked ? 0.75 : 1,
        boxShadow: isExpanded
          ? "0 4px 20px rgba(0,0,0,0.08)"
          : "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div
        onClick={() => toggleExercise(exercise.id)}
        className="px-4 pt-3.5 pb-3 flex items-center justify-between cursor-pointer"
        style={{
          borderBottom: isExpanded ? "1px solid var(--border)" : "none",
        }}
      >
        <div className="min-w-0 flex-1 pr-2 space-y-1">
          <h3
            className="font-black text-sm uppercase tracking-tight leading-none truncate"
            style={{ color: "var(--foreground)" }}
          >
            {exercise.name}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            {muscleGroup || exercise.equipment ? (
              <span
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: "var(--muted-foreground)" }}
              >
                {[muscleGroup, exercise.equipment || "Bodyweight"]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            ) : null}
            {showWeight && historicalMaxWeight !== null && (
              <span
                className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight tabular-nums"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "var(--primary)",
                  border:
                    "1px solid color-mix(in srgb, var(--primary) 25%, transparent)",
                }}
              >
                <Trophy size={8} strokeWidth={3} />
                {historicalMaxWeight}kg
              </span>
            )}
          </div>
        </div>

        <div
          className="flex items-center gap-1 ml-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {!isLocked && (
            <>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMoveCard?.(index, -1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-20 active:scale-90 transition-transform"
                style={{
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--muted-foreground)",
                }}
              >
                <ArrowUp size={12} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                disabled={index === totalExercises - 1}
                onClick={() => onMoveCard?.(index, 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-20 active:scale-90 transition-transform"
                style={{
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--muted-foreground)",
                }}
              >
                <ArrowDown size={12} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={handleRemoveExerciseCard}
                className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                style={{
                  background:
                    "color-mix(in srgb, var(--destructive) 10%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--destructive) 20%, transparent)",
                  color: "var(--destructive)",
                }}
              >
                <Trash2 size={12} strokeWidth={2} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => toggleLockExercise(exercise.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center border transition-all active:scale-90"
            style={{
              background: isLocked
                ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                : "var(--secondary)",
              border: `1px solid ${isLocked ? "color-mix(in srgb, var(--primary) 30%, transparent)" : "var(--border)"}`,
              color: isLocked ? "var(--primary)" : "var(--muted-foreground)",
            }}
          >
            {isLocked ? (
              <Lock size={12} strokeWidth={2.5} />
            ) : (
              <Unlock size={12} strokeWidth={2} />
            )}
          </button>
          <div
            className="pl-0.5 flex items-center"
            style={{ color: "var(--muted-foreground)" }}
            onClick={() => toggleExercise(exercise.id)}
          >
            {isExpanded ? (
              <ChevronUp size={15} strokeWidth={2.5} />
            ) : (
              <ChevronDown size={15} strokeWidth={2.5} />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pt-3 pb-4 space-y-2.5 relative animate-in fade-in slide-in-from-top-1 duration-150">
          {restCountdown > 0 && (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-150"
              style={{
                background:
                  "color-mix(in srgb, var(--background) 92%, transparent)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="flex flex-col items-center gap-1">
                <span
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Rest
                </span>
                <span
                  className="font-mono text-5xl font-black tabular-nums leading-none"
                  style={{ color: "var(--primary)" }}
                >
                  {restCountdown}
                  <span
                    className="text-2xl"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    s
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => clearRestTimer(exercise.id)}
                className="h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-opacity active:opacity-70"
                style={{
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--secondary-foreground)",
                }}
              >
                Skip Rest
              </button>
            </div>
          )}

          <div
            className="grid grid-cols-[40px_1fr_1fr_42px_32px] gap-2.5 text-center text-[9px] font-black uppercase tracking-widest px-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span>Set</span>
            <span>{showDuration ? "Secs" : "Reps"}</span>
            <span>{showDistance ? "Mtrs" : showWeight ? "Kg" : "—"}</span>
            <span>Done</span>
            <span />
          </div>

          {doubleProgressionSuggestion && !isLocked ? (
            <div
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border"
              style={{
                background: "color-mix(in srgb, var(--success) 8%, transparent)",
                borderColor: "color-mix(in srgb, var(--success) 20%, transparent)",
              }}
            >
              <span
                className="text-xs font-black tracking-tight"
                style={{
                  whiteSpace: "pre-wrap",
                  color: "var(--success)",
                }}
              >
                {doubleProgressionSuggestion.message}
              </span>
              {doubleProgressionSuggestion.workoutCount !== undefined && (
                <div
                  className="flex items-center justify-center px-1.5 py-0.5 rounded-md text-[9px] font-black shrink-0 uppercase tracking-wider"
                  style={{
                    background: "color-mix(in srgb, var(--success) 15%, transparent)",
                    color: "var(--success)",
                    border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)",
                  }}
                  title={`Workout ${doubleProgressionSuggestion.workoutCount} at this weight`}
                >
                  W{doubleProgressionSuggestion.workoutCount}
                </div>
              )}
            </div>
          ) : plainHistoricalTargetStripText && !isLocked ? (
            <div
              className="flex items-center gap-2 px-1 py-1 rounded-lg"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 6%, transparent)",
              }}
            >
              <span style={{ fontSize: 10 }}>🎯</span>
              <span
                className="font-mono text-[10px] font-black tracking-widest"
                style={{ color: "var(--primary)" }}
              >
                {plainHistoricalTargetStripText}
              </span>
            </div>
          ) : null}

          <div className="space-y-1.5">
            {exerciseSets.map((s) => (
              <WorkoutSetRow
                key={s.id}
                setRow={s}
                workoutId={workoutId}
                exerciseId={exercise.id}
                exerciseName={exercise.name}
                showDuration={showDuration}
                showWeight={showWeight}
                showDistance={showDistance}
                isLocked={isLocked}
                userId={userId}
                onSetCompleted={handleTriggerRestOverlay}
                allExerciseSets={exerciseSets}
              />
            ))}
          </div>

          <button
            type="button"
            disabled={isLocked}
            onClick={handleAddNewSet}
            className="h-10 w-full mt-1 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-opacity active:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: "var(--secondary)",
              border: "1px solid var(--border)",
              color: "var(--secondary-foreground)",
            }}
          >
            <Plus size={13} strokeWidth={3} />
            Add Set
          </button>
        </div>
      )}
    </div>
  );
}
