import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { WorkoutService } from "@/services/WorkoutService";
import type { Tables } from "@/db/supabase";
import type { LocalSet as LocalWorkoutSet } from "@/db";
import { useWorkoutUIStore } from "@/stores/useWorkoutUIStore";
import { Dumbbell, RotateCcw, Zap, FileText } from "lucide-react";

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: Tables<"workouts">;
  allWorkoutSets: LocalWorkoutSet[];
  isRetroactive: boolean;
  note: string;
  setNote: (val: string) => void;
  retroDate?: string;
  retroStart?: string;
  retroEnd?: string;
}

export default function WorkoutSummaryModal({
  isOpen,
  onClose,
  workout,
  allWorkoutSets,
  isRetroactive,
  note,
  setNote,
  retroDate,
  retroStart,
  retroEnd,
}: WorkoutSummaryModalProps) {
  const navigate = useNavigate();

  const aggregatedMetrics = useMemo(() => {
    const checkedRows = allWorkoutSets.filter((s) => s.completed === 1);
    let totalWorkSetsCount = 0;
    let totalRepsSum = 0;
    let totalLiftedVolume = 0;

    checkedRows.forEach((s) => {
      if (s.set_type === "MAIN") totalWorkSetsCount++;
      if (s.reps) totalRepsSum += s.reps;
      if (s.weight && s.reps) totalLiftedVolume += s.weight * s.reps;
    });
    return { totalWorkSetsCount, totalRepsSum, totalLiftedVolume };
  }, [allWorkoutSets]);

  const handleFinalSaveCommit = async (): Promise<void> => {
    let computedDuration: number;
    let finalEndIso = new Date().toISOString();
    let finalStartIso = workout.start_time || new Date().toISOString();
    let finalDateString = workout.date;

    if (isRetroactive) {
      if (retroDate && retroStart && retroEnd) {
        const startDateTime = new Date(`${retroDate}T${retroStart}:00`);
        const endDateTime = new Date(`${retroDate}T${retroEnd}:00`);
        computedDuration = Math.max(
          0,
          Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 1000),
        );
        finalStartIso = startDateTime.toISOString();
        finalEndIso = endDateTime.toISOString();
        finalDateString = retroDate;
      } else {
        computedDuration = workout.duration_sec ?? 0;
        finalEndIso = workout.end_time || finalEndIso;
      }
    } else {
      const startMs = new Date(finalStartIso).getTime();
      const endMs = new Date(finalEndIso).getTime();
      computedDuration = Math.max(0, Math.floor((endMs - startMs) / 1000));
    }

    await WorkoutService.completeSession(workout.id, {
      date: finalDateString,
      start_time: finalStartIso,
      end_time: finalEndIso,
      duration_sec: computedDuration,
      note: note.trim() || null,
    });

    useWorkoutUIStore.getState().clearUIState();
    onClose();
    setNote("");
    navigate("/");
  };

  if (!isOpen) return null;

  const metrics = [
    {
      icon: <Dumbbell size={13} strokeWidth={2.5} />,
      label: "Work Sets",
      value: aggregatedMetrics.totalWorkSetsCount,
      suffix: "",
      highlight: false,
    },
    {
      icon: <RotateCcw size={13} strokeWidth={2.5} />,
      label: "Total Reps",
      value: aggregatedMetrics.totalRepsSum,
      suffix: "",
      highlight: false,
    },
    {
      icon: <Zap size={13} strokeWidth={2.5} />,
      label: "Volume",
      value: aggregatedMetrics.totalLiftedVolume,
      suffix: "kg",
      highlight: true,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 select-none"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-md space-y-5 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "1.5rem",
          padding: "1.5rem",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div>
          <h3
            className="font-black text-xl uppercase tracking-tight leading-none"
            style={{ color: "var(--foreground)" }}
          >
            Session Summary
          </h3>
          <p
            className="text-[10px] font-bold uppercase tracking-widest mt-1"
            style={{ color: "var(--primary)" }}
          >
            {isRetroactive ? "Retroactive Log" : "Live Session"}
          </p>
        </div>

        {/* Metrics grid */}
        <div
          className="grid grid-cols-3 rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className="flex flex-col items-center justify-center py-4 gap-1.5"
              style={{
                borderRight:
                  i < metrics.length - 1 ? "1px solid var(--border)" : "none",
                background: m.highlight
                  ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                  : "transparent",
              }}
            >
              <div
                className="flex items-center gap-1"
                style={{
                  color: m.highlight
                    ? "var(--primary)"
                    : "var(--muted-foreground)",
                }}
              >
                {m.icon}
                <span className="text-[8px] font-black uppercase tracking-widest">
                  {m.label}
                </span>
              </div>
              <span
                className="font-black text-2xl tabular-nums leading-none"
                style={{
                  color: m.highlight ? "var(--primary)" : "var(--foreground)",
                }}
              >
                {m.value}
                {m.suffix && (
                  <span
                    className="text-sm font-black ml-0.5"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {m.suffix}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
            style={{ color: "var(--muted-foreground)" }}
          >
            <FileText size={11} strokeWidth={2.5} />
            Session Notes
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How did it feel? Any notes…"
            className="w-full h-24 rounded-xl p-3 text-sm font-medium outline-none resize-none transition-colors"
            style={{
              background: "var(--secondary)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor =
                "color-mix(in srgb, var(--primary) 60%, transparent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-0.5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-opacity active:opacity-70"
            style={{
              background: "var(--secondary)",
              color: "var(--secondary-foreground)",
              border: "1px solid var(--border)",
            }}
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleFinalSaveCommit}
            className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-opacity active:opacity-70"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              boxShadow:
                "0 4px 16px color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          >
            Commit Session
          </button>
        </div>
      </div>
    </div>
  );
}
