import { Outlet, useNavigate, useMatches } from "react-router-dom";
import { useLayoutEffect } from "react";
import { ArrowLeft } from "lucide-react";

interface RouterMatchHandle {
  title?: string;
  rightElement?: React.ReactNode;
}

export default function SubPageLayout() {
  const navigate = useNavigate();
  const matches = useMatches();

  // Find the handle metadata for the currently active child route row
  const currentMatch = matches.find((m) => m.handle);
  const handle = (currentMatch?.handle as RouterMatchHandle) || {};

  // Clean layout auto-reset scroll target position on mount/route modifications
  useLayoutEffect(() => {
    const el = document.getElementById("sub-scroll");
    if (el) el.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div
      className="w-full flex flex-col bg-background text-foreground overflow-hidden"
      style={{ height: "calc(var(--app-height, 100dvh) - env(safe-area-inset-top, 0px))" }}
    >
      {/* HEADER — safe-area top via inline style for iOS notch/Dynamic Island */}
      <header
        className="shrink-0 bg-background/90 backdrop-blur-md border-b border-border"
      >
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl active:scale-90 transition-transform cursor-pointer text-foreground"
            aria-label="Go back"
          >
            <ArrowLeft size={22} />
          </button>

          {/* Centered Title pulled directly from the active route's handle details */}
          <h1 className="flex-1 text-center text-sm font-bold uppercase tracking-widest truncate px-2">
            {handle.title || "Library"}
          </h1>

          {/* Right slot — fixed width keeps title visually centered */}
          <div className="w-10 flex justify-end">
            {handle.rightElement || null}
          </div>
        </div>
      </header>

      {/* SCROLL AREA */}
      <main
        id="sub-scroll"
        className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar"
      >
        <div
          className="px-6 py-6"
          style={{
            paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {/* React Router cleanly passes your un-wrapped form components right here */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
