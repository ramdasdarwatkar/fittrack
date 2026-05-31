import { memo, useMemo } from "react";
import { Check, X } from "lucide-react";
import { WorkoutSetService } from "@/services/SetService";
import { PersonalRecordsService } from "@/services/PersonalRecordsService";
import { useWorkoutUIStore } from "@/stores/useWorkoutUIStore";
import type { LocalSet as LocalWorkoutSet } from "@/db";

interface WorkoutSetRowProps {
  setRow: LocalWorkoutSet;
  workoutId: string;
  exerciseId: string;
  exerciseName: string;
  showDuration: boolean;
  showWeight: boolean;
  showDistance: boolean;
  isLocked: boolean;
  userId: string;
  onSetCompleted: () => void;
  allExerciseSets: LocalWorkoutSet[];
}

const SET_TYPES_ROTATION: LocalWorkoutSet["set_type"][] = [
  "MAIN",
  "WARMUP",
  "DROPSET",
  "FAILURE",
];

const SET_TYPE_STYLES: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  MAIN: {
    label: "",
    bg: "var(--secondary)",
    color: "var(--secondary-foreground)",
    border: "var(--border)",
  },
  WARMUP: {
    label: "W",
    bg: "color-mix(in srgb, var(--warning) 18%, transparent)",
    color: "var(--warning)",
    border: "color-mix(in srgb, var(--warning) 35%, transparent)",
  },
  DROPSET: {
    label: "D",
    bg: "color-mix(in srgb, var(--success) 15%, transparent)",
    color: "var(--success)",
    border: "color-mix(in srgb, var(--success) 30%, transparent)",
  },
  FAILURE: {
    label: "F",
    bg: "color-mix(in srgb, var(--destructive) 15%, transparent)",
    color: "var(--destructive)",
    border: "color-mix(in srgb, var(--destructive) 30%, transparent)",
  },
};

