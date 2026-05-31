import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type LocalWorkout, type LocalSet } from "@/db";
import { MuscleGroupService } from "@/services/StaticReferenceService";
import { WorkoutService } from "@/services/WorkoutService";
import {
  Plus,
  Moon,
  Dumbbell,
  Clock,
  Zap,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCcw,
  Share2,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(sec?: number | null): string {
  if (!sec) return "0m";
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDateLabel(dateStr: string): { day: string; num: string } {
  const d = new Date(dateStr);
  return {
    day: d.toLocaleDateString("en-US", { weekday: "short" }),
    num: String(d.getDate()),
  };
}

function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Vertical 3-dot kebab icon ─────────────────────────────────────────────

function KebabIcon() {
  return (
    <svg
      width="5"
      height="21"
      viewBox="0 0 5 21"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="2.5" cy="2.5" r="2.5" />
      <circle cx="2.5" cy="10.5" r="2.5" />
      <circle cx="2.5" cy="18.5" r="2.5" />
    </svg>
  );
}

// ─── Share canvas ─────────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generateAndShareWorkoutImage(
  workout: LocalWorkout,
  exerciseData: Record<string, { name: string; muscleName: string }>,
  grouped: Record<string, LocalSet[]>,
  muscleGroups: string,
  totalVolume: number,
) {
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const bg = isDark ? "#09090b" : "#ffffff";
  const cardBg = isDark ? "#18181b" : "#f4f4f5";
  const fg = isDark ? "#fafafa" : "#09090b";
  const muted = isDark ? "#a1a1aa" : "#71717a";
  const border = isDark ? "#27272a" : "#e4e4e7";
  const primary = "#6f6fee";
  const workoutName = (workout as any).name ?? "Workout";

  const W = 800,
    pad = 48,
    rowH = 52;
  const exCount = Object.keys(grouped).length;
  const H = 280 + exCount * rowH + 100;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const cX = pad,
    cY = 100,
    cW = W - pad * 2,
    cH = H - cY - pad;
  ctx.fillStyle = cardBg;
  roundRect(ctx, cX, cY, cW, cH, 20);
  ctx.fill();

  ctx.fillStyle = primary;
  ctx.font = "700 18px -apple-system, sans-serif";
  ctx.fillText("WORKOUT LOG", pad, 44);
  ctx.fillStyle = fg;
  ctx.font = "700 26px -apple-system, sans-serif";
  ctx.fillText(formatMonthYear(workout.date), pad, 84);

  const { day, num } = formatDateLabel(workout.date);
  const bX = cX + 20,
    bY = cY + 20;
  ctx.fillStyle = border;
  roundRect(ctx, bX, bY, 64, 72, 12);
  ctx.fill();
  ctx.fillStyle = muted;
  ctx.font = "600 12px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(day.toUpperCase(), bX + 32, bY + 20);
  ctx.fillStyle = fg;
  ctx.font = "800 32px -apple-system, sans-serif";
  ctx.fillText(num, bX + 32, bY + 58);
  ctx.textAlign = "left";

  ctx.fillStyle = fg;
  ctx.font = "700 24px -apple-system, sans-serif";
  ctx.fillText(workoutName, bX + 80, bY + 30);
  ctx.fillStyle = muted;
  ctx.font = "600 16px -apple-system, sans-serif";
  ctx.fillText(
    `${formatDuration(workout.duration_sec)}   ${totalVolume.toLocaleString()} kg`,
    bX + 80,
    bY + 58,
  );

  const divY = cY + 112;
  ctx.fillStyle = border;
  ctx.fillRect(cX + 20, divY, cW - 40, 1);

  Object.entries(grouped).forEach(([exId, exSets], i) => {
    const rY = divY + 14 + i * rowH;
    ctx.fillStyle = fg;
    ctx.font = "500 18px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(exerciseData[exId]?.name ?? exId, cX + 20, rY + 30);
    ctx.fillStyle = muted;
    ctx.textAlign = "right";
    ctx.fillText(`×${exSets.length}`, cX + cW - 20, rY + 30);
    if (i < Object.keys(grouped).length - 1) {
      ctx.fillStyle = border;
      ctx.fillRect(cX + 20, rY + rowH - 1, cW - 40, 1);
    }
  });

  const fY = divY + 14 + exCount * rowH + 10;
  ctx.fillStyle = border;
  ctx.fillRect(cX + 20, fY, cW - 40, 1);
  ctx.fillStyle = muted;
  ctx.font = "400 15px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(muscleGroups || "No muscle groups", cX + 20, fY + 28);
  ctx.fillStyle = primary;
  ctx.font = "600 13px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Logged with the app", W - pad, H - 16);

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], "workout.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: workoutName });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "workout.png";
      a.click();
      URL.revokeObjectURL(url);
    }
  }, "image/png");
}

