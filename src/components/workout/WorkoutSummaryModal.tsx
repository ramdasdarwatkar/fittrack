import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { WorkoutService } from "@/services/WorkoutService";
import type { Tables } from "@/db/supabase";
import type { LocalSet as LocalWorkoutSet } from "@/db";

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: Tables<"workouts">;
  allWorkoutSets: LocalWorkoutSet[];
  isRetroactive: boolean;
  retroDate: string;
  retroStart: string;
  retroEnd: string;
  runningDurationSec: number;
  note: string;
  setNote: (val: string) => void;
}

export default function WorkoutSummaryModal({
  isOpen,
  onClose,
  workout,
  allWorkoutSets,
  isRetroactive,
  retroDate,
  retroStart,
  retroEnd,
  runningDurationSec,
  note,
  setNote,
}: WorkoutSummaryModalProps) {
  const navigate = useNavigate();

  // Pure data summary calculations completely decoupled from the database layers
  const aggregatedMetrics = useMemo(() => {
    const checkedRows = allWorkoutSets.filter((s) => s.completed === 1);
    let totalWorkSetsCount = 0;
    let totalRepsSum = 0;
    let totalLiftedVolume = 0;

    checkedRows.forEach((s) => {
      if (s.set_type === "MAIN") totalWorkSetsCount++;
      if (s.reps) totalRepsSum += s.reps;
      if (s.weight && s.reps) {
        totalLiftedVolume += s.weight * s.reps;
      }
    });

    return { totalWorkSetsCount, totalRepsSum, totalLiftedVolume };
  }, [allWorkoutSets]);

  const handleFinalSaveCommit = async (): Promise<void> => {
    let computedDuration = runningDurationSec;
    let finalEndIso = new Date().toISOString();
    let finalStartIso = workout.start_time;
    let finalDateString = workout.date;

    if (isRetroactive) {
      const startDateTime = new Date(`${retroDate}T${retroStart}:00`);
      const endDateTime = new Date(`${retroDate}T${retroEnd}:00`);
      computedDuration = Math.max(
        0,
        Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 1000),
      );
      finalStartIso = startDateTime.toISOString();
      finalEndIso = endDateTime.toISOString();
      finalDateString = retroDate;
    }

    await WorkoutService.completeSession(workout.id, {
      date: finalDateString,
      start_time: finalStartIso,
      end_time: finalEndIso,
      duration_sec: computedDuration,
      note: note.trim() || null,
    });

    onClose();
    setNote("");
    navigate("/library");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm text-foreground select-none">
      <div className="bg-card border border-border p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="space-y-1">
          <h3 className="font-black text-xl uppercase tracking-tight text-foreground">
            Workout Summary
          </h3>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
            Aggregated Metric Summary View
          </p>
        </div>

        {/* SUMMARY PERFORMANCE METRIC BLOCKS */}
        <div className="grid grid-cols-3 gap-2.5 bg-secondary/40 border border-border/60 p-4 rounded-xl text-center tabular-nums">
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground">
              Work Sets
            </span>
            <span className="font-black text-lg text-foreground mt-0.5">
              {aggregatedMetrics.totalWorkSetsCount}
            </span>
          </div>
          <div className="flex flex-col border-x border-border/60">
            <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground">
              Total Reps
            </span>
            <span className="font-black text-lg text-foreground mt-0.5">
              {aggregatedMetrics.totalRepsSum}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground">
              Total Volume
            </span>
            <span className="font-black text-lg text-primary mt-0.5">
              {aggregatedMetrics.totalLiftedVolume}kg
            </span>
          </div>
        </div>

        {/* FEEDBACK NOTES INPUT FIELD */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Session Notes
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Log details on focus parameters adjustments, energy levels..."
            className="w-full h-24 bg-secondary border border-border rounded-xl p-3 text-sm font-medium text-foreground outline-none resize-none placeholder:text-muted-foreground/40 leading-relaxed focus:border-primary/40"
          />
        </div>

        {/* INTERACTION ACTION CONTROLLER ROW */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-5 h-12 rounded-xl bg-secondary text-foreground text-xs font-black uppercase tracking-widest border border-border cursor-pointer active:bg-secondary/60 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleFinalSaveCommit}
            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest shadow-lg cursor-pointer active:scale-98 transition-transform"
          >
            Commit Session Log
          </button>
        </div>
      </div>
    </div>
  );
}
