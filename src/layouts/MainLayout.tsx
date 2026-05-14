import { Outlet } from "react-router-dom";
import { Timer } from "lucide-react";
import { BottomNav } from "./BottomNav";

export default function MainLayout() {
  const hasActiveSession = true;
  const isTimerRunning = false;

  return (
    <div className="flex flex-col w-full h-dvh bg-background text-foreground">
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-card/80 backdrop-blur-md border-b border-border">
        <h1 className="text-xl font-black tracking-tighter text-primary">
          FITTRACK
        </h1>
        <div className="flex items-center gap-3">
          {hasActiveSession && (
            <div className="flex items-center gap-2 bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />

              <span className="text-[10px] font-bold text-primary uppercase">
                Live
              </span>
            </div>
          )}

          {isTimerRunning && (
            <Timer className="w-5 h-5 text-warning animate-spin-slow" />
          )}
        </div>
      </header>
      <main
        className="flex-1 overflow-y-auto overscroll-none"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <div className="pb-24">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
