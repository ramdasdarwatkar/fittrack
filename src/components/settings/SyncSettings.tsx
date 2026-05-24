import React, { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function SyncSettings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeSyncingKey, setActiveSyncingKey] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    type: "info",
    visible: false,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setUserId(user.id);
    });
  }, []);

  // Fetch db sync metadata to retrieve last pull/sync times
  const syncMetadataList = useLiveQuery(() => db.syncMetadata.toArray()) ?? [];
  const metadataMap = useMemo(() => {
    return new Map(syncMetadataList.map((m) => [m.table_name, m.last_pulled_at]));
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
  ];

  // Fetch metrics dynamically inside useLiveQuery to avoid manual refreshes
  const statsList = useLiveQuery(async () => {
    const list = [];
    for (const ent of entities) {
      try {
        const total = await ent.dbTable.count();
        const dirty = await ent.dbTable.where("is_dirty").equals(1).count();
        const deleted = await ent.dbTable.where("is_deleted").equals(1).count();
        list.push({ key: ent.key, total, dirty, deleted });
      } catch (err) {
        list.push({ key: ent.key, total: 0, dirty: 0, deleted: 0 });
      }
    }
    return list;
  }, [userId]) ?? [];

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
              const lastSynced = metadataMap.get(ent.supabaseTable) ?? null;
              const hasDirty = meta.dirty > 0 || meta.deleted > 0;
              const isSyncingThis = activeSyncingKey === ent.key;

              return (
                <div
                  key={ent.key}
                  className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all"
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
                    onClick={() => handleSyncIndividual(ent)}
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
    </div>
  );
}