// ─── No Workout Empty State ───────────────────────────────────────────────────

function NoWorkoutState({
  dateStr,
  onMarkRest,
  onLogWorkout,
}: {
  dateStr: string;
  onMarkRest: () => void;
  onLogWorkout: () => void;
}) {
  const d = new Date(dateStr);
  const isToday = new Date().toISOString().split("T")[0] === dateStr;
  const isFuture = new Date(dateStr) > new Date();

  const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
  const dateLabel = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col items-center pt-6 pb-6 px-4">
      {/* Icon with elegant layout */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all"
        style={{
          backgroundColor: "var(--secondary)",
          border: "1px solid var(--border)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <Dumbbell
          size={26}
          style={{ color: "var(--primary)", opacity: 0.85 }}
        />
      </div>

      {/* Label */}
      <p
        className="text-base font-black mb-1 text-center"
        style={{ letterSpacing: "-0.02em", color: "var(--foreground)" }}
      >
        {isToday
          ? "No workouts logged today"
          : isFuture
            ? "Day ahead"
            : `No workout logged on ${dayName}`}
      </p>
      <p className="text-xs mb-6 text-center opacity-60" style={{ color: "var(--muted-foreground)" }}>
        {dateLabel}
      </p>

      {/* Actions */}
      {!isFuture && (
        <div className="flex flex-col gap-2.5 w-full max-w-xs">
          {/* Log Workout — primary with premium look */}
          <button
            onClick={onLogWorkout}
            disabled={isToday}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-xs transition-all active:scale-95 uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            style={{
              backgroundColor: isToday ? "var(--muted)" : "var(--primary)",
              color: isToday ? "var(--muted-foreground)" : "var(--primary-foreground)",
              boxShadow: isToday ? "none" : "0 4px 20px color-mix(in srgb, var(--primary) 28%, transparent)",
              letterSpacing: "0.08em",
            }}
          >
            <Plus size={14} strokeWidth={3} />
            Log Workout
          </button>

          {/* Rest Day — secondary but very sleek */}
          <button
            onClick={onMarkRest}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-xs transition-all active:scale-95 cursor-pointer"
            style={{
              backgroundColor: "transparent",
              color: "var(--muted-foreground)",
              border: "1px solid var(--border)",
              letterSpacing: "0.02em",
            }}
          >
            <Moon size={13} strokeWidth={2} className="opacity-70" />
            Mark Rest Day
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Rest Day State ───────────────────────────────────────────────────────────

function RestDayState({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr);
  const dateLabel = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col items-center pt-6 pb-6 px-4">
      {/* Icon — success tinted */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: "color-mix(in srgb, var(--success) 12%, transparent)",
          border:
            "1px solid color-mix(in srgb, var(--success) 24%, transparent)",
        }}
      >
        <Moon size={26} style={{ color: "var(--success)" }} />
      </div>

      <p
        className="text-base font-black mb-1 text-center"
        style={{ letterSpacing: "-0.02em", color: "var(--foreground)" }}
      >
        Rest & Recovery Day
      </p>
      <p className="text-xs mb-5 text-center opacity-60" style={{ color: "var(--muted-foreground)" }}>
        {dateLabel}
      </p>

      {/* Motivational pill */}
      <div
        className="px-4 py-2 rounded-xl text-xs font-semibold text-center"
        style={{
          backgroundColor: "var(--secondary)",
          color: "var(--muted-foreground)",
          border: "1px solid var(--border)",
          letterSpacing: "0.02em",
          maxWidth: "260px",
        }}
      >
        Recovery is where the strength is built
      </div>
    </div>
  );
}

// ─── History Calendar ─────────────────────────────────────────────────────────

export interface DayMeta {
  hasWorkout: boolean;
  isRestDay: boolean;
  workout?: LocalWorkout;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface HistoryCalendarProps {
  monthDataMap: Record<string, DayMeta>;
  selectedDateStr: string;
  profileCreatedDateStr?: string | null;
  onSelectDate: (dateStr: string, workout?: LocalWorkout) => void;
  onMonthChange: (year: number, month: number) => void;
}

export function HistoryCalendar({
  monthDataMap,
  selectedDateStr,
  profileCreatedDateStr,
  onSelectDate,
  onMonthChange,
}: HistoryCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const saved = sessionStorage.getItem("history_view_date");
    return saved ? new Date(saved) : new Date();
  });
  const [showPicker, setShowPicker] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const limitDate = useMemo(() => {
    return profileCreatedDateStr ? new Date(profileCreatedDateStr) : null;
  }, [profileCreatedDateStr]);

  const isPrevDisabled = useMemo(() => {
    if (!limitDate) return false;
    const prevMonthDate = new Date(year, month - 1, 1);
    return (
      prevMonthDate.getFullYear() < limitDate.getFullYear() ||
      (prevMonthDate.getFullYear() === limitDate.getFullYear() &&
        prevMonthDate.getMonth() < limitDate.getMonth())
    );
  }, [year, month, limitDate]);

  const isNextDisabled = useMemo(() => {
    const nextMonthDate = new Date(year, month + 1, 1);
    const now = new Date();
    return (
      nextMonthDate.getFullYear() > now.getFullYear() ||
      (nextMonthDate.getFullYear() === now.getFullYear() &&
        nextMonthDate.getMonth() > now.getMonth())
    );
  }, [year, month]);

  const yearRange = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const minYear = limitDate ? limitDate.getFullYear() : currentYear - 5;
    const years = [];
    for (let y = minYear; y <= currentYear; y++) {
      years.push(y);
    }
    return years;
  }, [limitDate]);

  const gridCells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = offset - 1; i >= 0; i--)
      cells.push({ dayNum: 0, dateString: "", overflow: true });
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      cells.push({
        dayNum,
        dateString: `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`,
        overflow: false,
      });
    }
    return cells;
  }, [year, month]);

  const handleDateNav = (dir: number) => {
    const next = new Date(year, month + dir, 1);
    setCurrentDate(next);
    onMonthChange(next.getFullYear(), next.getMonth());
  };

  return (
    <div className="w-full relative select-none">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => !isPrevDisabled && handleDateNav(-1)}
          disabled={isPrevDisabled}
          className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-20 disabled:pointer-events-none"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-sm font-black uppercase tracking-widest flex items-center gap-2 hover:bg-secondary px-3 py-1 rounded-lg transition-colors"
        >
          {MONTHS[month]} {year} <Calendar size={14} className="opacity-50" />
        </button>
        <button
          onClick={() => !isNextDisabled && handleDateNav(1)}
          disabled={isNextDisabled}
          className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-20 disabled:pointer-events-none"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {showPicker && (
        <div className="absolute inset-x-0 top-12 z-50 bg-card p-4 rounded-xl border border-border shadow-2xl">
          <div className="grid grid-cols-4 gap-2 mb-4 max-h-40 overflow-y-auto scrollbar-none">
            {yearRange.map((y) => {
              const isYearDisabled = limitDate ? y < limitDate.getFullYear() : false;
              return (
                <button
                  key={y}
                  disabled={isYearDisabled}
                  onClick={() => {
                    let targetMonth = month;
                    const currentYear = new Date().getFullYear();
                    const currentMonth = new Date().getMonth();
                    if (limitDate && y === limitDate.getFullYear() && month < limitDate.getMonth()) {
                      targetMonth = limitDate.getMonth();
                    } else if (y === currentYear && month > currentMonth) {
                      targetMonth = currentMonth;
                    }
                    setCurrentDate(new Date(y, targetMonth, 1));
                    onMonthChange(y, targetMonth);
                  }}
                  className={`p-2 rounded-lg text-xs font-bold transition-all disabled:opacity-20 disabled:pointer-events-none ${year === y ? "bg-primary text-white" : "bg-secondary"}`}
                >
                  {y}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MONTHS.map((m, i) => {
              const currentYear = new Date().getFullYear();
              const currentMonth = new Date().getMonth();
              const isMonthDisabled =
                (limitDate && (year < limitDate.getFullYear() || (year === limitDate.getFullYear() && i < limitDate.getMonth()))) ||
                (year > currentYear || (year === currentYear && i > currentMonth));
              return (
                <button
                  key={m}
                  disabled={isMonthDisabled}
                  onClick={() => {
                    setCurrentDate(new Date(year, i, 1));
                    onMonthChange(year, i);
                    setShowPicker(false);
                  }}
                  className={`p-2 rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-20 disabled:pointer-events-none ${month === i ? "bg-primary text-white" : "bg-secondary"}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-[10px] font-black text-center opacity-40 uppercase pb-1"
          >
            {d}
          </div>
        ))}
        {gridCells.map((cell, idx) => {
          const isSelected = selectedDateStr === cell.dateString;
          const meta = !cell.overflow
            ? monthDataMap[cell.dateString]
            : undefined;

          const hasWorkout = meta?.hasWorkout;
          const isRestDay = meta?.isRestDay;
          const todayStr = new Date().toISOString().split("T")[0];
          const isBeforeReg = !cell.overflow && cell.dateString && profileCreatedDateStr && cell.dateString < profileCreatedDateStr;
          const isFutureDay = !cell.overflow && cell.dateString && cell.dateString > todayStr;
          const isDisabledDay = isBeforeReg || isFutureDay;

          return (
            <button
              key={idx}
              onClick={() =>
                !cell.overflow && !isDisabledDay && onSelectDate(cell.dateString, meta?.workout)
              }
              disabled={cell.overflow || isDisabledDay}
              className="aspect-square rounded-md flex flex-col items-center justify-center relative transition-all duration-200"
              style={{
                backgroundColor: isSelected
                  ? "var(--primary)"
                  : cell.overflow
                    ? "transparent"
                    : "var(--surface)",
                opacity: isDisabledDay ? 0.4 : 1,
              }}
            >
              <span className={`text-xs font-bold var(--text-primary)`}>
                {cell.dayNum > 0 ? cell.dayNum : ""}
              </span>
              {!cell.overflow && !isDisabledDay && (hasWorkout || isRestDay) && (
                <div className="absolute bottom-1.5 flex justify-center w-full">
                  {hasWorkout && (
                    <div
                      className={`w-3.5 h-0.5 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`}
                    />
                  )}
                  {isRestDay && (
                    <div
                      className={`w-3.5 h-0.5 rounded-full ${isSelected ? "bg-white/70" : "bg-success"}`}
                    />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── History Details Card ────────────────────────────────────────────────────

interface HistoryDetailsProps {
  workout: LocalWorkout;
  onMenu?: (workout: LocalWorkout) => void;
}

export function HistoryDetails({ workout, onMenu }: HistoryDetailsProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    // Delay so the opening tap doesn't immediately close
    const t = setTimeout(() => {
      document.addEventListener("mousedown", close);
      document.addEventListener("touchstart", close);
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [menuOpen]);

  const sets = useLiveQuery(async () => {
    if (!workout?.id) return null;
    return db.sets
      .where("workout_id")
      .equals(workout.id)
      .filter((s) => s.is_deleted === 0)
      .toArray();
  }, [workout?.id]);

  const exerciseData = useLiveQuery(async () => {
    if (!sets?.length) return {};
    const uniqueIds = [...new Set(sets.map((s) => s.exercise_id))];
    const exercises = await db.exercises.where("id").anyOf(uniqueIds).toArray();
    const data: Record<string, { name: string; muscleName: string }> = {};
    for (const ex of exercises) {
      const muscle = await MuscleGroupService.getOne(ex.muscle_group_id);
      data[ex.id] = { name: ex.name, muscleName: muscle?.name ?? "" };
    }
    return data;
  }, [sets]);

  if (!sets || !exerciseData) {
    return (
      <div>
        {/* Month + count header placeholder */}
        <div className="flex justify-between items-baseline mb-3">
          <span
            className="text-sm font-bold animate-pulse"
            style={{ letterSpacing: "-0.02em" }}
          >
            ...
          </span>
          <span
            className="text-xs font-semibold animate-pulse"
            style={{ color: "var(--muted-foreground)" }}
          >
            ...
          </span>
        </div>
        <div
          className="rounded-2xl animate-pulse"
          style={{ backgroundColor: "var(--secondary)", minHeight: 140 }}
        />
      </div>
    );
  }

  const grouped = sets.reduce<Record<string, LocalSet[]>>((acc, s) => {
    (acc[s.exercise_id] ??= []).push(s);
    return acc;
  }, {});

  const totalVolume = sets.reduce(
    (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
    0,
  );

  const muscleGroups = [
    ...new Set(
      Object.keys(grouped)
        .map((id) => exerciseData[id]?.muscleName)
        .filter(Boolean),
    ),
  ].join(", ");

  const { day, num } = formatDateLabel(workout.date);
  const monthYear = formatMonthYear(workout.date);
  const workoutName = (workout as any).name ?? "Workout";
  const exerciseEntries = Object.entries(grouped);

  const handleCardTap = () =>
    navigate(`/history/${workout.id}`, { state: { workout } });
  const handleRestart = () => {
    setMenuOpen(false);
    navigate(`/workout?mode=clone&cloneId=${workout.id}`);
  };
  const handleExport = () => {
    setMenuOpen(false);
    generateAndShareWorkoutImage(
      workout,
      exerciseData,
      grouped,
      muscleGroups,
      totalVolume,
    );
  };

  return (
    <div
      style={{ fontFamily: "var(--font-inter)", color: "var(--foreground)" }}
    >
      {/* Month + count header */}
      <div className="flex justify-between items-baseline mb-3">
        <span className="text-sm font-bold" style={{ letterSpacing: "-0.02em" }}>
          {monthYear}
        </span>
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--muted-foreground)" }}
        >
          1 Workout
        </span>
      </div>

      {/* Card wrapper — overflow:visible so dropdown isn't clipped */}
      <div
        className="rounded-2xl overflow-hidden transition-all active:scale-[0.985]"
        style={{
          backgroundColor: "var(--secondary)",
          overflow: "visible",
          position: "relative",
        }}
      >
        {/* ── Header: date badge + name + kebab ── */}
        <div className="flex items-center gap-3.5 px-4 pt-4 pb-3.5 rounded-t-2xl">
          {/* Tappable area (card nav) — fills all but the button */}
          <div
            className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
            style={{ WebkitTapHighlightColor: "transparent" }}
            onClick={handleCardTap}
          >
            {/* Date badge */}
            <div
              className="flex flex-col items-center justify-center rounded-xl shrink-0"
              style={{
                minWidth: 52,
                backgroundColor: "var(--muted)",
                padding: "6px 0 8px",
              }}
            >
              <span
                className="uppercase leading-none"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: "var(--muted-foreground)",
                }}
              >
                {day}
              </span>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                {num}
              </span>
            </div>

            {/* Name + stats */}
            <div className="flex-1 min-w-0">
              <p
                className="font-bold truncate mb-1"
                style={{ fontSize: 17, letterSpacing: "-0.02em" }}
              >
                {workoutName}
              </p>
              <div
                className="flex items-center gap-2.5"
                style={{ color: "var(--muted-foreground)" }}
              >
                <span
                  className="flex items-center gap-1"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatDuration(workout.duration_sec)}
                </span>
                <span
                  className="flex items-center gap-1"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  <svg
                    width="14"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 4v16M18 4v16M3 8h4M17 8h4M3 16h4M17 16h4M7 12h10" />
                  </svg>
                  {totalVolume.toLocaleString()} kg
                </span>
              </div>
            </div>
          </div>

          {/* Kebab button + dropdown — isolated from card tap */}
          <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen((v) => !v);
                onMenu?.(workout);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--muted-foreground)",
                padding: 0,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <KebabIcon />
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  position: "absolute",
                  top: 40,
                  right: 0,
                  zIndex: 9999,
                  minWidth: 195,
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
                }}
              >
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--foreground)",
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--secondary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <RotateCcw
                    size={15}
                    strokeWidth={2.5}
                    style={{ color: "var(--primary)", flexShrink: 0 }}
                  />
                  Restart Workout
                </button>
                <div
                  style={{
                    height: 1,
                    backgroundColor: "var(--border)",
                    margin: "0 12px",
                  }}
                />
                <button
                  type="button"
                  onClick={handleExport}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--foreground)",
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--secondary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <Share2
                    size={15}
                    strokeWidth={2.5}
                    style={{ color: "var(--primary)", flexShrink: 0 }}
                  />
                  Export Image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div
          className="mx-4"
          style={{ height: 1, backgroundColor: "var(--border)" }}
        />

        {/* Exercise list — tappable */}
        <div
          className="px-4 py-1 cursor-pointer"
          onClick={handleCardTap}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {exerciseEntries.map(([exId, exSets], i) => (
            <div
              key={exId}
              className="flex justify-between items-center py-2.5"
              style={{
                borderBottom:
                  i < exerciseEntries.length - 1
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                }}
              >
                {exerciseData[exId]?.name ?? exId}
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: "var(--muted-foreground)",
                  letterSpacing: "-0.01em",
                }}
              >
                ×{exSets.length}
              </span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          className="mx-4"
          style={{ height: 1, backgroundColor: "var(--border)" }}
        />

        {/* Muscle groups footer */}
        <div
          className="px-4 py-3 rounded-b-2xl cursor-pointer"
          onClick={handleCardTap}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <p
            style={{
              fontSize: 13,
              color: "var(--muted-foreground)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {muscleGroups || "No muscle groups logged"}
          </p>
        </div>
      </div>

      {/* Tap hint */}
      <p
        className="text-center mt-3 text-xs"
        style={{ color: "var(--muted-foreground)", opacity: 0.6 }}
      >
        Tap to view full details
      </p>
    </div>
  );
}

// ─── History Page ─────────────────────────────────────────────────────────────

export default function History() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setUserId(user.id);
      });
    });
  }, []);

  // Check if we navigated back from details page
  const cameFromDetails = useMemo(() => {
    const val = sessionStorage.getItem("history_came_from_details");
    // Consume the flag immediately so that direct tab navigation doesn't get it
    sessionStorage.removeItem("history_came_from_details");
    return val === "true";
  }, []);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const saved = sessionStorage.getItem("history_selected_date");
    if (cameFromDetails && saved) {
      return saved;
    }
    const today = new Date().toISOString().split("T")[0];
    sessionStorage.setItem("history_selected_date", today);
    return today;
  });
  const [activeWorkout, setActiveWorkout] = useState<LocalWorkout | null>(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [retroStartTime, setRetroStartTime] = useState("10:00");
  const [retroEndTime, setRetroEndTime] = useState("11:00");
  const [viewDate, setViewDate] = useState<Date>(() => {
    const saved = sessionStorage.getItem("history_view_date");
    if (cameFromDetails && saved) {
      return new Date(saved);
    }
    const today = new Date();
    sessionStorage.setItem("history_view_date", today.toISOString());
    return today;
  });

  const userProfile = useLiveQuery(async () => {
    if (!userId) return null;
    return await db.userProfiles.get(userId);
  }, [userId]);

  const profileCreatedDateStr = useMemo(() => {
    if (!userProfile?.created_at) return null;
    return userProfile.created_at.split("T")[0];
  }, [userProfile]);

  const workoutData = useLiveQuery(async () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const startIso = new Date(year, month, 1).toISOString().split("T")[0];
    const endIso = new Date(year, month + 1, 0).toISOString().split("T")[0];

    const workouts = await db.workouts
      .where("date")
      .between(startIso, endIso, true, true)
      .filter((w) => w.is_deleted === 0)
      .toArray();

    const map: Record<string, DayMeta> = {};
    workouts.forEach((w) => {
      map[w.date] = {
        workout: w,
        hasWorkout: w.completed === 1 && w.note !== "REST_DAY",
        isRestDay: w.note === "REST_DAY",
      };
    });
    return map;
  }, [viewDate]);

  useEffect(() => {
    if (workoutData) {
      const dayMeta = workoutData[selectedDateStr];
      setActiveWorkout(dayMeta?.workout ?? null);
    }
  }, [workoutData, selectedDateStr]);

  const { workoutCount, restCount, missedCount } = useMemo(() => {
    let workouts = 0;
    let rests = 0;
    let missed = 0;

    if (!workoutData) return { workoutCount: 0, restCount: 0, missedCount: 0 };

    const todayStr = new Date().toISOString().split("T")[0];
    const startLimitStr = profileCreatedDateStr || todayStr;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const meta = workoutData[dateStr];

      if (meta?.hasWorkout) {
        workouts++;
      } else if (meta?.isRestDay) {
        rests++;
      } else if (dateStr < todayStr && dateStr >= startLimitStr) {
        missed++;
      }
    }

    return { workoutCount: workouts, restCount: rests, missedCount: missed };
  }, [workoutData, viewDate, profileCreatedDateStr]);

  function handleSelectDate(date: string, workout?: LocalWorkout) {
    setSelectedDateStr(date);
    sessionStorage.setItem("history_selected_date", date);
    setActiveWorkout(workout ?? null);
  }

  const isRestDay = activeWorkout?.note === "REST_DAY";
  const hasWorkout = activeWorkout && !isRestDay;

  const defaultRetroStart = "10:00";
  const defaultRetroEnd = "11:00";

  return (
    <div className="w-full flex flex-col gap-0">
      {/* Calendar */}
      <HistoryCalendar
        monthDataMap={workoutData || {}}
        selectedDateStr={selectedDateStr}
        profileCreatedDateStr={profileCreatedDateStr}
        onSelectDate={handleSelectDate}
        onMonthChange={(y, m) => {
          const next = new Date(y, m, 1);
          setViewDate(next);
          sessionStorage.setItem("history_view_date", next.toISOString());
        }}
      />

      {/* Legend & Month Summary Bar */}
      <div
        className="mx-4 mt-4 px-4 py-3 rounded-2xl flex justify-between items-center text-xs font-bold"
        style={{
          backgroundColor: "var(--secondary)",
          border: "1px solid var(--border)",
          fontFamily: "var(--font-inter)",
        }}
      >
        {/* Workout Days */}
        <div className="flex items-center gap-2">
          <div
            className="w-3.5 h-3.5 rounded-md shrink-0"
            style={{ backgroundColor: "var(--primary)" }}
          />
          <span style={{ color: "var(--foreground)" }}>
            Workouts: <span className="font-black text-sm tabular-nums">{workoutCount}</span>
          </span>
        </div>

        {/* Rest Days */}
        <div className="flex items-center gap-2">
          <div
            className="w-3.5 h-3.5 rounded-md shrink-0"
            style={{ backgroundColor: "var(--success)" }}
          />
          <span style={{ color: "var(--foreground)" }}>
            Rests: <span className="font-black text-sm tabular-nums">{restCount}</span>
          </span>
        </div>

        {/* Missed / Non-workout Days */}
        <div className="flex items-center gap-2">
          <div
            className="w-3.5 h-3.5 rounded-md shrink-0"
            style={{ backgroundColor: "#ef4444" }}
          />
          <span style={{ color: "var(--foreground)" }}>
            Missed: <span className="font-black text-sm tabular-nums">{missedCount}</span>
          </span>
        </div>
      </div>

      {/* ── Below-calendar panel ── */}
      <div
        className="mt-5 mb-4 rounded-2xl p-2"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* ── No workout ── */}
        {!activeWorkout && (
          <NoWorkoutState
            dateStr={selectedDateStr}
            onMarkRest={async () => {
              if (userId) {
                await WorkoutService.logRestDay(userId, selectedDateStr);
              }
            }}
            onLogWorkout={() => setShowTimeModal(true)}
          />
        )}

        {/* ── Rest day ── */}
        {isRestDay && <RestDayState dateStr={selectedDateStr} />}

        {/* ── Workout card ── */}
        {hasWorkout && <HistoryDetails workout={activeWorkout} />}
      </div>

      {/* ── Beautiful Glassmorphic Time Selector Modal ── */}
      {showTimeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300"
          style={{
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 overflow-hidden relative"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            }}
          >
            {/* Ambient Background Glow */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 150,
                height: 150,
                borderRadius: "50%",
                background: "color-mix(in srgb, var(--primary) 15%, transparent)",
                filter: "blur(40px)",
                pointerEvents: "none",
              }}
            />

            <h3
              className="text-lg font-black tracking-tight mb-1"
              style={{ letterSpacing: "-0.02em", color: "var(--foreground)" }}
            >
              Set Workout Window
            </h3>
            <p className="text-xs opacity-60 mb-6" style={{ color: "var(--muted-foreground)" }}>
              Specify the start and end times for your retro workout.
            </p>

            <div className="space-y-4 mb-6">
              {/* Start Time Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={retroStartTime}
                  onChange={(e) => setRetroStartTime(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl text-sm font-semibold border focus:outline-none transition-all"
                  style={{
                    background: "var(--secondary)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              {/* End Time Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                  End Time
                </label>
                <input
                  type="time"
                  value={retroEndTime}
                  onChange={(e) => setRetroEndTime(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl text-sm font-semibold border focus:outline-none transition-all"
                  style={{
                    background: "var(--secondary)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowTimeModal(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-xs transition-all active:scale-95 cursor-pointer text-center"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--muted-foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTimeModal(false);
                  navigate(
                    `/workout?mode=retro&date=${selectedDateStr}&startTime=${retroStartTime}&endTime=${retroEndTime}`,
                  );
                }}
                className="flex-1 py-3 rounded-xl font-black text-xs transition-all active:scale-95 uppercase tracking-widest cursor-pointer text-center text-primary-foreground"
                style={{
                  backgroundColor: "var(--primary)",
                  boxShadow: "0 4px 15px color-mix(in srgb, var(--primary) 25%, transparent)",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}