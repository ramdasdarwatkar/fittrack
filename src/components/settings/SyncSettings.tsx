import React, { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { db, type SyncMetadata } from "@/db";
import { supabase } from "@/lib/supabase";
import { SyncService } from "@/services/SyncService";
import {
  User,
  Activity,
  Dumbbell,
  Target,
  Calendar,
  Clipboard,
  Repeat,
  Award,
  Footprints,
  Zap,
  RefreshCw,
  AlertTriangle,
  Check,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never synced";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Toast Notification ───────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  visible: boolean;
}

function Toast({ message, type, visible }: ToastProps) {
  let bg = "var(--foreground)";
  let fg = "var(--background)";
  if (type === "success") {
    bg = "var(--success)";
    fg = "white";
  } else if (type === "error") {
    bg = "var(--destructive)";
    fg = "white";
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 100,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : 16}px)`,
        opacity: visible ? 1 : 0,
        transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        zIndex: 9999,
        background: bg,
        color: fg,
        borderRadius: 14,
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "-0.01em",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}
    >
      {type === "success" ? (
        <Check size={14} strokeWidth={3} />
      ) : type === "error" ? (
        <AlertTriangle size={14} strokeWidth={2.5} />
      ) : (
        <RefreshCw size={14} strokeWidth={2.5} className="animate-spin" />
      )}
      {message}
    </div>
  );
}

interface SyncEntity {
  key: string;
  supabaseTable: string;
  label: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  accent: string;
  push: () => Promise<void>;
  pull: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbTable: any;
}

const EMPTY_SYNC_METADATA: SyncMetadata[] = [];
interface TableStat {
  key: string;
  total: number;
  dirty: number;
  deleted: number;
}
const EMPTY_STATS: TableStat[] = [];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SyncSettings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeSyncingKey, setActiveSyncingKey] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [selectedTableViewer, setSelectedTableViewer] = useState<SyncEntity | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    type: "info",
    visible: false,
  });
  const [selectedError, setSelectedError] = useState<{
    title: string;
    error: string;
    onRetry: (e?: any) => void;
  } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setUserId(user.id);
    });
  }, []);

  // Fetch db sync metadata to retrieve last pull/sync times
  const syncMetadataList = useLiveQuery(() => db.syncMetadata.toArray()) ?? EMPTY_SYNC_METADATA;
  const metadataMap = useMemo(() => {
    return new Map(
      syncMetadataList.map((m) => [
        m.table_name,
        { last_pulled_at: m.last_pulled_at, last_error: m.last_error },
      ])
    );
  }, [syncMetadataList]);

  // Construct entity lists mapping purely to SyncService wrapper functions
  const entities = [
    {
      key: "userProfiles",
      supabaseTable: "user_profiles" as const,
      label: "User Profiles",
      description: "Preferences and settings",
      icon: User,
      accent: "var(--primary)",
      push: () => SyncService.pushTable("user_profiles"),
      pull: () => SyncService.pullTable("user_profiles"),
      dbTable: db.userProfiles,
    },
    {
      key: "bodyMetrics",
      supabaseTable: "body_metrics" as const,
      label: "Body Metrics",
      description: "Weight, height, and history",
      icon: Activity,
      accent: "var(--success)",
      push: () => SyncService.pushTable("body_metrics"),
      pull: () => SyncService.pullTable("body_metrics"),
      dbTable: db.bodyMetrics,
    },
    {
      key: "exercises",
      supabaseTable: "exercises" as const,
      label: "Exercises Library",
      description: "Custom and built-in exercises",
      icon: Dumbbell,
      accent: "var(--warning)",
      push: () => SyncService.pushTable("exercises"),
      pull: () => SyncService.pullTable("exercises"),
      dbTable: db.exercises,
    },
    {
      key: "goals",
      supabaseTable: "goals" as const,
      label: "Fitness Goals",
      description: "Targets and achievements",
      icon: Target,
      accent: "#a855f7",
      push: () => SyncService.pushTable("goals"),
      pull: () => SyncService.pullTable("goals"),
      dbTable: db.goals,
    },
    {
      key: "routines",
      supabaseTable: "routines" as const,
      label: "Workout Routines",
      description: "Routines and mappings",
      icon: Calendar,
      accent: "#ec4899",
      push: () => SyncService.pushTable("routines"),
      pull: async () => {
        await SyncService.pullTable("routines");
        await SyncService.pullTable("routine_exercises");
      },
      dbTable: db.routines,
    },
    {
      key: "workouts",
      supabaseTable: "workouts" as const,
      label: "Workouts Log",
      description: "Logs of physical sessions",
      icon: Clipboard,
      accent: "#3b82f6",
      push: () => SyncService.pushTable("workouts"),
      pull: () => SyncService.pullTable("workouts"),
      dbTable: db.workouts,
    },
    {
      key: "sets",
      supabaseTable: "sets" as const,
      label: "Workout Sets",
      description: "Main, warmup, and dropsets logs",
      icon: Repeat,
      accent: "#10b981",
      push: () => SyncService.pushTable("sets"),
      pull: () => SyncService.pullTable("sets"),
      dbTable: db.sets,
    },
    {
      key: "personalRecords",
      supabaseTable: "personal_records" as const,
      label: "Personal Records",
      description: "Calculated trophies and PR logs",
      icon: Award,
      accent: "#f59e0b",
      push: () => SyncService.pushTable("personal_records"),
      pull: () => SyncService.pullTable("personal_records"),
      dbTable: db.personalRecords,
    },
    {
      key: "steps",
      supabaseTable: "steps" as const,
      label: "Daily Steps",
      description: "Stepping counts and milestones",
      icon: Footprints,
      accent: "#06b6d4",
      push: () => SyncService.pushTable("steps"),
      pull: () => SyncService.pullTable("steps"),
      dbTable: db.steps,
    },
    {
      key: "xpLog",
      supabaseTable: "xp_log" as const,
      label: "XP & Level Logs",
      description: "Points history logs",
      icon: Zap,
      accent: "#eab308",
      push: () => SyncService.pushTable("xp_log"),
      pull: () => SyncService.pullTable("xp_log"),
      dbTable: db.xpLog,
    },
    {
      key: "exerciseProgressions",
      supabaseTable: "exercise_progression" as const,
      label: "Exercise Progressions",
      description: "Double progression targets",
      icon: Dumbbell,
      accent: "var(--warning)",
      push: () => SyncService.pushTable("exercise_progression"),
      pull: () => SyncService.pullTable("exercise_progression"),
      dbTable: db.exerciseProgressions,
    },
  ];

  // Fetch metrics dynamically inside useLiveQuery to avoid manual refreshes
  const statsList = useLiveQuery(async () => {
    const list = [];
    for (const ent of entities) {
      try {
        const total = await ent.dbTable.count();
        let dirty = 0;
        if (ent.key === "workouts" || ent.key === "sets") {
          dirty = await ent.dbTable
            .filter((row: any) => row.is_dirty === 1 && (row.completed === 1 || row.is_deleted === 1))
            .count();
        } else {
          dirty = await ent.dbTable.where("is_dirty").equals(1).count();
        }
        const deleted = await ent.dbTable.where("is_deleted").equals(1).count();
        list.push({ key: ent.key, total, dirty, deleted });
      } catch {
        list.push({ key: ent.key, total: 0, dirty: 0, deleted: 0 });
      }
    }
    return list;
  }, [userId]) ?? EMPTY_STATS;

  const statsMap = useMemo(() => {
    return new Map(statsList.map((s) => [s.key, s]));
  }, [statsList]);

  // Aggregate global counts
  const globalUnsyncedCount = useMemo(() => {
    return statsList.reduce((acc, curr) => acc + curr.dirty + curr.deleted, 0);
  }, [statsList]);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type, visible: true });
    if (type !== "info") {
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2400);
    }
  };

  const handleSyncIndividual = async (ent: typeof entities[0]) => {
    if (activeSyncingKey || isSyncingAll) return;
    setActiveSyncingKey(ent.key);
    showToast(`Syncing ${ent.label}…`, "info");

    try {
      // 1. Outbound Push via SyncService
      await ent.push();
      // 2. Inbound Pull via SyncService
      await ent.pull();

      showToast(`${ent.label} synced successfully`, "success");
    } catch (error) {
      console.error(`[Sync] Individual sync failure for ${ent.key}:`, error);
      showToast(`Failed to sync ${ent.label}`, "error");
    } finally {
      setActiveSyncingKey(null);
    }
  };

  const handleSyncAll = async () => {
    if (activeSyncingKey || isSyncingAll) return;
    setIsSyncingAll(true);
    showToast("Starting cloud synchronization…", "info");

    try {
      // 1. Outbound push for all tables
      await SyncService.pushAll();

      // 2. Inbound pull for all tables
      await SyncService.pullAll();

      showToast("All data synchronized successfully", "success");
    } catch (error) {
      console.error("[Sync] Batch sync collapsing:", error);
      showToast("Data sync completed with some errors", "error");
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <div
      className="w-full pb-32 select-none"
      style={{
        minHeight: "100dvh",
        background: "var(--background)",
        color: "var(--foreground)",
        fontFamily: "var(--font-inter)",
      }}
    >
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      <div className="px-4 pt-4 space-y-6">
        {/* ── Header snapshot card ── */}
        <div
          className="relative rounded-2xl p-5 overflow-hidden flex flex-col justify-between"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            minHeight: 140,
          }}
        >
          {/* Decorative ambient color orb */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background:
                globalUnsyncedCount > 0
                  ? "color-mix(in srgb, var(--warning) 14%, transparent)"
                  : "color-mix(in srgb, var(--success) 14%, transparent)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />

          <div className="relative z-10">
            <h2
              className="text-[10px] font-black uppercase tracking-[0.16em] mb-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              Cloud Connection
            </h2>
            <h3 className="font-black text-2xl tracking-tight leading-none" style={{ letterSpacing: "-0.03em" }}>
              {globalUnsyncedCount > 0
                ? `${globalUnsyncedCount} Unsynced Changes`
                : "Database Fully Synced"}
            </h3>
            <p className="text-xs mt-2" style={{ color: "var(--muted-foreground)", maxWidth: "80%" }}>
              {globalUnsyncedCount > 0
                ? "You have local updates waiting to be uploaded to Supabase cloud storage."
                : "Your local offline database is fully up to date with cloud servers."}
            </p>
          </div>

          <div className="mt-5 relative z-10">
            <button
              type="button"
              onClick={handleSyncAll}
              disabled={isSyncingAll || !!activeSyncingKey}
              className="w-full h-11 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-40"
              style={{
                background: globalUnsyncedCount > 0 ? "var(--warning)" : "var(--primary)",
                color: globalUnsyncedCount > 0 ? "black" : "var(--primary-foreground)",
                boxShadow: `0 4px 12px color-mix(in srgb, ${globalUnsyncedCount > 0 ? "var(--warning)" : "var(--primary)"} 30%, transparent)`,
              }}
            >
              <RefreshCw
                size={14}
                strokeWidth={2.5}
                className={isSyncingAll ? "animate-spin" : ""}
              />
              {isSyncingAll ? "Synchronizing All…" : "Sync All Tables"}
            </button>
          </div>
        </div>

        {/* ── Table lists ── */}
        <div className="space-y-3">
          <p
            className="text-[10px] font-black uppercase tracking-[0.18em] px-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Offline Tables Status
          </p>

          <div className="space-y-2.5">
            {entities.map((ent) => {
              const Icon = ent.icon;
              const meta = statsMap.get(ent.key) ?? { total: 0, dirty: 0, deleted: 0 };
              const metaObj = metadataMap.get(ent.supabaseTable);
              const lastSynced = metaObj?.last_pulled_at ?? null;
              const lastError = metaObj?.last_error ?? null;
              const hasDirty = meta.dirty > 0 || meta.deleted > 0;
              const isSyncingThis = activeSyncingKey === ent.key;

              return (
                <div
                  key={ent.key}
                  onClick={() => setSelectedTableViewer(ent)}
                  className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.99] hover:bg-secondary/10 cursor-pointer"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Decorative Icon */}
                  <div
                    className="flex items-center justify-center rounded-xl shrink-0"
                    style={{
                      width: 42,
                      height: 42,
                      background: `color-mix(in srgb, ${ent.accent} 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${ent.accent} 24%, transparent)`,
                    }}
                  >
                    <Icon size={18} strokeWidth={2} style={{ color: ent.accent }} />
                  </div>

                  {/* Info details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <p
                        className="font-bold text-sm leading-none"
                        style={{ color: "var(--foreground)", letterSpacing: "-0.01em" }}
                      >
                        {ent.label}
                      </p>

                      {/* Dirty updates badge indicator */}
                      {hasDirty && (
                        <span
                          className="inline-flex items-center text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
                          style={{
                            background: "color-mix(in srgb, var(--warning) 12%, transparent)",
                            color: "var(--warning)",
                            border: "1.5px solid color-mix(in srgb, var(--warning) 24%, transparent)",
                          }}
                        >
                          {meta.dirty + meta.deleted} pending
                        </span>
                      )}

                      {/* Error details button */}
                      {lastError && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedError({
                              title: `${ent.label} Sync Failed`,
                              error: lastError,
                              onRetry: () => handleSyncIndividual(ent)
                            });
                          }}
                          className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full hover:scale-105 active:scale-95 transition-all border shrink-0 cursor-pointer"
                          style={{
                            background: "color-mix(in srgb, var(--destructive) 12%, transparent)",
                            color: "var(--destructive)",
                            borderColor: "color-mix(in srgb, var(--destructive) 24%, transparent)",
                          }}
                        >
                          <AlertTriangle size={10} strokeWidth={2.5} />
                          View Error
                        </button>
                      )}
                    </div>

                    {/* Metadata counts */}
                    <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      <span>
                        Total: <strong style={{ color: "var(--foreground)" }}>{meta.total}</strong>
                      </span>
                      {meta.deleted > 0 && (
                        <span style={{ color: "var(--destructive)" }}>
                          Deleted: <strong>{meta.deleted}</strong>
                        </span>
                      )}
                      <span className="opacity-40">·</span>
                      <span className="truncate">{timeAgo(lastSynced)}</span>
                    </div>
                  </div>

                  {/* Sync Trigger button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSyncIndividual(ent);
                    }}
                    disabled={isSyncingAll || !!activeSyncingKey}
                    className="flex items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-30 cursor-pointer shrink-0 border"
                    style={{
                      width: 36,
                      height: 36,
                      background: "var(--secondary)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                    aria-label={`Sync ${ent.label}`}
                  >
                    <RefreshCw
                      size={14}
                      strokeWidth={2.5}
                      className={isSyncingThis ? "animate-spin text-primary" : ""}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedTableViewer && (
          <TableViewerDrawer
            ent={selectedTableViewer}
            onClose={() => setSelectedTableViewer(null)}
            setSelectedError={setSelectedError}
            showToast={showToast}
          />
        )}
        {selectedError && (
          <ErrorModal
            title={selectedError.title}
            error={selectedError.error}
            onClose={() => setSelectedError(null)}
            onRetry={selectedError.onRetry}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Error Details Popup Modal ───────────────────────────────────────────────

interface ErrorModalProps {
  title: string;
  error: string;
  onClose: () => void;
  onRetry: () => void;
}

function ErrorModal({ title, error, onClose, onRetry }: ErrorModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(error);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy error to clipboard:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="relative w-full max-w-sm bg-card border border-border rounded-[2rem] p-6 shadow-2xl overflow-hidden"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Glow decoration */}
        <div
          aria-hidden
          className="absolute -top-24 -left-24 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: "color-mix(in srgb, var(--destructive) 15%, transparent)",
            filter: "blur(40px)",
          }}
        />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-destructive/15 text-destructive shrink-0">
              <AlertTriangle size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-md tracking-tight leading-none text-foreground">
                {title}
              </h3>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                Sync Failure Reason
              </p>
            </div>
          </div>

          <div
            className="rounded-xl border p-3.5 max-h-[160px] overflow-y-auto text-left"
            style={{
              borderColor: "var(--border)",
              background: "var(--secondary)",
            }}
          >
            <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed select-text">
              {error}
            </pre>
          </div>

          <div className="flex gap-2 mt-1">
            <button
              onClick={handleCopy}
              className="flex-1 h-9 rounded-xl border border-border flex items-center justify-center gap-1.5 font-bold text-[10px] uppercase tracking-wider bg-secondary text-foreground hover:bg-muted/30 active:scale-[0.98] transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={11} strokeWidth={3} className="text-success" />
                  <span>Copied!</span>
                </>
              ) : (
                <span>Copy Error</span>
              )}
            </button>
            <button
              onClick={() => {
                onRetry();
                onClose();
              }}
              className="flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            >
              <RefreshCw size={10} strokeWidth={2.5} />
              <span>Retry Sync</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full h-9 rounded-xl border border-border flex items-center justify-center font-bold text-[10px] uppercase tracking-wider bg-transparent text-muted-foreground hover:bg-secondary/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Local Table Viewer Drawer ───────────────────────────────────────────────

const EMPTY_ROWS: unknown[] = [];

interface TableViewerDrawerProps {
  ent: SyncEntity;
  onClose: () => void;
  setSelectedError: React.Dispatch<React.SetStateAction<{ title: string; error: string; onRetry: (e?: any) => void } | null>>;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

function TableViewerDrawer({ ent, onClose, setSelectedError, showToast }: TableViewerDrawerProps) {
  const [syncFilter, setSyncFilter] = useState<"all" | "pending" | "synced">("all");
  const [searchColumn, setSearchColumn] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isRowSyncingMap, setIsRowSyncingMap] = useState<Record<string, boolean>>({});
  const [rowErrorMap, setRowErrorMap] = useState<Record<string, string | null>>({});

  const rawRows = useLiveQuery(async () => {
    return await ent.dbTable.toArray();
  }, [ent.key]) ?? EMPTY_ROWS;

  const columns = useMemo(() => {
    if (rawRows.length === 0) return [];
    return Object.keys(rawRows[0] as object).filter(
      (k) => k !== "is_dirty" && k !== "is_deleted"
    );
  }, [rawRows]);

  const filteredRows = useMemo(() => {
    return rawRows.filter((row: any) => {
      // Don't show logical deletes that are already synced (since they're basically gone from cache)
      if (row.is_deleted === 1 && row.is_dirty === 0) return false;

      // 1. Sync Filter
      const isDirty = row.is_dirty === 1;
      if (syncFilter === "pending" && !isDirty) return false;
      if (syncFilter === "synced" && isDirty) return false;

      // 2. Search Value Filter
      if (searchValue.trim()) {
        const query = searchValue.toLowerCase();
        if (searchColumn) {
          const val = row[searchColumn];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(query);
        } else {
          return Object.values(row).some(
            (val) => val !== undefined && val !== null && String(val).toLowerCase().includes(query)
          );
        }
      }
      return true;
    });
  }, [rawRows, syncFilter, searchColumn, searchValue]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getRowSummary = (row: any): string => {
    switch (ent.key) {
      case "userProfiles":
        return `User: ${row.name || row.user_id} (${row.gender})`;
      case "bodyMetrics":
        return `${row.date}: ${row.weight} kg / ${row.height} cm`;
      case "exercises":
        return `${row.name} (${row.variation || "Main"})`;
      case "goals":
        return `${row.name} (Target: ${row.target})`;
      case "routines":
        return `Routine: ${row.name}`;
      case "workouts":
        return `${row.date}: ${row.note || "Workout"} (${Math.round((row.duration_sec || 0)/60)}m)`;
      case "sets":
        return `Set: ${row.set_number} (${row.set_type}) - reps: ${row.reps ?? 0}, weight: ${row.weight ?? 0}`;
      case "personalRecords":
        return `${row.prtype?.toUpperCase()}: ${row.value} (PR logged on ${row.created_at?.split("T")[0] || ""})`;
      case "steps":
        return `${row.date}: ${row.steps?.toLocaleString() ?? 0} steps / ${row.water ?? 0} ml`;
      case "xpLog":
        return `${row.date}: +${row.delta} XP - ${row.reason}`;
      default:
        return row.id || row.user_id || "Record Item";
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getRowKey = (row: any, idx: number): string => {
    if (row.id) return String(row.id);
    if (row.user_id && row.date) return `${row.user_id}-${row.date}`;
    if (row.routine_id && row.exercise_id) return `${row.routine_id}-${row.exercise_id}`;
    return String(idx);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getRowDbKey = (row: any): any => {
    if (ent.key === "bodyMetrics") return [row.user_id, row.date];
    if (ent.key === "steps") return [row.user_id, row.date];
    if (ent.key === "exerciseProgressions") return [row.exercise_id, row.user_id];
    if (ent.key === "routineExercises") return [row.routine_id, row.exercise_id];
    return row.id || row.user_id;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleForceSyncRow = async (e: React.MouseEvent, row: any, idx: number) => {
    e.stopPropagation();
    const rowKey = getRowKey(row, idx);
    const dbKey = getRowDbKey(row);
    setIsRowSyncingMap((prev) => ({ ...prev, [rowKey]: true }));
    setRowErrorMap((prev) => ({ ...prev, [rowKey]: null }));

    try {
      const rowData = await ent.dbTable.get(dbKey);
      if (rowData) {
        rowData.is_dirty = 1;
        await ent.dbTable.put(rowData);
      }
      await ent.push();
      showToast("Record synced successfully", "success");
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || String(err);
      setRowErrorMap((prev) => ({ ...prev, [rowKey]: msg }));
      showToast(`Sync failed: ${msg}`, "error");
    } finally {
      setIsRowSyncingMap((prev) => ({ ...prev, [rowKey]: false }));
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDeleteRow = async (e: React.MouseEvent, row: any) => {
    e.stopPropagation();
    const dbKey = getRowDbKey(row);
    try {
      await ent.dbTable.delete(dbKey);
      showToast("Record deleted from local cache", "success");
    } catch (err: any) {
      console.error(err);
      showToast(`Delete failed: ${err.message || err}`, "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Drawer Container */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        className="relative w-full max-w-lg h-full bg-card border-l border-border flex flex-col shadow-2xl z-10"
      >
        <div className="p-6 pb-4 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-black text-md tracking-tight leading-none text-foreground flex items-center gap-1.5 uppercase animate-fade-in">
                {ent.label} Records
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Sync Status Filter Tabs */}
          <div className="flex bg-secondary p-1 rounded-xl border border-border">
            {(["all", "pending", "synced"] as const).map((filter) => {
              const isActive = syncFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSyncFilter(filter)}
                  className="flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  style={{
                    background: isActive ? "var(--card)" : "transparent",
                    color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                    boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                    border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                  }}
                >
                  {filter === "all" ? "All" : filter === "pending" ? "Pending" : "Synced"}
                </button>
              );
            })}
          </div>

          {/* Column Search Box */}
          <div className="flex gap-2 items-center">
            <select
              value={searchColumn}
              onChange={(e) => setSearchColumn(e.target.value)}
              className="bg-secondary border border-border rounded-xl text-[10px] font-bold px-2.5 h-10 select-none outline-none text-foreground cursor-pointer"
              style={{ minWidth: 100 }}
            >
              <option value="">All Fields</option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
            <div className="flex-1 bg-secondary border border-border rounded-xl h-10 flex items-center px-3 gap-2">
              <Search size={14} className="text-muted-foreground opacity-55" />
              <input
                placeholder="Search values..."
                className="flex-1 text-[11px] font-bold bg-transparent outline-none placeholder:text-muted-foreground/35 text-foreground"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              {searchValue && (
                <X
                  size={12}
                  className="text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => setSearchValue("")}
                />
              )}
            </div>
          </div>
        </div>

        {/* Records list */}
        <div className="flex-1 overflow-y-auto px-6 pb-24 touch-pan-y no-scrollbar">
          <div className="space-y-2.5">
            {filteredRows.map((
              row: any,
              idx: number
            ) => {
              const rowKey = getRowKey(row, idx);
              const isExpanded = expandedRowId === rowKey;
              const isDirty = row.is_dirty === 1;
              const isDeleted = row.is_deleted === 1;
              const rowError = rowErrorMap[rowKey];

              return (
                <div
                  key={rowKey}
                  className="rounded-2xl border transition-all overflow-hidden bg-card"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div
                    onClick={() => setExpandedRowId(isExpanded ? null : rowKey)}
                    className="flex justify-between items-center p-4 cursor-pointer hover:bg-secondary/20 transition-all gap-2"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs text-foreground uppercase tracking-tight break-all">
                        {getRowSummary(row)}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 text-[8px] font-black uppercase tracking-wider text-muted-foreground">
                        {isDeleted ? (
                          <span className="text-destructive">Pending Deletion</span>
                        ) : isDirty ? (
                          <span className="text-warning">Pending Sync</span>
                        ) : (
                          <span className="text-success">Synced</span>
                        )}
                        <span>·</span>
                        <span>Updated: {row.updated_at ? row.updated_at.split("T")[0] : "Local Only"}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteRow(e, row)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center transition-all active:scale-[0.93] hover:bg-destructive/15 text-muted-foreground hover:text-destructive border border-border cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 size={11} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleForceSyncRow(e, row, idx)}
                        disabled={isRowSyncingMap[rowKey]}
                        className="h-7 px-2.5 rounded-lg flex items-center gap-1 text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                        style={{
                          background: isDirty || isDeleted ? "var(--warning)" : "var(--primary)",
                          color: isDirty || isDeleted ? "black" : "var(--primary-foreground)",
                          boxShadow: isDirty || isDeleted
                            ? "0 2px 8px color-mix(in srgb, var(--warning) 25%, transparent)"
                            : "0 2px 8px color-mix(in srgb, var(--primary) 25%, transparent)",
                        }}
                      >
                        <RefreshCw
                          size={9}
                          strokeWidth={3}
                          className={isRowSyncingMap[rowKey] ? "animate-spin" : ""}
                        />
                        <span>
                          {isRowSyncingMap[rowKey]
                            ? "Syncing…"
                            : isDirty || isDeleted
                            ? "Sync Now"
                            : "Force Sync"}
                        </span>
                      </button>
                      
                      <div className="text-muted-foreground">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      className="px-4 pb-4 border-t space-y-3"
                      style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
                    >
                      <pre className="text-[9px] font-mono pt-3 overflow-x-auto text-muted-foreground whitespace-pre-wrap leading-relaxed select-text">
                        {JSON.stringify(row, null, 2)}
                      </pre>

                      {rowError && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedError({
                              title: "Record Sync Failed",
                              error: rowError,
                              onRetry: () => handleForceSyncRow(e as any, row, idx)
                            });
                          }}
                          className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-bold tracking-wider leading-relaxed cursor-pointer hover:bg-destructive/15 transition-all"
                        >
                          SYNC ERROR: {rowError} (Click to expand detail)
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={(e) => handleForceSyncRow(e, row, idx)}
                          disabled={isRowSyncingMap[rowKey]}
                          className="h-8 px-3.5 rounded-lg flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider bg-primary text-primary-foreground transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                          style={{
                            boxShadow: "0 2px 8px color-mix(in srgb, var(--primary) 25%, transparent)",
                          }}
                        >
                          <RefreshCw
                            size={10}
                            strokeWidth={3}
                            className={isRowSyncingMap[rowKey] ? "animate-spin" : ""}
                          />
                          <span>
                            {isRowSyncingMap[rowKey]
                              ? "Syncing Record…"
                              : isDirty || isDeleted
                              ? "Retry Sync Record"
                              : "Force Sync Record"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredRows.length === 0 && (
              <div className="py-20 text-center text-muted-foreground opacity-40 flex flex-col items-center justify-center">
                <Zap size={32} className="mb-2 text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  No matching records stored locally
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