export default memo(function WorkoutSetRow({
  setRow,
  exerciseId,
  exerciseName,
  showDuration,
  showWeight,
  showDistance,
  isLocked,
  userId,
  onSetCompleted,
  allExerciseSets,
}: WorkoutSetRowProps) {
  const triggerPRCelebration = useWorkoutUIStore(
    (state) => state.triggerPRCelebration,
  );
  const isChecked = setRow.completed === 1;
  const setIndex = allExerciseSets.findIndex((s) => s.id === setRow.id);

  const handleCycleType = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    if (isLocked) return;
    const currentIndex = SET_TYPES_ROTATION.indexOf(setRow.set_type);
    const nextIndex = (currentIndex + 1) % SET_TYPES_ROTATION.length;
    const nextType = SET_TYPES_ROTATION[nextIndex];
    await WorkoutSetService.updateSetFields(setRow.id, { set_type: nextType });
  };

  const handleToggleComplete = async (): Promise<void> => {
    if (isLocked) return;

    const primaryValue = showDuration ? setRow.duration_sec : setRow.reps;
    const secondaryValue = showDistance
      ? setRow.distance_meters
      : setRow.weight;

    const isPrimaryEmpty = primaryValue === null || primaryValue === 0;
    const isSecondaryEmpty =
      (!showWeight && !showDistance) ||
      secondaryValue === null ||
      secondaryValue === 0;

    if (isPrimaryEmpty && isSecondaryEmpty) return;

    const nextState = isChecked ? 0 : 1;

    if (nextState === 1 && showWeight && setRow.weight && setRow.weight > 0) {
      const historicalPR =
        await PersonalRecordsService.getLatestPRForExercise(exerciseId);
      if (!historicalPR || setRow.weight > historicalPR.value) {
        await PersonalRecordsService.logNewWeightPR(
          userId,
          exerciseId,
          setRow.weight,
          setRow.id,
        );
        triggerPRCelebration({
          exerciseId,
          exerciseName,
          oldValue: historicalPR ? historicalPR.value : null,
          newValue: setRow.weight,
        });
      }
    }

    await WorkoutSetService.updateSetFields(setRow.id, {
      completed: nextState,
    });
    if (nextState === 1) onSetCompleted();
  };

  const handleValueChange = async (
    fieldKey: "reps" | "duration_sec" | "weight" | "distance_meters",
    rawValue: string,
  ): Promise<void> => {
    if (isLocked) return;
    const isFloat = fieldKey === "weight" || fieldKey === "distance_meters";
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

  const handleRowDeletion = async (): Promise<void> => {
    if (isLocked) return;
    await WorkoutSetService.deleteSetRow(setRow.id);
  };

  const dynamicPlaceholders = useMemo(() => {
    // PATCHED: Use numeric comparison to find the previous set
    const prev = [...allExerciseSets]
      .filter((s) => Number(s.set_number) < Number(setRow.set_number))
      .sort((a, b) => Number(b.set_number) - Number(a.set_number))[0];

    if (!prev || prev.completed !== 1) return { primary: "0", secondary: "0" };
    return {
      primary: String(showDuration ? prev.duration_sec : prev.reps),
      secondary: String(showDistance ? prev.distance_meters : prev.weight),
    };
  }, [setRow.set_number, allExerciseSets, showDuration, showDistance]);

  const typeStyle = SET_TYPE_STYLES[setRow.set_type] ?? SET_TYPE_STYLES.MAIN;

  return (
    <div
      className="grid grid-cols-[40px_1fr_1fr_42px_32px] gap-2.5 items-center py-1.5 last:pb-0 transition-all duration-150"
      style={{
        borderBottom:
          "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
      }}
    >
      <button
        type="button"
        disabled={isLocked}
        onClick={handleCycleType}
        className="h-9 w-9 rounded-xl text-xs font-black flex items-center justify-center transition-all active:scale-90 disabled:cursor-not-allowed"
        style={{
          background: typeStyle.bg,
          color: typeStyle.color,
          border: `1px solid ${typeStyle.border}`,
        }}
      >
        {setRow.set_type !== "MAIN" ? (
          <span className="text-[10px] font-black leading-none">
            {typeStyle.label}
          </span>
        ) : (
          <span>{setIndex !== -1 ? setIndex + 1 : Math.floor(Number(setRow.set_number))}</span>
        )}
      </button>

      <input
        type="number"
        inputMode="decimal"
        pattern="[0-9]*"
        placeholder={dynamicPlaceholders.primary}
        disabled={isChecked || isLocked}
        value={(showDuration ? setRow.duration_sec : setRow.reps) ?? ""}
        onChange={(e) =>
          handleValueChange(
            showDuration ? "duration_sec" : "reps",
            e.target.value,
          )
        }
        className="h-10 w-full text-center font-black text-base focus:outline-none transition-opacity disabled:opacity-40 rounded-lg"
        style={{
          background: "transparent",
          borderBottom: "2px solid var(--border)",
          color: isChecked ? "var(--muted-foreground)" : "var(--foreground)",
        }}
      />

      <input
        type="number"
        inputMode="decimal"
        placeholder={dynamicPlaceholders.secondary}
        disabled={isChecked || isLocked || (!showWeight && !showDistance)}
        value={(showDistance ? setRow.distance_meters : setRow.weight) ?? ""}
        onChange={(e) =>
          handleValueChange(
            showDistance ? "distance_meters" : "weight",
            e.target.value,
          )
        }
        className="h-10 w-full text-center font-black text-base focus:outline-none transition-opacity disabled:opacity-40 rounded-lg"
        style={{
          background: "transparent",
          borderBottom: "2px solid var(--border)",
          color: isChecked ? "var(--muted-foreground)" : "var(--foreground)",
        }}
      />

      <button
        type="button"
        disabled={isLocked}
        onClick={handleToggleComplete}
        className="h-9 w-9 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
        style={
          isChecked
            ? {
                background: "var(--primary)",
                border: "1px solid var(--primary)",
                color: "var(--primary-foreground)",
              }
            : {
                background: "var(--secondary)",
                border: "1px solid var(--border)",
                color: "var(--muted-foreground)",
              }
        }
      >
        <Check size={15} strokeWidth={isChecked ? 3 : 2} />
      </button>

      <button
        type="button"
        disabled={isLocked}
        onClick={handleRowDeletion}
        className="h-8 w-8 flex items-center justify-center rounded-lg transition-all active:scale-90 disabled:opacity-20"
        style={{
          color: "color-mix(in srgb, var(--muted-foreground) 40%, transparent)",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = "var(--destructive)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color =
            "color-mix(in srgb, var(--muted-foreground) 40%, transparent)")
        }
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
});
