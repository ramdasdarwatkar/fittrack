import { useMemo, useState, useEffect } from "react";
import { Plus, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { WorkoutSetService } from "@/services/SetService";
import { useWorkoutUIStore } from "@/stores/useWorkoutUIStore";
import type { Tables } from "@/db/supabase";
import type { LocalSet as LocalWorkoutSet } from "@/db";
import WorkoutSetRow from "./WorkoutSetRow";

interface ExerciseCardProps {
  exercise: Tables<"exercises">;
  workoutId: string;
  allWorkoutSets: LocalWorkoutSet[];
  userId: string;
}

export default function ExerciseCard({
  exercise,
  workoutId,
  allWorkoutSets,
  userId,
}: ExerciseCardProps) {
  const { expandedExercises, toggleExercise } = useWorkoutUIStore();
  const isExpanded = !!expandedExercises[exercise.id];

  const [restRemaining, setRestRemaining] = useState(0);

  // Pure collection mapping derived from properties. No direct DB collection calls.
  const exerciseSets = useMemo(() => {
    return allWorkoutSets
      .filter((s) => s.exercise_id === exercise.id)
      .sort((a, b) => a.set_number - b.set_number);
  }, [allWorkoutSets, exercise.id]);

  // Read metric tracking flags safely from your exercise JSON field
  const metricsList = useMemo(() => {
    return Array.isArray(exercise.metrics)
      ? (exercise.metrics as string[])
      : ["reps"];
  }, [exercise.metrics]);

  const showWeight = metricsList.includes("weight");
  const showDistance = metricsList.includes("distance");
  const showDuration = metricsList.includes("duration");

  // Pure layout timer loop
  useEffect(() => {
    if (restRemaining <= 0) return;
    const timerId = setTimeout(
      () => setRestRemaining((prev) => prev - 1),
      1000,
    );
    return () => clearTimeout(timerId);
  }, [restRemaining]);

  const handleTriggerRest = (): void => {
    const restLimit = exercise?.rest_seconds || 60;
    setRestRemaining(restLimit);
  };

  const handleAddNewSet = async (): Promise<void> => {
    await WorkoutSetService.addSetRow(workoutId, exercise.id, userId);
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-all duration-200">
      {/* ACCORDION HEADER BLOCK PANEL */}
      <div
        onClick={() => toggleExercise(exercise.id)}
        className="px-4 py-3.5 flex items-center justify-between border-b border-border/60 bg-secondary/20 cursor-pointer hover:bg-secondary/40 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <h3 className="font-black text-sm uppercase tracking-tight truncate text-foreground leading-none">
            {exercise.name}
          </h3>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mt-1">
            {exercise.equipment || "Bodyweight"}{" "}
            {exercise.variation ? `• ${exercise.variation}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-4 shrink-0 text-muted-foreground/60">
          <span className="text-[10px] font-mono tracking-tight bg-secondary border border-border/60 px-2 py-0.5 rounded-md font-bold">
            {exerciseSets.length} {exerciseSets.length === 1 ? "Set" : "Sets"}
          </span>
          <div>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* CONDITIONAL SUB-SET ROWS VIEWS EXPANSION */}
      {isExpanded && (
        <div className="p-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* REST TIMER SUB-HEADER CONTROLLER */}
          {restRemaining > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 flex items-center justify-between text-primary mb-2 animate-pulse">
              <div className="flex items-center gap-2">
                <Clock
                  size={14}
                  className="animate-spin"
                  style={{ animationDuration: "4s" }}
                />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  Rest countdown clock active
                </span>
              </div>
              <span className="font-mono text-sm font-black tabular-nums">
                {restRemaining}s
              </span>
            </div>
          )}

          <div className="grid grid-cols-[40px_1fr_1fr_42px_32px] gap-2.5 text-center text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 px-1">
            <span>Set</span>
            <span>{showDuration ? "Secs" : "Reps"}</span>
            <span>{showDistance ? "Mtrs" : showWeight ? "Kg" : "—"}</span>
            <span>Check</span>
            <span></span>
          </div>

          <div className="space-y-1.5">
            {exerciseSets.map((s) => (
              <WorkoutSetRow
                key={s.id}
                setRow={s}
                workoutId={workoutId}
                exerciseId={exercise.id}
                showDuration={showDuration}
                showWeight={showWeight}
                showDistance={showDistance}
                onCompleted={handleTriggerRest}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddNewSet}
            className="h-10 w-full mt-3 rounded-xl bg-secondary text-foreground text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 border border-border/40 cursor-pointer active:bg-secondary/70 transition-colors"
          >
            <Plus size={13} strokeWidth={3} /> Add Set Line
          </button>
        </div>
      )}
    </div>
  );
}
