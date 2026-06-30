import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Trash2,
  Pencil,
  Loader2,
  Plus,
  ChevronUp,
  ChevronDown,
  Layers,
  AlertTriangle,
  X,
} from "lucide-react";

import { RoutineService } from "@/services/RoutineService";
import { ExerciseService } from "@/services/ExerciseService";
import { MetricEngine } from "@/sync/MetricEngine";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/db/supabase";
import ExerciseSelectorModal from "@/components/exercises/ExerciseSelectorModal";

interface RoutineEntry extends Tables<"exercises"> {
  sets: number;
  value1: number;
  value2: number;
}

// ── Confirm dialog ─────────────────────────────────────────────────────────
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

// ── Toast ──────────────────────────────────────────────────────────────────
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
        className={`h-2 w-2 rounded-full shrink-0 ${type === "error" ? "bg-destructive" : "bg-success"
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

// ── Empty state ────────────────────────────────────────────────────────────
function EmptySequence({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 flex flex-col items-center gap-3 text-center">
      <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center">
        <Layers
          size={22}
          className="text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">No exercises yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Add movements to build your routine sequence.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="mt-1 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
      >
        <Plus size={14} aria-hidden="true" /> Add exercise
      </button>
    </div>
  );
}

const EMPTY_LIBRARY: Tables<"exercises">[] = [];

// ── Main component ─────────────────────────────────────────────────────────
export default function RoutineForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(!id);
  const [loading, setLoading] = useState(!!id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEntryIndex, setDeleteEntryIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success";
  } | null>(null);

  const [name, setName] = useState("");
  const [sequenceNumber, setSequenceNumber] = useState<number | "">("");
  const [selected, setSelected] = useState<RoutineEntry[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const exerciseLibrary =
    useLiveQuery(() => ExerciseService.listActive()) || EMPTY_LIBRARY;

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Warn browser on navigate-away with unsaved changes
  useEffect(() => {
    if (!isDirty || !isEditing) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, isEditing]);

  // Focus name input on new routine
  useEffect(() => {
    if (!id && isEditing) {
      nameInputRef.current?.focus();
    }
  }, [id, isEditing]);

  const loadExistingRoutine = useCallback(async () => {
    if (!id || exerciseLibrary.length === 0) return;

    const res = await RoutineService.getFullRoutine(id);
    if (res) {
      setName(res.routine.name);
      setSequenceNumber(res.routine.sequence_number ?? "");
      const hydratedEntries = res.exercises.map((mappingRow) => {
        const matchedExercise = exerciseLibrary.find(
          (l) => l.id === mappingRow.exercise_id,
        );
        return {
          ...matchedExercise!,
          sets: mappingRow.sets || 3,
          value1: mappingRow.value1 || 0,
          value2: mappingRow.value2 || 0,
        };
      });
      setSelected(hydratedEntries);
    }
    setLoading(false);
  }, [id, exerciseLibrary]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadExistingRoutine();
  }, [loadExistingRoutine]);

  const markDirty = () => setIsDirty(true);

  const handleExercisesSelected = (chosenMovements: Tables<"exercises">[]) => {
    const freshEntries = chosenMovements.map((ex) => {
      const metricsArr = Array.isArray(ex.metrics) ? ex.metrics : [];
      const hasDuration = metricsArr.includes("duration");
      return {
        ...ex,
        sets: 3,
        value1: hasDuration ? 60 : 10,
        value2: 0,
      };
    });
    setSelected((prev) => [...prev, ...freshEntries]);
    setShowSelector(false);
    markDirty();
  };

  const updateEntryField = (
    index: number,
    key: "sets" | "value1" | "value2",
    numericalValue: number,
  ) => {
    setSelected((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [key]: numericalValue };
      return clone;
    });
    markDirty();
  };

  const shiftSequencePosition = (currentIndex: number, targetIndex: number) => {
    setSelected((prev) => {
      const clone = [...prev];
      [clone[currentIndex], clone[targetIndex]] = [
        clone[targetIndex],
        clone[currentIndex],
      ];
      return clone;
    });
    markDirty();
  };

  const removeEntry = (index: number) => {
    setSelected((prev) => prev.filter((_, i) => i !== index));
    setDeleteEntryIndex(null);
    markDirty();
  };

  const handleSave = async () => {
    if (!name.trim() || selected.length === 0 || !userId) return;
    setIsSubmitting(true);

    const routineId = id || crypto.randomUUID();
    const payload = {
      routine: {
        id: routineId,
        name: name.trim(),
        user_id: userId,
        sequence_number: sequenceNumber === "" ? null : Number(sequenceNumber),
      } as Tables<"routines">,
      exercises: selected.map((ex, i) => ({
        routine_id: routineId,
        exercise_id: ex.id,
        sequence_number: i + 1,
        sets: ex.sets,
        value1: ex.value1,
        value2: ex.value2,
      })) as Tables<"routine_exercises">[],
    };

    try {
      await RoutineService.upsertLocal(payload);
      setIsDirty(false);
      if (id) {
        setIsEditing(false);
        setToast({ message: "Routine saved.", type: "success" });
        await loadExistingRoutine();
      } else {
        navigate("/library");
      }
    } catch {
      setToast({ message: "Couldn't save — please try again.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoutine = async () => {
    if (!id) return;
    await RoutineService.deleteRoutine(id);
    navigate("/library");
  };

  const handleCancelEdit = () => {
    if (id) {
      setIsEditing(false);
      setIsDirty(false);
      loadExistingRoutine();
    } else {
      navigate(-1);
    }
  };

  const canSave = name.trim().length > 0 && selected.length > 0;

  // ── Skeleton loader ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="space-y-4 pb-20"
        aria-busy="true"
        aria-label="Loading routine"
      >
        {[120, 200, 180, 200].map((h, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card animate-pulse"
            style={{ height: h }}
          />
        ))}
      </div>
    );
  }

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

      {/* Delete routine confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this routine?"
        description="This will permanently remove the routine and its exercise sequence. This can't be undone."
        confirmLabel="Yes, delete"
        onConfirm={handleDeleteRoutine}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Delete entry confirmation */}
      <ConfirmDialog
        open={deleteEntryIndex !== null}
        title="Remove this exercise?"
        description="It will be removed from the routine sequence. You can always add it back."
        confirmLabel="Remove"
        onConfirm={() =>
          deleteEntryIndex !== null && removeEntry(deleteEntryIndex)
        }
        onCancel={() => setDeleteEntryIndex(null)}
      />

      <div className="space-y-4 pb-28 select-none">
        {/* ── IDENTITY ────────────────────────────────────────────────── */}
        <section
          className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3"
          aria-label="Routine details"
        >
          <div className="flex items-center gap-2" aria-hidden="true">
            <Layers size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Routine
            </span>
          </div>

          {isEditing ? (
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label
                  htmlFor="routine-name"
                  className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                >
                  Name{" "}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </label>
                <input
                  id="routine-name"
                  ref={nameInputRef}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    markDirty();
                  }}
                  className="w-full bg-transparent text-2xl font-black tracking-tight text-foreground outline-none border-b border-border pb-1 focus:border-primary transition-colors"
                  placeholder="e.g. Upper body strength"
                  autoComplete="off"
                  aria-required="true"
                />
              </div>
              <div className="w-24 space-y-1">
                <label
                  htmlFor="routine-seq"
                  className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                >
                  Seq #
                </label>
                <input
                  id="routine-seq"
                  type="number"
                  value={sequenceNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSequenceNumber(val === "" ? "" : Number(val));
                    markDirty();
                  }}
                  className="w-full bg-transparent text-2xl font-black tracking-tight text-foreground outline-none border-b border-border pb-1 focus:border-primary transition-colors text-center"
                  placeholder="—"
                  min={1}
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-baseline">
              <h1 className="text-2xl font-black tracking-tight text-foreground uppercase italic leading-none">
                {name || "Untitled routine"}
              </h1>
              {sequenceNumber !== "" && (
                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  Seq #{sequenceNumber}
                </span>
              )}
            </div>
          )}

          {/* Exercise count badge in view mode */}
          {!isEditing && selected.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 items-center px-2.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                {selected.length}{" "}
                {selected.length === 1 ? "exercise" : "exercises"}
              </span>
            </div>
          )}
        </section>

        {/* ── SEQUENCE ────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Exercise sequence
            </span>
          </div>

          {/* Empty state */}
          {selected.length === 0 && isEditing && (
            <EmptySequence onAdd={() => setShowSelector(true)} />
          )}

          {/* Entry cards */}
          <div className="space-y-3" role="list" aria-label="Routine exercises">
            {selected.map((ex, index) => {
              const metricLayout = MetricEngine.getLayout(ex.metrics);

              return (
                <div
                  key={`${ex.id}-${index}`}
                  className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
                  role="listitem"
                  aria-label={`Exercise ${index + 1}: ${ex.name}`}
                >
                  {/* Card header */}
                  <div className="px-4 py-3 flex items-center justify-between border-b border-border/60 bg-secondary/30 gap-4">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Sequence number badge */}
                      <span
                        className="shrink-0 h-6 w-6 rounded-lg bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center"
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <Link to={`/library/exercise/${ex.id}`} className="hover:opacity-80 transition-opacity block group">
                          <h3 className="font-black text-sm uppercase tracking-tight truncate text-foreground leading-none group-hover:text-primary transition-colors">
                            {ex.name}
                          </h3>
                          {(ex.variation || ex.equipment) && (
                            <span className="text-[10px] text-primary font-bold mt-0.5 flex items-center gap-1.5">
                              {ex.variation && <span>{ex.variation}</span>}
                              {ex.equipment && <span className="text-success">{ex.equipment}</span>}
                            </span>
                          )}
                        </Link>
                      </div>
                    </div>

                    {isEditing && (
                      <div
                        className="flex items-center gap-1 shrink-0"
                        role="group"
                        aria-label={`Reorder or remove ${ex.name}`}
                      >
                        <button
                          disabled={index === 0}
                          onClick={() =>
                            shiftSequencePosition(index, index - 1)
                          }
                          className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground active:text-primary active:scale-90 transition-all disabled:opacity-20 cursor-pointer"
                          aria-label={`Move ${ex.name} up`}
                          aria-disabled={index === 0}
                        >
                          <ChevronUp size={15} aria-hidden="true" />
                        </button>
                        <button
                          disabled={index === selected.length - 1}
                          onClick={() =>
                            shiftSequencePosition(index, index + 1)
                          }
                          className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground active:text-primary active:scale-90 transition-all disabled:opacity-20 cursor-pointer"
                          aria-label={`Move ${ex.name} down`}
                          aria-disabled={index === selected.length - 1}
                        >
                          <ChevronDown size={15} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => setDeleteEntryIndex(index)}
                          className="w-8 h-8 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive active:scale-90 transition-all ml-1 cursor-pointer"
                          aria-label={`Remove ${ex.name} from routine`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Metric inputs */}
                  <div className="p-4 space-y-2">
                    {/* Column labels */}
                    <div
                      className="flex gap-3 px-1 text-center"
                      aria-hidden="true"
                    >
                      <span className="flex-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                        Sets
                      </span>
                      <span className="flex-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                        {metricLayout.label1}
                      </span>
                      <span className="flex-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                        {metricLayout.label2}
                      </span>
                    </div>

                    <div className="flex gap-3">
                      {/* Sets */}
                      <div className="flex-1">
                        <label htmlFor={`sets-${index}`} className="sr-only">
                          {ex.name} — sets
                        </label>
                        <input
                          id={`sets-${index}`}
                          type="number"
                          inputMode="numeric"
                          disabled={!isEditing}
                          value={ex.sets || ""}
                          min={1}
                          onChange={(e) =>
                            updateEntryField(
                              index,
                              "sets",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-full h-12 rounded-xl bg-secondary border border-border text-center font-black text-sm text-foreground outline-none focus:border-primary/50 disabled:opacity-60 transition-all"
                          placeholder="—"
                        />
                      </div>

                      {/* Value 1 */}
                      <div className="flex-1">
                        <label htmlFor={`val1-${index}`} className="sr-only">
                          {ex.name} — {metricLayout.label1}
                        </label>
                        <input
                          id={`val1-${index}`}
                          type="number"
                          inputMode="numeric"
                          disabled={!isEditing || !metricLayout.hasVal1}
                          value={metricLayout.hasVal1 ? ex.value1 || "" : ""}
                          min={0}
                          onChange={(e) =>
                            updateEntryField(
                              index,
                              "value1",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          placeholder={
                            metricLayout.hasVal1
                              ? metricLayout.val1Placeholder
                              : "—"
                          }
                          className="w-full h-12 rounded-xl bg-secondary border border-border text-center font-black text-sm text-foreground outline-none focus:border-primary/50 disabled:bg-background disabled:border-border/30 disabled:opacity-20 transition-all"
                        />
                      </div>

                      {/* Value 2 */}
                      <div className="flex-1">
                        <label htmlFor={`val2-${index}`} className="sr-only">
                          {ex.name} — {metricLayout.label2}
                        </label>
                        <input
                          id={`val2-${index}`}
                          type="number"
                          inputMode="numeric"
                          disabled={!isEditing || !metricLayout.hasVal2}
                          value={metricLayout.hasVal2 ? ex.value2 || "" : ""}
                          min={0}
                          onChange={(e) =>
                            updateEntryField(
                              index,
                              "value2",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          placeholder={
                            metricLayout.hasVal2
                              ? metricLayout.val2Placeholder
                              : "—"
                          }
                          className="w-full h-12 rounded-xl bg-secondary border border-border text-center font-black text-sm text-foreground outline-none focus:border-primary/50 disabled:bg-background disabled:border-border/30 disabled:opacity-20 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add more button at the bottom of list (convenience) */}
          {isEditing && selected.length > 0 && (
            <button
              onClick={() => setShowSelector(true)}
              className="w-full h-12 rounded-2xl border border-dashed border-border text-muted-foreground text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:bg-secondary transition-all cursor-pointer"
              aria-label="Add another exercise"
            >
              <Plus size={14} aria-hidden="true" /> Add exercise
            </button>
          )}
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <footer
          className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
          aria-label="Form actions"
        >
          <div className="mx-4 mb-4 rounded-2xl border border-border/50 bg-card/90 backdrop-blur-xl p-2.5 flex gap-3 shadow-2xl supports-[not(backdrop-filter:blur(1px))]:bg-card">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-primary/10 cursor-pointer"
                >
                  <Pencil size={15} aria-hidden="true" /> Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 active:scale-90 transition-all cursor-pointer"
                  aria-label="Delete routine"
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={!canSave || isSubmitting}
                  className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                  aria-disabled={!canSave || isSubmitting}
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

      <ExerciseSelectorModal
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        onConfirm={handleExercisesSelected}
        library={exerciseLibrary}
      />
    </>
  );
}
