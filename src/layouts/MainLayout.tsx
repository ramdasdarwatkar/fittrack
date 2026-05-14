import { Outlet } from "react-router-dom";
import { Timer } from "lucide-react";
import { BottomNav } from "./BottomNav";

export default function MainLayout() {
  // Placeholders for state visualization
  const hasActiveSession = true;
  const isTimerRunning = false;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800">
        <h1 className="text-xl font-black tracking-tighter italic text-emerald-500">
          FITTRACK
        </h1>

        <div className="flex items-center gap-3">
          {hasActiveSession && (
            <div className="flex items-center gap-2 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase">
                Live
              </span>
            </div>
          )}
          {isTimerRunning && (
            <Timer className="w-5 h-5 text-amber-500 animate-spin-slow" />
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* Modular Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
