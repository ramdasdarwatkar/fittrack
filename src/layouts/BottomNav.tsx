import { NavLink } from "react-router-dom";
import { LayoutDashboard, Dumbbell, History, Settings } from "lucide-react";

const navItems = [
  { to: "/", icon: <LayoutDashboard size={22} />, label: "Dash" },
  { to: "/workout", icon: <Dumbbell size={22} />, label: "Workout" },
  { to: "/history", icon: <History size={22} />, label: "History" },
  { to: "/settings", icon: <Settings size={22} />, label: "Settings" },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
      style={{
        paddingBottom: "0.5rem",
      }}
    >
      <div className="grid h-20 grid-cols-4 mx-auto max-w-md px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `
              flex flex-col items-center justify-center gap-1 transition-all duration-200
              ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            {item.icon}

            <span className="text-[10px] font-bold uppercase tracking-widest">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
