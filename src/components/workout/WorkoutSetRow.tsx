import { memo } from "react";
import { Check, X } from "lucide-react";
import { WorkoutSetService } from "@/services/SetService";
import type { Tables } from "@/db/supabase";

interface WorkoutSetRowProps {
  setRow: Tables<"sets"> & { completed?: number };
  workoutId: string;
  exerciseId: string;
  showDuration: boolean;
  showWeight: boolean;
  showDistance: boolean;
  onCompleted: () => void;
}

export default memo(function WorkoutSetRow({
  setRow,
  workoutId,
  exerciseId,
  showDuration,
  showWeight,
  showDistance,
  onCompleted,
}: WorkoutSetRowProps) {
  const isChecked = setRow.completed === 1;

  const handleToggleType = async () => {
    await WorkoutSetService.toggleSetType(setRow.id, setRow.set_type);
  };

  const handleToggleComplete = async () => {
    const nextState = isChecked ? 0 : 1;
    await WorkoutSetService.updateSetFields(setRow.id, {
      completed: nextState,
    });
    if (nextState === 1) onCompleted();
  };

  const handleValueChange = async (
    fieldKey: "reps" | "duration_sec" | "weight" | "distance_meters",
    rawValue: string,
    isFloat = false,
  ) => {
    const parsedValue =
      rawValue === ""
        ? null
        : isFloat
          ? parseFloat(rawValue)
          : parseInt(rawValue, 10);
    await WorkoutSetService.updateSetFields(setRow.id, {
      [fieldKey]: parsedValue,
    });
  };

  const handleRowDeletion = async () => {
    await WorkoutSetService.deleteSetRow(setRow.id, workoutId, exerciseId);
  };

  return (
    <div className="grid grid-cols-[40px_1fr_1fr_42px_32px] gap-2.5 items-center border-b border-border/40 last:border-none py-1.5 text-foreground animate-in fade-in duration-100">
      {/* Warmup Badge Toggle Action Button */}
      <button
        type="button"
        onClick={handleToggleType}
        className={`h-9 w-9 rounded-lg text-xs font-black transition-all cursor-pointer ${
          setRow.set_type === "WARMUP"
            ? "bg-yellow-400/20 text-yellow-500 border border-yellow-500/30"
            : "bg-secondary text-muted-foreground border border-border"
        }`}
      >
        {setRow.set_type === "WARMUP" ? "W" : setRow.set_number}
      </button>

      {/* Metric Lane 1: Reps Count or Duration Seconds */}
      <input
        type="number"
        placeholder="0"
        disabled={isChecked}
        value={(showDuration ? setRow.duration_sec : setRow.reps) ?? ""}
        onChange={(e) =>
          handleValueChange(
            showDuration ? "duration_sec" : "reps",
            e.target.value,
          )
        }
        className={`h-10 w-full bg-transparent border-b text-center font-black text-base focus:outline-none transition-colors ${
          isChecked
            ? "text-primary border-primary/40"
            : "text-foreground border-border focus:border-primary"
        }`}
      />

      {/* Metric Lane 2: Load Mass Kg or Distance Vector Meters */}
      <input
        type="number"
        placeholder="0"
        disabled={isChecked || (!showWeight && !showDistance)}
        value={(showDistance ? setRow.distance_meters : setRow.weight) ?? ""}
        onChange={(e) =>
          handleValueChange(
            showDistance ? "distance_meters" : "weight",
            e.target.value,
            showDistance,
          )
        }
        className={`h-10 w-full bg-transparent border-b text-center font-black text-base focus:outline-none transition-colors ${
          isChecked
            ? "text-primary border-primary/40"
            : "text-foreground border-border focus:border-primary"
        } disabled:opacity-0 disabled:border-transparent`}
      />

      {/* Row Completion Status Toggle Key */}
      <button
        type="button"
        onClick={handleToggleComplete}
        className={`h-9 w-9 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
          isChecked
            ? "bg-primary border-primary text-primary-foreground shadow-sm"
            : "bg-secondary border-border text-muted-foreground/40"
        }`}
      >
        <Check size={16} strokeWidth={isChecked ? 3 : 2} />
      </button>

      {/* Row Deletion Splice Trigger */}
      <button
        type="button"
        onClick={handleRowDeletion}
        className="h-8 w-8 flex items-center justify-center text-muted-foreground/30 hover:text-destructive active:scale-75 transition-all cursor-pointer"
      >
        <X size={14} />
      </button>
    </div>
  );
});
