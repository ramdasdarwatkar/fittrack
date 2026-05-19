import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, CalendarClock } from "lucide-react";
import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import { SyncService } from "@/services/SyncService";

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // 1. STATE-GATED AUTOMATED SYNC
  useEffect(() => {
    if (location.state?.syncOnMount) {
      console.log(
        "[SyncEngine] Targeted auth transition detected. running sync sequence...",
      );

      const executeAuthSync = async () => {
        try {
          await SyncService.pushAll();
        } catch (err) {
          console.error("[Sync] Entry push failed:", err);
        }

        try {
          await SyncService.pullAll();
        } catch (err) {
          console.error("[Sync] Entry pull failed:", err);
        }
      };

      executeAuthSync();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // 2. Resolve current authenticated user context on mount
  useEffect(() => {
    const getSessionUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) setUserId(user.id);
    };
    getSessionUser();
  }, []);

  // 3. Reactive Local Queries
  const profile = useLiveQuery(
    async () => (userId ? await db.userProfiles.get(userId) : null),
    [userId],
  );

  const totalSets = useLiveQuery(
    async () =>
      userId ? await db.sets.where("user_id").equals(userId).count() : 0,
    [userId],
  );

  const syncMeta = useLiveQuery(async () => await db.syncMetadata.toArray());

  const lastSyncedDisplay = () => {
    if (!syncMeta || syncMeta.length === 0) return "Never synced";
    const newestRow = syncMeta.reduce((max, current) =>
      current.last_pulled_at > max.last_pulled_at ? current : max,
    );

    const date = new Date(newestRow.last_pulled_at);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-6 space-y-6 select-none">
      <header>
        <h2 className="text-3xl font-extrabold tracking-tight">Dashboard</h2>
        <p className="text-zinc-500 text-sm">
          Welcome back,{" "}
          <span className="text-emerald-400 font-semibold">
            {profile?.name || "Athlete"}
          </span>
          .
        </p>
      </header>

      {/* Param Inspector Card */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-emerald-500 text-xs font-bold uppercase tracking-[0.2em]">
            Store Inspector (Live)
          </h3>
          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
            DEV MODE
          </span>
        </div>

        <div className="space-y-4 font-mono text-[11px]">
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Active User ID:</span>
            <span className="text-zinc-200 truncate ml-4 max-w-[140px]">
              {userId || "Loading..."}
            </span>
          </div>

          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Tier / XP Level:</span>
            <span className="text-amber-500 capitalize">
              {profile?.role || "USER"} ({profile?.xp ?? 0} XP)
            </span>
          </div>

          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Total Sets Logged:</span>
            <span className="text-zinc-200">{totalSets ?? 0}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">Last Database Sync:</span>
            <span className="text-emerald-400">{lastSyncedDisplay()}</span>
          </div>
        </div>
      </section>

      {/* WORKOUT INITIALIZATION LAYOUT ACTION DOCK */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={() => navigate("/workout")}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest h-14 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-emerald-900/10 cursor-pointer"
        >
          <Plus size={16} strokeWidth={3} /> Start Today's Workout
        </button>

        <button
          onClick={() => navigate("/workout?mode=retro")}
          className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-black uppercase tracking-widest h-14 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-98 border border-zinc-800 cursor-pointer"
        >
          <CalendarClock size={16} /> Log Past Workout
        </button>
      </div>
    </div>
  );
}
