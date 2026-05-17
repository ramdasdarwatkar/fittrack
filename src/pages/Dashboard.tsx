import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import { SyncService } from "@/services/SyncService";

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // 1. STATE-GATED AUTOMATED SYNC: Evaluates ONLY during direct entry sequences
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
          // Pass 'true' to explicitly bypass the 5-minute cooldown safety net for this special event
          await SyncService.pullAll();
        } catch (err) {
          console.error("[Sync] Entry pull failed:", err);
        }
      };

      executeAuthSync();

      // CRITICAL FLUSH: Instantly strip the state flag out of the history stack window object.
      // This guarantees that clicking back/forward, resizing, or refreshing won't fire it again.
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

  // 3. Reactive Local Queries (Live UI feedback tracking updates)
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
    <div className="p-6 space-y-6">
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

      <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-900/20">
        Start New Workout
      </button>
    </div>
  );
}
