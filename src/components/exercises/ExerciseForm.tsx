import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Trash2,
  Check,
  Pencil,
  Loader2,
  Clock,
  Globe,
  Lock,
  Activity,
  Dumbbell,
  AlertTriangle,
  X,
} from "lucide-react";

import { ExerciseService } from "@/services/ExerciseService";
import { db } from "@/db";
import {
  MuscleGroupService,
  MuscleService,
} from "@/services/StaticReferenceService";
import { EQUIPMENT_LIST } from "@/constants/Equpiment";
import { supabase } from "@/lib/supabase";

const METRIC_OPTIONS = [
  { key: "reps", label: "Reps", description: "Count per set" },
  { key: "weight", label: "Weight", description: "Load in kg / lbs" },
  { key: "distance", label: "Distance", description: "Metres or km" },
  { key: "duration", label: "Duration", description: "Time per set" },
] as const;

const REST_PRESETS = [
  { label: "None", value: 0 },
  { label: "30s", value: 30 },
  { label: "60s", value: 60 },
  { label: "90s", value: 90 },
  { label: "2 min", value: 120 },
  { label: "3 min", value: 180 },
];

function formatRest(seconds: number): string {
  if (seconds === 0) return "No rest";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m}m ${s}s`;
}

// ── Confirm dialog (replaces window.confirm) ─────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      className="fixed inset-0 z-50 flex items-end justify-center pb-6 px-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 space-y-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle
              size={16}
              className="text-destructive"
              aria-hidden="true"
            />
          </div>
          <div>
            <p id="confirm-title" className="text-sm font-bold text-foreground">
              {title}
            </p>
            <p
              id="confirm-desc"
              className="text-sm text-muted-foreground mt-0.5 leading-relaxed"
            >
              {description}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl bg-secondary text-foreground text-xs font-bold uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
          >
            Keep it
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast notification ────────────────────────────────────────────────────────
interface ToastProps {
  message: string;
  type?: "error" | "success";
  onDismiss: () => void;
}
function Toast({ message, type = "error", onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-4 inset-x-4 z-50 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-2xl"
    >
      <div
        className={`h-2 w-2 rounded-full shrink-0 ${
          type === "error" ? "bg-destructive" : "bg-success"
        }`}
        aria-hidden="true"
      />
      <p className="text-sm text-foreground flex-1">{message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-muted-foreground active:opacity-50 cursor-pointer"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function ExerciseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(!id);
  const [isLoading, setIsLoading] = useState(!!id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success";
  } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isOwnedByUser, setIsOwnedByUser] = useState(true);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    muscle_group_id: 0,
    muscle_id: null as number | null,
    equipment: "",
    variation: "",
    rest_seconds: 60,
    metrics: [] as string[],
    is_public: false,
    min_reps: 0,
    max_reps: 0,
    target_weight: null as number | null,
    progress_weight: 2.5,
  });

  // Functional updater so closures never stale
  const updateForm = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Warn on browser back when dirty
  useEffect(() => {
    if (!isDirty || !isEditing) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, isEditing]);

  // Focus name input when entering edit mode on new exercise
  useEffect(() => {
    if (!id && isEditing) {
      nameInputRef.current?.focus();
    }
  }, [id, isEditing]);

  const muscleGroups = useLiveQuery(() => MuscleGroupService.getAll()) || [];
  const muscles =
    useLiveQuery(
      () =>
        form.muscle_group_id
          ? MuscleService.getByGroup(form.muscle_group_id)
          : [],
      [form.muscle_group_id],
    ) || [];

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    ExerciseService.get(id)
      .then(async (ex) => {
        if (ex) {
          if (userId) {
            setIsOwnedByUser(ex.user_id === userId);
          }
          let minReps = 0;
          let maxReps = 0;
          let targetWeight: number | null = null;
          let progressWeight = 2.5;
          if (userId) {
            const prog = await db.exerciseProgressions.get([id, userId]);
            if (prog) {
              minReps = prog.min_reps;
              maxReps = prog.max_reps;
              targetWeight = prog.target_weight;
              progressWeight = prog.progress_weight ?? 2.5;
            }
          }
          setForm({
            name: ex.name,
            muscle_group_id: ex.muscle_group_id,
            muscle_id: ex.muscle_id ?? null,
            equipment: ex.equipment || "",
            variation: ex.variation || "",
            rest_seconds: ex.rest_seconds || 60,
            metrics: (ex.metrics as string[]) || [],
            is_public: !!ex.is_public,
            min_reps: minReps,
            max_reps: maxReps,
            target_weight: targetWeight,
            progress_weight: progressWeight,
          });
        }
      })
      .finally(() => setIsLoading(false));
  }, [id, userId]);

  const handleSave = async () => {
    if (!form.name.trim() || !userId || !form.muscle_group_id) return;
    setIsSubmitting(true);

    const exerciseId = id || crypto.randomUUID();
    const payload = {
      id: exerciseId,
      user_id: userId,
      name: form.name.trim(),
      muscle_group_id: form.muscle_group_id,
      muscle_id: form.muscle_id,
      equipment: form.equipment || null,
      variation: form.variation || null,
      rest_seconds: form.rest_seconds,
      metrics: form.metrics,
      is_public: form.is_public,
    };

    try {
      if (isOwnedByUser) {
        await ExerciseService.upsertLocal(payload);
      }

      const hasRepsAndWeight = form.metrics.includes("reps") && form.metrics.includes("weight");
      if (hasRepsAndWeight) {
        await db.exerciseProgressions.put({
          exercise_id: exerciseId,
          user_id: userId,
          min_reps: Number(form.min_reps) || 0,
          max_reps: Number(form.max_reps) || 0,
          target_weight: form.target_weight !== null ? Number(form.target_weight) : null,
          progress_weight: Number(form.progress_weight) || 0,
          is_dirty: 1,
          is_deleted: 0,
        });
      } else {
        await db.exerciseProgressions.delete([exerciseId, userId]);
      }

      setIsDirty(false);
      if (id) {
        setIsEditing(false);
        setToast({ message: "Exercise saved.", type: "success" });
      } else {
        navigate("/library");
      }
    } catch {
      setToast({ message: "Couldn't save — please try again.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await ExerciseService.delete(id);
    navigate("/library");
  };

  const handleCancelEdit = () => {
    if (isDirty) {
      // For editing existing: revert and close edit mode
      // For new: go back
    }
    if (id) {
      setIsEditing(false);
      setIsDirty(false);
      // Re-hydrate from DB to discard in-memory changes
      ExerciseService.get(id).then(async (ex) => {
        if (ex) {
          let minReps = 0;
          let maxReps = 0;
          let targetWeight: number | null = null;
          let progressWeight = 2.5;
          if (userId) {
            const prog = await db.exerciseProgressions.get([id, userId]);
            if (prog) {
              minReps = prog.min_reps;
              maxReps = prog.max_reps;
              targetWeight = prog.target_weight;
              progressWeight = prog.progress_weight ?? 2.5;
            }
          }
          setForm({
            name: ex.name,
            muscle_group_id: ex.muscle_group_id,
            muscle_id: ex.muscle_id ?? null,
            equipment: ex.equipment || "",
            variation: ex.variation || "",
            rest_seconds: ex.rest_seconds || 60,
            metrics: (ex.metrics as string[]) || [],
            is_public: !!ex.is_public,
            min_reps: minReps,
            max_reps: maxReps,
            target_weight: targetWeight,
            progress_weight: progressWeight,
          });
        }
      });
    } else {
      navigate(-1);
    }
  };

  // ── Skeleton loader ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="space-y-4 pb-20"
        aria-busy="true"
        aria-label="Loading exercise"
      >
        {[180, 260, 220, 140].map((h, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-5 animate-pulse"
            style={{ height: h }}
          />
        ))}
      </div>
    );
  }

  const canSave = form.name.trim().length > 0 && !!form.muscle_group_id;

  return (
    <>
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this exercise?"
        description="This will permanently remove the exercise and all associated history. This can't be undone."
        confirmLabel="Yes, delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <div className="space-y-4 pb-28 select-none">
        {/* ── IDENTITY ──────────────────────────────────────────────────── */}
        <section
          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          aria-label="Exercise details"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2" aria-hidden="true">
                <Dumbbell size={14} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Exercise
                </span>
              </div>

              {isEditing && isOwnedByUser ? (
                <div className="space-y-1">
                  <label
                    htmlFor="exercise-name"
                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Name{" "}
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  </label>
                  <input
                    id="exercise-name"
                    ref={nameInputRef}
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="e.g. Dumbbell shoulder press"
                    autoComplete="off"
                    className="w-full bg-transparent text-2xl font-black tracking-tight text-foreground outline-none border-b border-border pb-1 focus:border-primary transition-colors"
                    aria-required="true"
                  />
                </div>
              ) : (
                <h1 className="text-2xl font-black tracking-tight text-foreground uppercase italic leading-none">
                  {form.name}
                </h1>
              )}

              {isEditing && isOwnedByUser ? (
                <div className="space-y-1">
                  <label
                    htmlFor="exercise-variation"
                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Variation{" "}
                    <span className="text-muted-foreground/50 normal-case font-normal">
                      optional
                    </span>
                  </label>
                  <input
                    id="exercise-variation"
                    value={form.variation}
                    onChange={(e) => updateForm("variation", e.target.value)}
                    placeholder="e.g. Seated, paused, tempo"
                    className="w-full h-11 px-4 rounded-xl bg-secondary text-sm font-medium text-foreground border border-border outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              ) : (form.variation || form.equipment) ? (
                <div className="flex items-center gap-2">
                  {form.variation && (
                    <div className="inline-flex h-7 items-center px-3 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                      {form.variation}
                    </div>
                  )}
                  {form.equipment && (
                    <div className="inline-flex h-7 items-center px-3 rounded-lg bg-success/10 text-success text-[10px] font-black uppercase tracking-wider">
                      {form.equipment}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Public toggle */}
            {isEditing && isOwnedByUser ? (
              <button
                onClick={() => updateForm("is_public", !form.is_public)}
                aria-pressed={form.is_public}
                aria-label={
                  form.is_public
                    ? "Visible to everyone — tap to make private"
                    : "Private — tap to make public"
                }
                className={`h-12 w-12 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  form.is_public
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border"
                }`}
              >
                {form.is_public ? (
                  <Globe size={20} aria-hidden="true" />
                ) : (
                  <Lock size={20} aria-hidden="true" />
                )}
              </button>
            ) : (
              <div
                className={`h-8 px-3 rounded-lg border flex items-center gap-1.5 shrink-0 ${
                  form.is_public
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-secondary text-muted-foreground border-border"
                }`}
                aria-label={
                  form.is_public ? "Public exercise" : "Private exercise"
                }
              >
                {form.is_public ? (
                  <Globe size={13} aria-hidden="true" />
                ) : (
                  <Lock size={13} aria-hidden="true" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {form.is_public ? "Public" : "Private"}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── TARGET MUSCLES ───────────────────────────────────────────── */}
        <section
          className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4"
          aria-label="Target muscles"
        >
          <div className="flex items-center gap-2" aria-hidden="true">
            <Activity size={15} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Target muscles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="muscle-group"
                className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
              >
                Muscle group{" "}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </label>
              <select
                id="muscle-group"
                disabled={!isEditing || !isOwnedByUser}
                value={form.muscle_group_id}
                onChange={(e) => {
                  updateForm("muscle_group_id", Number(e.target.value));
                  updateForm("muscle_id", null);
                }}
                className="w-full h-12 px-4 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground outline-none disabled:opacity-50 cursor-pointer focus:border-primary/50 transition-colors"
                aria-required="true"
              >
                <option value={0}>
                  {muscleGroups.length === 0 ? "Loading…" : "Select a group"}
                </option>
                {muscleGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {muscleGroups.length === 0 && (
                <p className="text-[11px] text-muted-foreground" role="status">
                  Muscle groups not loaded — try refreshing.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="specific-muscle"
                className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
              >
                Specific muscle
              </label>
              <select
                id="specific-muscle"
                disabled={!isEditing || !form.muscle_group_id || !isOwnedByUser}
                value={form.muscle_id || ""}
                onChange={(e) =>
                  updateForm(
                    "muscle_id",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="w-full h-12 px-4 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground outline-none disabled:opacity-50 cursor-pointer focus:border-primary/50 transition-colors"
              >
                <option value="">Entire group</option>
                {muscles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="equipment"
              className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
            >
              Equipment
            </label>
            <select
              id="equipment"
              disabled={!isEditing || !isOwnedByUser}
              value={form.equipment}
              onChange={(e) => updateForm("equipment", e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground outline-none disabled:opacity-50 cursor-pointer focus:border-primary/50 transition-colors"
            >
              <option value="">Bodyweight / no equipment</option>
              {EQUIPMENT_LIST.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* ── TRACKING METRICS ─────────────────────────────────────────── */}
        <section
          className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4"
          aria-label="Tracking metrics"
        >
          <div className="flex items-center gap-2" aria-hidden="true">
            <Check size={15} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Track these metrics
            </span>
          </div>

          <div
            className="grid grid-cols-2 gap-3"
            role="group"
            aria-label="Select metrics to track"
          >
            {METRIC_OPTIONS.map(({ key, label, description }) => {
              const active = form.metrics.includes(key);
              return (
                <button
                  key={key}
                  disabled={!isEditing || !isOwnedByUser}
                  onClick={() => {
                    const next = active
                      ? form.metrics.filter((x) => x !== key)
                      : [...form.metrics, key];
                    updateForm("metrics", next);
                  }}
                  aria-pressed={active}
                  aria-label={`${label} — ${description}${active ? ", selected" : ""}`}
                  className={`h-16 rounded-xl border-2 px-4 flex items-center justify-between transition-all cursor-pointer active:scale-[0.98] disabled:cursor-default ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-secondary border-transparent text-muted-foreground disabled:opacity-60"
                  }`}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="text-xs font-black uppercase tracking-wider">
                      {label}
                    </span>
                    <span
                      className={`text-[10px] mt-0.5 ${
                        active
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {description}
                    </span>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      active
                        ? "bg-primary-foreground border-primary-foreground"
                        : "border-border bg-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    {active && (
                      <Check
                        size={11}
                        className="text-primary"
                        strokeWidth={3}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {!isEditing && form.metrics.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-1">
              No metrics selected
            </p>
          )}
        </section>

        {/* ── DOUBLE PROGRESSION ─────────────────────────────────────────── */}
        {form.metrics.includes("reps") && form.metrics.includes("weight") && (
          <section
            className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4"
            aria-label="Double progression target"
          >
            <div className="flex items-center gap-2" aria-hidden="true">
              <Activity size={15} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Double progression target
              </span>
            </div>

            {isEditing ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="min-reps"
                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Min Reps
                  </label>
                  <input
                    id="min-reps"
                    type="number"
                    min="0"
                    value={form.min_reps || ""}
                    onChange={(e) => updateForm("min_reps", parseInt(e.target.value) || 0)}
                    placeholder="e.g. 8"
                    className="w-full h-12 px-4 rounded-xl bg-secondary text-sm font-bold text-foreground border border-border outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="max-reps"
                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Max Reps
                  </label>
                  <input
                    id="max-reps"
                    type="number"
                    min="0"
                    value={form.max_reps || ""}
                    onChange={(e) => updateForm("max_reps", parseInt(e.target.value) || 0)}
                    placeholder="e.g. 12"
                    className="w-full h-12 px-4 rounded-xl bg-secondary text-sm font-bold text-foreground border border-border outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="target-weight"
                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Target Weight
                  </label>
                  <input
                    id="target-weight"
                    type="number"
                    step="any"
                    min="0"
                    value={form.target_weight === null ? "" : form.target_weight}
                    onChange={(e) => updateForm("target_weight", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="e.g. 15"
                    className="w-full h-12 px-4 rounded-xl bg-secondary text-sm font-bold text-foreground border border-border outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="progress-weight"
                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Progress Weight
                  </label>
                  <input
                    id="progress-weight"
                    type="number"
                    step="any"
                    min="0"
                    value={form.progress_weight === "" ? "" : form.progress_weight}
                    onChange={(e) => updateForm("progress_weight", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                    placeholder="e.g. 2.5"
                    className="w-full h-12 px-4 rounded-xl bg-secondary text-sm font-bold text-foreground border border-border outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-medium text-foreground">Target reps range</span>
                  <span className="text-sm font-black text-primary uppercase tracking-tight">
                    {form.min_reps || form.max_reps
                      ? `${form.min_reps} - ${form.max_reps} reps`
                      : "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-medium text-foreground">Target weight</span>
                  <span className="text-sm font-black text-primary uppercase tracking-tight">
                    {form.target_weight !== null ? `${form.target_weight} kg` : "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-medium text-foreground">Progress weight increment</span>
                  <span className="text-sm font-black text-primary uppercase tracking-tight">
                    {form.progress_weight || 0} kg
                  </span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── REST INTERVAL ────────────────────────────────────────────── */}
        <section
          className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4"
          aria-label="Rest interval"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2" aria-hidden="true">
              <Clock size={15} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Rest between sets
              </span>
            </div>
            <div
              className="text-lg font-black text-primary tabular-nums"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatRest(form.rest_seconds)}
            </div>
          </div>

          <input
            type="range"
            id="rest-seconds"
            min="0"
            max="300"
            step="5"
            disabled={!isEditing || !isOwnedByUser}
            value={form.rest_seconds}
            onChange={(e) =>
              updateForm("rest_seconds", parseInt(e.target.value))
            }
            className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer outline-none disabled:opacity-40"
            aria-label="Rest duration"
            aria-valuetext={formatRest(form.rest_seconds)}
            aria-valuemin={0}
            aria-valuemax={300}
            aria-valuenow={form.rest_seconds}
          />

          {/* Quick presets */}
          {isEditing && isOwnedByUser && (
            <div
              className="flex gap-2 flex-wrap"
              role="group"
              aria-label="Rest duration presets"
            >
              {REST_PRESETS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => updateForm("rest_seconds", value)}
                  aria-pressed={form.rest_seconds === value}
                  className={`h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                    form.rest_seconds === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground border border-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <footer
          className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
          aria-label="Form actions"
        >
          <div className="mx-4 mb-4 rounded-2xl border border-border/50 bg-card/90 backdrop-blur-xl p-2.5 flex gap-3 shadow-2xl supports-[not(backdrop-filter:blur(1px))]:bg-card">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-md shadow-primary/10"
                >
                  <Pencil size={15} aria-hidden="true" /> Edit
                </button>
                {isOwnedByUser && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 active:scale-90 transition-all cursor-pointer"
                    aria-label="Delete exercise"
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || !canSave}
                  className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                  aria-disabled={isSubmitting || !canSave}
                >
                  {isSubmitting ? (
                    <Loader2
                      className="animate-spin text-primary-foreground"
                      size={18}
                      aria-hidden="true"
                    />
                  ) : (
                    "Save"
                  )}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-5 h-12 text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center active:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </>
  );
}
