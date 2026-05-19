import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export default function MainLayout() {
  return (
    <div className="flex flex-col w-full h-dvh bg-background text-foreground">
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
