import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  CalendarClock,
  Play,
  Dumbbell,
  Calendar,
  Flame,
  Sunrise,
  Sun,
  Sparkle,
  Sunset,
  Moon,
  CloudMoon,
  ChevronRight,
  Clock,
  RotateCcw,
} from "lucide-react";
import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import { SyncService } from "@/services/SyncService";
import { WorkoutService } from "@/services/WorkoutService";

const getTodayDateString = (): string => new Date().toISOString().split("T")[0];

function formatDuration(sec?: number | null): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [showRetroForm, setShowRetroForm] = useState(false);
  const [retroDate, setRetroDate] = useState(getTodayDateString());
  const [retroStart, setRetroStart] = useState("10:00");
  const [retroEnd, setRetroEnd] = useState("11:00");

  const location = useLocation();
  const navigate = useNavigate();

  const activeSession = useLiveQuery(() => WorkoutService.getActiveSession());

  useEffect(() => {
    if (location.state?.syncOnMount) {
      const executeAuthSync = async () => {
        try {
          await SyncService.pushAll();
        } catch (err) {
          console.error(err);
        }
        try {
          await SyncService.pullAll();
        } catch (err) {
          console.error(err);
        }
      };
      executeAuthSync();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const getSessionUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) setUserId(user.id);
    };
    getSessionUser();
  }, []);

  const profile = useLiveQuery(
    async () => (userId ? await db.userProfiles.get(userId) : null),
    [userId],
  );
  const totalSets = useLiveQuery(
    async () =>
      userId ? await db.sets.where("user_id").equals(userId).count() : 0,
    [userId],
  );
  const pastCompletedWorkouts =
    useLiveQuery(async () => {
      if (!userId) return [];
      return await db.workouts
        .where("user_id")
        .equals(userId)
        .filter((w) => w.completed === 1 && w.is_deleted === 0)
        .toArray();
    }, [userId]) || [];

  const syncMeta = useLiveQuery(async () => await db.syncMetadata.toArray());

  const headerMeta = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    let greeting = "Good morning",
      Icon = Sunrise;
    if (hour >= 9 && hour < 12) {
      greeting = "Good morning";
      Icon = Sun;
    } else if (hour >= 12 && hour < 17) {
      greeting = "Good afternoon";
      Icon = Sparkle;
    } else if (hour >= 17 && hour < 21) {
      greeting = "Good evening";
      Icon = Sunset;
    } else if (hour >= 21 || hour < 5) {
      greeting = "Good night";
      Icon = Moon;
    } else {
      greeting = "Early bird";
      Icon = CloudMoon;
    }

    const months = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return {
      dayNum: String(now.getDate()).padStart(2, "0"),
      shortMonth: months[now.getMonth()],
      shortDay: days[now.getDay()],
      timeGreeting: greeting,
      TimeIcon: Icon,
    };
  }, []);

  const streak = profile?.active_days?.length ?? 0;
  const firstName = useMemo(() => {
    const name = profile?.name?.trim().split(" ")[0] || "Athlete";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }, [profile?.name]);

  const lastSyncedDisplay = () => {
    if (!syncMeta || syncMeta.length === 0) return "Never synced";
    const newestRow = syncMeta.reduce((max, current) =>
      current.last_pulled_at > max.last_pulled_at ? current : max,
    );
    return new Date(newestRow.last_pulled_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleLaunchRetroWorkout = (): void => {
    if (!retroDate || !retroStart || !retroEnd) return;
    navigate(
      `/workout?mode=retro&date=${retroDate}&startTime=${retroStart}&endTime=${retroEnd}`,
    );
  };

  return (
    <div
      className="min-h-screen select-none"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="px-4 pt-4 pb-4 space-y-6">
        {/* ── Header ── */}
        <header className="flex justify-between items-start pt-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-0.5">
              <headerMeta.TimeIcon
                size={12}
                style={{ color: "var(--primary)" }}
              />
              <span
                className="text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ color: "var(--primary)" }}
              >
                {headerMeta.timeGreeting}
              </span>
            </div>
            <h1
              className="font-black uppercase leading-none"
              style={{
                fontSize: 30,
                letterSpacing: "-0.02em",
                color: "var(--foreground)",
              }}
            >
              {firstName}
            </h1>
            {streak > 0 && (
              <div
                className="mt-2 w-fit flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{
                  background:
                    "color-mix(in srgb, var(--warning) 12%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--warning) 28%, transparent)",
                }}
              >
                <Flame
                  size={10}
                  style={{ color: "var(--warning)" }}
                  fill="currentColor"
                />
                <span
                  className="text-[9px] font-black uppercase tracking-[0.1em]"
                  style={{ color: "var(--warning)" }}
                >
                  {streak} Day Streak
                </span>
              </div>
            )}
          </div>

          {/* Calendar chip */}
          <button
            onClick={() => navigate("/history")}
            className="rounded-xl overflow-hidden transition-all active:scale-95"
            style={{
              width: 52,
              border: "1px solid var(--border)",
              background: "var(--card)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <div
              className="w-full py-1 flex justify-center"
              style={{ background: "var(--primary)" }}
            >
              <span
                className="text-[8px] font-black tracking-widest leading-none"
                style={{ color: "var(--primary-foreground)" }}
              >
                {headerMeta.shortMonth}
              </span>
            </div>
            <div
              className="flex flex-col items-center pb-1.5 pt-1"
              style={{ background: "var(--card)" }}
            >
              <span
                className="font-black tabular-nums leading-none"
                style={{ fontSize: 20, letterSpacing: "-0.03em" }}
              >
                {headerMeta.dayNum}
              </span>
              <span
                className="text-[8px] font-bold uppercase tracking-tight mt-0.5"
                style={{ color: "var(--muted-foreground)" }}
              >
                {headerMeta.shortDay}
              </span>
            </div>
          </button>
        </header>

        {/* ── Quick stats ── */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Total Sets", value: totalSets ?? 0, suffix: "" },
            {
              label: "Workouts",
              value: pastCompletedWorkouts.length,
              suffix: "",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-4"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="text-[9px] font-black uppercase tracking-widest mb-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                {stat.label}
              </p>
              <p
                className="font-black tabular-nums leading-none"
                style={{ fontSize: 28, letterSpacing: "-0.03em" }}
              >
                {stat.value}
                {stat.suffix && (
                  <span
                    className="text-base ml-1"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {stat.suffix}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* ── Primary actions ── */}
        <div className="flex flex-col gap-2.5">
          {/* Live / Resume */}
          <button
            onClick={() =>
              navigate(activeSession ? "/workout" : "/workout?mode=live")
            }
            className="w-full h-14 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
            style={
              activeSession
                ? {
                  background: "color-mix(in srgb, var(--warning) 90%, black)",
                  color: "#000",
                  boxShadow:
                    "0 4px 18px color-mix(in srgb, var(--warning) 35%, transparent)",
                }
                : {
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  boxShadow:
                    "0 4px 18px color-mix(in srgb, var(--primary) 35%, transparent)",
                }
            }
          >
            {activeSession ? (
              <>
                <Play size={15} strokeWidth={3} className="fill-current" />
                Resume Workout
              </>
            ) : (
              <>
                <Plus size={15} strokeWidth={3} />
                Start Live Workout
              </>
            )}
          </button>

          {/* Retro toggle */}
          <button
            onClick={() => setShowRetroForm(!showRetroForm)}
            className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
            style={{
              background: showRetroForm
                ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                : "var(--secondary)",
              color: showRetroForm
                ? "var(--primary)"
                : "var(--secondary-foreground)",
              border: `1px solid ${showRetroForm ? "color-mix(in srgb, var(--primary) 30%, transparent)" : "var(--border)"}`,
            }}
          >
            <CalendarClock size={14} strokeWidth={2} />
            Log Past Workout
          </button>

          {/* Retro form */}
          {showRetroForm && (
            <div
              className="rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="space-y-1.5">
                <label
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Date
                </label>
                <input
                  type="date"
                  max={getTodayDateString()}
                  value={retroDate}
                  onChange={(e) => setRetroDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl text-sm font-bold outline-none"
                  style={{
                    background: "var(--secondary)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Start", value: retroStart, set: setRetroStart },
                  { label: "End", value: retroEnd, set: setRetroEnd },
                ].map((f) => (
                  <div key={f.label} className="space-y-1.5">
                    <label
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {f.label}
                    </label>
                    <input
                      type="time"
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl text-sm font-bold outline-none"
                      style={{
                        background: "var(--secondary)",
                        border: "1px solid var(--border)",
                        color: "var(--foreground)",
                      }}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleLaunchRetroWorkout}
                className="w-full h-11 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  boxShadow:
                    "0 3px 12px color-mix(in srgb, var(--primary) 30%, transparent)",
                }}
              >
                Start Retro Log
              </button>
            </div>
          )}
        </div>

        {/* ── Dev inspector ── */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: "var(--primary)" }}
            >
              Dev Inspector
            </span>
            <span
              className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
              style={{
                background:
                  "color-mix(in srgb, var(--warning) 14%, transparent)",
                color: "var(--warning)",
                border:
                  "1px solid color-mix(in srgb, var(--warning) 28%, transparent)",
              }}
            >
              Dev
            </span>
          </div>
          <div className="space-y-2.5 font-mono text-[11px]">
            {[
              { label: "User ID", value: userId || "Loading…" },
              {
                label: "Role / XP",
                value: `${profile?.role || "USER"} · ${profile?.xp ?? 0} XP`,
              },
              { label: "Total Sets", value: String(totalSets ?? 0) },
              { label: "Last Sync", value: lastSyncedDisplay() },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className="flex justify-between items-center"
                style={{
                  paddingBottom: i < arr.length - 1 ? 10 : 0,
                  borderBottom:
                    i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span style={{ color: "var(--muted-foreground)" }}>
                  {row.label}
                </span>
                <span
                  className="truncate ml-4 max-w-[160px] text-right font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recent workouts ── */}
        {pastCompletedWorkouts.length > 0 && (
          <section className="space-y-3">
            <h4
              className="text-[10px] font-black uppercase tracking-[0.18em] px-0.5"
              style={{ color: "var(--muted-foreground)" }}
            >
              Recent Workouts
            </h4>
            <div className="space-y-2">
              {pastCompletedWorkouts.slice(0, 5).map((w) => (
                <div
                  key={w.id}
                  className="rounded-2xl p-3.5 flex items-center gap-3"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary) 10%, transparent)",
                      border:
                        "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                    }}
                  >
                    <Dumbbell size={16} style={{ color: "var(--primary)" }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-black text-sm uppercase tracking-tight truncate"
                      style={{ color: "var(--foreground)" }}
                    >
                      Workout Session
                    </p>
                    <div
                      className="flex items-center gap-2.5 mt-0.5"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <span className="flex items-center gap-1 text-[10px] font-semibold">
                        <Calendar size={10} strokeWidth={2} />
                        {w.date}
                      </span>
                      {w.duration_sec ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold">
                          <Clock size={10} strokeWidth={2} />
                          {formatDuration(w.duration_sec)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Clone */}
                  <button
                    onClick={() =>
                      navigate(`/workout?mode=clone&cloneId=${w.id}`)
                    }
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0"
                    style={{
                      background: "var(--secondary)",
                      border: "1px solid var(--border)",
                      color: "var(--muted-foreground)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--primary)";
                      e.currentTarget.style.color = "var(--primary-foreground)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--secondary)";
                      e.currentTarget.style.color = "var(--muted-foreground)";
                    }}
                    title="Clone workout"
                  >
                    <RotateCcw size={13} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
