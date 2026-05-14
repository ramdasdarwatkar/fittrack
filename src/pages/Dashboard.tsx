export default function Dashboard() {
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

        <p className="text-muted-foreground text-sm">Welcome back, Athlete.</p>
      </header>

      <section className="bg-card border border-border rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-primary text-xs font-bold uppercase tracking-[0.2em]">
            Store Inspector (Mock)
          </h3>

          <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded">
            DEV MODE
          </span>
        </div>

        <div className="space-y-4 font-mono text-[11px]">
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Active Session ID:</span>

            <span className="text-foreground truncate ml-4 max-w-35">
              {placeholderParams.sessionId}
            </span>
          </div>

          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Rest Timer Param:</span>

            <span className="text-warning">{placeholderParams.restTimer}</span>
          </div>

          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Sets in Memory:</span>

            <span className="text-foreground">
              {placeholderParams.setsLogged}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Sync Status:</span>

            <span className="text-success">{placeholderParams.lastSynced}</span>
          </div>
        </div>
      </section>

      <button
        className="
          w-full
          bg-primary
          text-primary-foreground
          font-bold
          py-4
          rounded-xl
          transition-all
          active:scale-95
          hover:opacity-90
        "
      >
        Start New Workout
      </button>
    </div>
  );
}
