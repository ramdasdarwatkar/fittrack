import { useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type LocalWorkout, type LocalSet, type LocalExercise } from "@/db";
import { MuscleGroupService } from "@/services/StaticReferenceService";

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricType =
  | "weight_reps"
  | "time_distance"
  | "time_only"
  | "distance_only";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(sec?: number | null): string {
  if (!sec) return "0m";
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDateTime(dateStr: string, startTime: string): string {
  const d = new Date(dateStr);
  const t = new Date(startTime);
  const hours = t.getHours();
  const mins = t.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}, ${h12}:${mins} ${ampm}`;
}

function formatTime(sec?: number | null): string {
  if (sec == null) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDistance(meters?: number | null): string {
  if (meters == null) return "-";
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${meters} m`;
}

function getMetricType(metrics: unknown): MetricType {
  if (!metrics || typeof metrics !== "object") return "weight_reps";
  const m = metrics as Record<string, unknown>;
  const hasDuration = m.duration === true || m.duration === 1;
  const hasDistance = m.distance === true || m.distance === 1;
  if (hasDuration && hasDistance) return "time_distance";
  if (hasDuration) return "time_only";
  if (hasDistance) return "distance_only";
  return "weight_reps";
}

// ─── Shared style constants ───────────────────────────────────────────────────

const TH: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--muted-foreground)",
  paddingBottom: 8,
};

const TD: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 400,
  color: "var(--foreground)",
  paddingTop: 10,
  paddingBottom: 10,
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
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
  );
}

function DumbbellIcon() {
  return (
    <svg
      width="15"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4v16M18 4v16M3 8h4M17 8h4M3 16h4M17 16h4M7 12h10" />
    </svg>
  );
}

// ─── ExerciseTable ────────────────────────────────────────────────────────────

function getSetDisplayNumber(setNum?: number | null): string {
  if (setNum == null) return "-";
  const parts = String(setNum).split(".");
  if (parts.length > 1) {
    return parts[1]; // Value after the dot notation
  }
  return String(setNum);
}

interface ActiveMetric {
  key: "weight" | "reps" | "distance" | "duration";
  label: string;
  getValue: (s: LocalSet) => string;
}

