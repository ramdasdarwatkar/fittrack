export default function Dashboard() {
  // Placeholder Data
  const placeholderParams = {
    sessionId: "7b2e91a4-8231-4c6b-9123-placeholder",
    restTimer: "01:30",
    setsLogged: 12,
    lastSynced: "Just now",
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h2 className="text-3xl font-extrabold tracking-tight">Dashboard</h2>
        <p className="text-zinc-500 text-sm">Welcome back, Athlete.</p>
      </header>

      {/* Param Inspector Card */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-emerald-500 text-xs font-bold uppercase tracking-[0.2em]">
            Store Inspector (Mock)
          </h3>
          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
            DEV MODE
          </span>
        </div>

        <div className="space-y-4 font-mono text-[11px]">
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Active Session ID:</span>
            <span className="text-zinc-200 truncate ml-4 max-w-[140px]">
              {placeholderParams.sessionId}
            </span>
          </div>

          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Rest Timer Param:</span>
            <span className="text-amber-500">
              {placeholderParams.restTimer}
            </span>
          </div>

          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Sets in Memory:</span>
            <span className="text-zinc-200">
              {placeholderParams.setsLogged}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">Sync Status:</span>
            <span className="text-emerald-400">
              {placeholderParams.lastSynced}
            </span>
          </div>
        </div>
      </section>
      {/* Quick Action Placeholder */}
      <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-900/20">
        Start New Workout
      </button>
    </div>
  );
}
