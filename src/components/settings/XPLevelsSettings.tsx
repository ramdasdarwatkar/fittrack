import React, { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import { XpService } from "@/services/XpService";
import {
  Zap,
  Dumbbell,
  Award,
  Moon,
  AlertTriangle,
  Star,
  Sparkles,
  Check,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Ranks Lists ─────────────────────────────────────────────────────────────

const MONTHLY_RANKS = [
  { level: "Rookie", min: 0, max: 50, color: "var(--muted-foreground)" },
  { level: "Starter", min: 51, max: 100, color: "#10b981" },
  { level: "Grinder", min: 101, max: 150, color: "var(--primary)" },
  { level: "Warrior", min: 151, max: 200, color: "#f97316" },
  { level: "Athlete", min: 201, max: 250, color: "#ef4444" },
  { level: "Elite", min: 251, max: 300, color: "#ec4899" },
  { level: "Champion", min: 301, max: Infinity, color: "#eab308" },
];

const LIFETIME_RANKS = [
  { level: "Rookie", min: 0, max: 300, color: "var(--muted-foreground)" },
  { level: "Grinder", min: 301, max: 900, color: "var(--primary)" },
  { level: "Warrior", min: 901, max: 1800, color: "#f97316" },
  { level: "Elite", min: 1801, max: 3000, color: "#ec4899" },
  { level: "Veteran", min: 3001, max: 5000, color: "#06b6d4" },
  { level: "Pro", min: 5001, max: 7500, color: "#10b981" },
  { level: "Champion", min: 7501, max: 10500, color: "#eab308" },
  { level: "Legend", min: 10501, max: 13500, color: "#a855f7" },
  { level: "Mythic", min: 13501, max: 16500, color: "#f43f5e" },
  { level: "Immortal", min: 16501, max: 20000, color: "#ef4444" },
  { level: "G.O.A.T", min: 20001, max: Infinity, color: "#eab308" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function XPLevelsSettings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"monthly" | "lifetime">("monthly");
  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setUserId(user.id);
    });
  }, []);

  // Fetch active user profile
  const profile = useLiveQuery(
    async () => (userId ? db.userProfiles.get(userId) : null),
    [userId]
  );

  // Fetch chronological XP log feed
  const { logs: xpLogs, hasMore } = useLiveQuery(
    async () => {
      if (!userId) return { logs: [], hasMore: false };
      const list = await db.xpLog
        .where("user_id")
        .equals(userId)
        .filter((x) => x.is_deleted === 0)
        .toArray();
      const sorted = list.sort((a, b) => b.date.localeCompare(a.date));
      return {
        logs: sorted.slice(0, visibleCount),
        hasMore: sorted.length > visibleCount,
      };
    },
    [userId, visibleCount]
  ) ?? { logs: [], hasMore: false };

  // Monthly Rank calculations
  const monthlyXp = profile?.current_xp || 0;
  const currentMonthlyLevel = useMemo(
    () => XpService.getMonthlyLevel(monthlyXp),
    [monthlyXp]
  );

  const monthlyProgress = useMemo(() => {
    const min = currentMonthlyLevel.min;
    const max = currentMonthlyLevel.max;
    if (max === Infinity) return 100;
    const range = max - min + 1;
    const progress = monthlyXp - min;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  }, [monthlyXp, currentMonthlyLevel]);

  const monthlyRemaining = useMemo(() => {
    const max = currentMonthlyLevel.max;
    if (max === Infinity) return 0;
    return max - monthlyXp + 1;
  }, [monthlyXp, currentMonthlyLevel]);

  // Lifetime Rank calculations
  const lifetimeXp = profile?.xp || 0;
  const currentLifetimeLevel = useMemo(
    () => XpService.getLifetimeLevel(lifetimeXp),
    [lifetimeXp]
  );

  const lifetimeProgress = useMemo(() => {
    const min = currentLifetimeLevel.min;
    const max = currentLifetimeLevel.max;
    if (max === Infinity) return 100;
    const range = max - min + 1;
    const progress = lifetimeXp - min;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  }, [lifetimeXp, currentLifetimeLevel]);

  const lifetimeRemaining = useMemo(() => {
    const max = currentLifetimeLevel.max;
    if (max === Infinity) return 0;
    return max - lifetimeXp + 1;
  }, [lifetimeXp, currentLifetimeLevel]);

  // Next Monthly/Lifetime level labels
  const nextMonthlyLabel = useMemo(() => {
    const idx = MONTHLY_RANKS.findIndex((r) => r.level === currentMonthlyLevel.level);
    if (idx !== -1 && idx < MONTHLY_RANKS.length - 1) {
      return MONTHLY_RANKS[idx + 1].level;
    }
    return null;
  }, [currentMonthlyLevel]);

  const nextLifetimeLabel = useMemo(() => {
    const idx = LIFETIME_RANKS.findIndex((r) => r.level === currentLifetimeLevel.level);
    if (idx !== -1 && idx < LIFETIME_RANKS.length - 1) {
      return LIFETIME_RANKS[idx + 1].level;
    }
    return null;
  }, [currentLifetimeLevel]);

  // Loading state
  const isLoading = profile === undefined;

  return (
    <div
      className="w-full pb-32"
      style={{
        minHeight: "100dvh",
        background: "var(--background)",
        color: "var(--foreground)",
        fontFamily: "var(--font-inter)",
      }}
    >
      <div className="px-4 pt-4 space-y-6">

        {/* ── Progression Cards ── */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="h-36 rounded-2xl animate-pulse" style={{ background: "var(--card)" }} />
          ) : (
            <>
              {/* Monthly progress card */}
              <div
                className="relative rounded-2xl p-5 overflow-hidden flex flex-col justify-between"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  minHeight: 140,
                }}
              >
                {/* Accent glow */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: -30,
                    right: -30,
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    background: "color-mix(in srgb, var(--primary) 15%, transparent)",
                    filter: "blur(30px)",
                    pointerEvents: "none",
                  }}
                />

                <div className="relative z-10">
                  <div className="flex justify-between items-baseline mb-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: "var(--muted-foreground)" }}>
                      Monthly Progress
                    </h3>
                    {nextMonthlyLabel && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                        {monthlyRemaining} XP to {nextMonthlyLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-black text-3xl tracking-tight leading-none" style={{ letterSpacing: "-0.03em" }}>
                      {currentMonthlyLevel.level}
                    </span>
                    <span className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
                      Tier {MONTHLY_RANKS.findIndex((r) => r.level === currentMonthlyLevel.level) + 1}
                    </span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="mt-4 relative z-10">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                    <span>{monthlyXp} XP</span>
                    <span>{currentMonthlyLevel.max === Infinity ? "Max" : `${currentMonthlyLevel.max} XP`}</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: "var(--secondary)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${monthlyProgress}%`,
                        background: "var(--primary)",
                        boxShadow: "0 0 10px color-mix(in srgb, var(--primary) 40%, transparent)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Lifetime progress card */}
              <div
                className="relative rounded-2xl p-5 overflow-hidden flex flex-col justify-between"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  minHeight: 140,
                }}
              >
                {/* Accent glow */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: -30,
                    right: -30,
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    background: "color-mix(in srgb, #eab308 10%, transparent)",
                    filter: "blur(30px)",
                    pointerEvents: "none",
                  }}
                />

                <div className="relative z-10">
                  <div className="flex justify-between items-baseline mb-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: "var(--muted-foreground)" }}>
                      Lifetime Ranks
                    </h3>
                    {nextLifetimeLabel && (
                      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#eab308" }}>
                        {lifetimeRemaining} XP to {nextLifetimeLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-black text-3xl tracking-tight leading-none text-foreground" style={{ letterSpacing: "-0.03em" }}>
                      {currentLifetimeLevel.level}
                    </span>
                    <span className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
                      Tier {LIFETIME_RANKS.findIndex((r) => r.level === currentLifetimeLevel.level) + 1}
                    </span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="mt-4 relative z-10">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                    <span>{lifetimeXp} XP</span>
                    <span>{currentLifetimeLevel.max === Infinity ? "Max" : `${currentLifetimeLevel.max} XP`}</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: "var(--secondary)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${lifetimeProgress}%`,
                        background: "#eab308",
                        boxShadow: "0 0 10px rgba(234,179,8,0.3)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Interactive Tiers Directory ── */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] px-1" style={{ color: "var(--muted-foreground)" }}>
              Level Directory
            </p>
            {/* Tab switch */}
            <div
              className="p-1 rounded-xl flex gap-1 border"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("monthly")}
                className="h-7 px-3.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                style={{
                  background: activeTab === "monthly" ? "var(--primary)" : "transparent",
                  color: activeTab === "monthly" ? "var(--primary-foreground)" : "var(--muted-foreground)",
                }}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("lifetime")}
                className="h-7 px-3.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                style={{
                  background: activeTab === "lifetime" ? "var(--primary)" : "transparent",
                  color: activeTab === "lifetime" ? "var(--primary-foreground)" : "var(--muted-foreground)",
                }}
              >
                Lifetime
              </button>
            </div>
          </div>

          <div
            className="rounded-2xl p-1 overflow-hidden"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="max-h-64 overflow-y-auto no-scrollbar">
              {(activeTab === "monthly" ? MONTHLY_RANKS : LIFETIME_RANKS).map((rank, i, arr) => {
                const currentScore = activeTab === "monthly" ? monthlyXp : lifetimeXp;
                const activeLevel = activeTab === "monthly" ? currentMonthlyLevel.level : currentLifetimeLevel.level;
                
                const isCurrent = activeLevel === rank.level;
                const isUnlocked = currentScore >= rank.min;
                const isLast = i === arr.length - 1;

                return (
                  <div
                    key={rank.level}
                    className="flex items-center justify-between px-4 py-3.5"
                    style={{
                      borderBottom: !isLast ? "1px solid var(--border)" : "none",
                      background: isCurrent ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Check badge */}
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center border transition-all shrink-0"
                        style={{
                          background: isUnlocked
                            ? `color-mix(in srgb, ${rank.color} 13%, transparent)`
                            : "transparent",
                          borderColor: isUnlocked ? rank.color : "var(--border)",
                        }}
                      >
                        {isUnlocked ? (
                          <Check size={11} strokeWidth={3} style={{ color: rank.color }} />
                        ) : (
                          <span className="text-[9px] font-black text-muted-foreground/40">{i + 1}</span>
                        )}
                      </div>
                      <span
                        className="text-sm font-black tracking-tight"
                        style={{ color: isUnlocked ? "var(--foreground)" : "var(--muted-foreground)" }}
                      >
                        {rank.level}
                      </span>
                    </div>

                    <span
                      className="text-xs font-black tabular-nums tracking-wide"
                      style={{
                        color: isCurrent
                          ? "var(--primary)"
                          : isUnlocked
                          ? "var(--foreground)"
                          : "var(--muted-foreground)",
                        opacity: isUnlocked ? 1 : 0.4,
                      }}
                    >
                      {rank.max === Infinity ? `${rank.min}+` : `${rank.min} - ${rank.max}`}
                      <span className="text-[9px] font-bold ml-0.5 text-muted-foreground/80 uppercase">xp</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Recent XP Log History ── */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] px-1" style={{ color: "var(--muted-foreground)" }}>
            Sync XP Feed
          </p>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            {xpLogs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground opacity-30 flex flex-col items-center justify-center">
                <Sparkles size={32} className="mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  No XP logs available
                </p>
              </div>
            ) : (
              <>
                <div className="max-h-72 overflow-y-auto no-scrollbar">
                  {xpLogs.map((log, i) => {
                    const isLast = i === xpLogs.length - 1;
                    const isGain = (log.delta || 0) > 0;

                    // Map custom icons and colors per reason/reward
                    let Icon = Zap;
                    let color = "#10b981"; // green

                    if (log.reward === "WORKOUT") {
                      Icon = Dumbbell;
                      color = "var(--primary)";
                    } else if (log.reward === "CARDIO") {
                      Icon = Star;
                      color = "#ec4899"; // pink
                    } else if (log.reward === "STEPS") {
                      Icon = Sparkles;
                      color = "#06b6d4"; // cyan
                    } else if (log.reward === "PR") {
                      Icon = Award;
                      color = "#eab308"; // amber
                    } else if (log.reward === "REST") {
                      Icon = Moon;
                      color = "#8b5cf6"; // purple
                    } else if (log.reward === "INACTIVE" || (log.delta || 0) < 0) {
                      Icon = AlertTriangle;
                      color = "#ef4444"; // red
                    }

                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between px-4 py-3.5 transition-colors"
                        style={{ borderBottom: !isLast ? "1px solid var(--border)" : "none" }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Icon */}
                          <div
                            className="flex items-center justify-center rounded-xl shrink-0"
                            style={{
                              width: 36,
                              height: 36,
                              background: `color-mix(in srgb, ${color} 12%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
                            }}
                          >
                            <Icon size={16} strokeWidth={2} style={{ color }} />
                          </div>
                          {/* Reason and Date */}
                          <div className="min-w-0">
                            <p className="font-bold text-sm leading-tight truncate text-foreground" style={{ letterSpacing: "-0.01em" }}>
                              {log.reason || "Reward"}
                            </p>
                            <p className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                              {formatDate(log.date || "")}
                            </p>
                          </div>
                        </div>

                        {/* delta badge */}
                        <span
                          className="font-black text-sm tabular-nums leading-none shrink-0"
                          style={{ color: isGain ? "#10b981" : "#ef4444" }}
                        >
                          {isGain ? `+${log.delta}` : log.delta} XP
                        </span>
                      </div>
                    );
                  })}
                </div>
                {hasMore && (
                  <div
                    className="p-3 text-center border-t flex justify-center"
                    style={{ borderColor: "var(--border)", background: "var(--card)" }}
                  >
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 30)}
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity cursor-pointer w-full py-1.5"
                    >
                      Load More Logs
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