function ExerciseTable({
  exerciseName,
  sets,
}: {
  exerciseName: string;
  sets: LocalSet[];
}) {
  const activeMetrics: ActiveMetric[] = [];

  const hasWeight = sets.some((s) => s.weight != null);
  const hasReps = sets.some((s) => s.reps != null);
  const hasDistance = sets.some((s) => s.distance_meters != null);
  const hasDuration = sets.some((s) => s.duration_sec != null);

  if (hasReps) {
    activeMetrics.push({
      key: "reps",
      label: "Reps",
      getValue: (s) => s.reps != null ? String(s.reps) : "- -",
    });
  }
  if (hasWeight) {
    activeMetrics.push({
      key: "weight",
      label: "Weight",
      getValue: (s) => s.weight != null ? `${s.weight} kg` : "- -",
    });
  }
  if (hasDistance) {
    activeMetrics.push({
      key: "distance",
      label: "Distance",
      getValue: (s) => s.distance_meters != null ? formatDistance(s.distance_meters) : "- -",
    });
  }
  if (hasDuration) {
    activeMetrics.push({
      key: "duration",
      label: "Time",
      getValue: (s) => s.duration_sec != null ? formatTime(s.duration_sec) : "- -",
    });
  }

  // Fallback if none are found
  if (activeMetrics.length === 0) {
    activeMetrics.push({
      key: "reps",
      label: "Reps",
      getValue: () => "- -",
    });
  }

  const metric1 = activeMetrics[0];
  const metric2 = activeMetrics[1] || null;

  return (
    <div style={{ marginBottom: 20 }}>
      <h3
        style={{
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          margin: "0 0 10px 0",
          color: "var(--foreground)",
        }}
      >
        {exerciseName}
      </h3>

      <div
        style={{
          backgroundColor: "var(--secondary)",
          borderRadius: 14,
          overflow: "hidden",
          padding: "0 16px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            borderBottom: "1px solid var(--border)",
            paddingTop: 10,
          }}
        >
          <span style={{ ...TH, textAlign: "center" }}>Set</span>
          <span style={{ ...TH, textAlign: "center" }}>{metric1.label}</span>
          <span style={{ ...TH, textAlign: "center" }}>{metric2 ? metric2.label : "- -"}</span>
        </div>

        {/* Rows */}
        {sets.map((s, i) => (
          <div
            key={s.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              borderBottom:
                i < sets.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <span style={{ ...TD, textAlign: "center" }}>
              {getSetDisplayNumber(s.set_number)}
            </span>
            <span style={{ ...TD, textAlign: "center" }}>
              {metric1.getValue(s)}
            </span>
            <span style={{ ...TD, textAlign: "center" }}>
              {metric2 ? metric2.getValue(s) : "- -"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── WorkoutDetailPage ────────────────────────────────────────────────────────

/**
 * Full workout detail page.
 *
 * Route: /history/:id  (child of SubPageLayout which provides the nav bar)
 *
 * Add to your router under the /history SubPageLayout children:
 *   {
 *     path: ":id",
 *     element: <WorkoutDetailPage />,
 *     handle: { title: "Workout Details" },
 *   }
 *
 * Data strategy:
 *   1. Reads workout from location.state (passed instantly by HistoryDetails card tap)
 *   2. Falls back to db.workouts.get(id) for direct URL / page refresh
 */
export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  useEffect(() => {
    sessionStorage.setItem("history_came_from_details", "true");
  }, []);

  // Fast path — workout already in router state from card tap
  const workoutFromState =
    (location.state as { workout?: LocalWorkout } | null)?.workout ?? null;

  // Fallback — direct URL access or page refresh
  const workoutFromDb = useLiveQuery(async () => {
    if (workoutFromState || !id) return null;
    return (await db.workouts.get(id)) ?? null;
  }, [id, workoutFromState]);

  const workout: LocalWorkout | null =
    workoutFromState ?? workoutFromDb ?? null;

  const sets = useLiveQuery(async () => {
    if (!workout?.id) return null;
    const rawSets = await db.sets
      .where("workout_id")
      .equals(workout.id)
      .filter((s) => s.is_deleted === 0)
      .toArray();
    return rawSets.sort((a, b) => Number(a.set_number) - Number(b.set_number));
  }, [workout?.id]);

  const exerciseMap = useLiveQuery(async () => {
    if (!sets?.length) return {};
    const ids = [...new Set(sets.map((s) => s.exercise_id))];
    const exs = await db.exercises.where("id").anyOf(ids).toArray();
    return Object.fromEntries(exs.map((e) => [e.id, e])) as Record<
      string,
      LocalExercise
    >;
  }, [sets]);

  const muscleGroupMap = useLiveQuery(async () => {
    if (!exerciseMap || !Object.keys(exerciseMap).length) return {};
    const mgIds = [
      ...new Set(Object.values(exerciseMap).map((e) => e.muscle_group_id)),
    ];
    const mgs = await Promise.all(
      mgIds.map((id) => MuscleGroupService.getOne(id)),
    );
    const map: Record<number, string> = {};
    mgs.forEach((mg) => {
      if (mg) map[mg.id] = mg.name;
    });
    return map;
  }, [exerciseMap]);

  // ── Loading ──
  if (!workout || !sets || !exerciseMap || !muscleGroupMap) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          color: "var(--muted-foreground)",
          fontSize: 14,
          fontFamily: "var(--font-inter)",
        }}
      >
        Loading…
      </div>
    );
  }

  // ── Derived data ──

  const grouped = sets.reduce<Record<string, LocalSet[]>>((acc, s) => {
    (acc[s.exercise_id] ??= []).push(s);
    return acc;
  }, {});

  const totalVolume = sets.reduce(
    (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 1),
    0,
  );

  type MuscleStats = { sets: number; volume: number };
  const muscleStats: Record<string, MuscleStats> = {};
  for (const [exId, exSets] of Object.entries(grouped)) {
    const ex = exerciseMap[exId];
    if (!ex) continue;
    const mgName = muscleGroupMap[ex.muscle_group_id] ?? "Other";
    const vol = exSets.reduce(
      (s, set) => s + (set.weight ?? 0) * (set.reps ?? 1),
      0,
    );
    if (!muscleStats[mgName]) muscleStats[mgName] = { sets: 0, volume: 0 };
    muscleStats[mgName].sets += exSets.length;
    muscleStats[mgName].volume += vol;
  }
  const sortedMuscles = Object.entries(muscleStats).sort(
    (a, b) => b[1].volume - a[1].volume,
  );

  const workoutName = (workout as any).name ?? "Workout";

  // ── Render ──
  // Note: No nav bar here — SubPageLayout renders the back button + title from handle.title

  return (
    <div
      style={{
        fontFamily: "var(--font-inter)",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 80px)",
      }}
    >
      <div>
        {/* Summary header card */}
        <div
          style={{
            backgroundColor: "var(--secondary)",
            borderRadius: 16,
            padding: "20px 16px 18px",
            marginBottom: 24,
          }}
        >
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              margin: "0 0 4px 0",
              lineHeight: 1.1,
            }}
          >
            {workoutName}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--muted-foreground)",
              margin: "0 0 10px 0",
              fontWeight: 400,
            }}
          >
            {formatDateTime(workout.date, workout.start_time)}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "var(--muted-foreground)",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <ClockIcon />
              {formatDuration(workout.duration_sec)}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <DumbbellIcon />
              {totalVolume.toLocaleString()} kg
            </span>
          </div>
        </div>

        {/* Exercise tables */}
        {Object.entries(grouped)
          .sort((a, b) => {
            const minA = Number(a[1][0]?.set_number ?? 0);
            const minB = Number(b[1][0]?.set_number ?? 0);
            return minA - minB;
          })
          .map(([exId, exSets]) => {
            const ex = exerciseMap[exId];
            const sorted = [...exSets].sort(
              (a, b) => Number(a.set_number ?? 0) - Number(b.set_number ?? 0),
            );
            return (
              <ExerciseTable
                key={exId}
                exerciseName={ex?.name ?? exId}
                sets={sorted}
              />
            );
          })}

        {/* Volume per muscle group */}
        {sortedMuscles.length > 0 && (
          <div style={{ marginTop: 8, marginBottom: 24 }}>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                margin: "0 0 10px 0",
              }}
            >
              Volume Per Muscle Group
            </h3>
            <div
              style={{
                backgroundColor: "var(--secondary)",
                borderRadius: 14,
                overflow: "hidden",
                padding: "0 16px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  borderBottom: "1px solid var(--border)",
                  paddingTop: 10,
                  paddingBottom: 8,
                }}
              >
                <span style={{ ...TH, textAlign: "center" }}>Muscle Group</span>
                <span style={{ ...TH, textAlign: "center" }}>Sets</span>
                <span style={{ ...TH, textAlign: "center" }}>Volume</span>
              </div>

              {sortedMuscles.map(([mgName, stats], i) => (
                <div
                  key={mgName}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    borderBottom:
                      i < sortedMuscles.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >
                  <span style={{ ...TD, textAlign: "center" }}>{mgName}</span>
                  <span style={{ ...TD, textAlign: "center" }}>
                    {stats.sets}
                  </span>
                  <span style={{ ...TD, textAlign: "center" }}>
                    {stats.volume > 0
                      ? `${stats.volume.toLocaleString()} kg`
                      : "-"}
                  </span>
                </div>
              ))}
            </div>

            <p
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              *Volume estimates are based on the target muscle groups of
              performed exercises.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
