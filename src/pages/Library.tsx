import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Dumbbell, Layers } from "lucide-react";
import ExerciseList from "@/components/exercises/ExerciseList";
import RoutineList from "@/components/routines/RoutineList";

type TabType = "exercises" | "routines";

export default function Library() {
  const navigate = useNavigate();

  // Initialize tab state from localStorage for smooth navigation retention
  const [activeTab, setActiveTab] = useState<TabType>(
    () => (localStorage.getItem("lib_active_tab") as TabType) || "exercises",
  );

  // Sync tab updates to local cache to keep view consistent across sub-route pops
  useEffect(() => {
    localStorage.setItem("lib_active_tab", activeTab);
  }, [activeTab]);

  /**
   * Evaluates the active view tab state to branch out creation routes dynamically
   */
  const handleCreationRoutingRedirect = () => {
    const targetPath =
      activeTab === "exercises"
        ? "/library/exercise/create"
        : "/library/routine/create";
    navigate(targetPath);
  };

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground select-none overflow-hidden">
      {/* HEADER SECTION */}
      <header className="flex items-center justify-between px-6 pb-4 pt-4 shrink-0">
        <h1 className="text-3xl font-black uppercase tracking-tighter">
          Library
        </h1>
        <button
          onClick={handleCreationRoutingRedirect}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg transition-all active:scale-90 cursor-pointer"
          aria-label="Create item"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </header>

      {/* SEGMENTED TAB NAVIGATION */}
      <section className="px-6 pb-4 shrink-0">
        <div className="relative flex p-1 bg-secondary rounded-2xl border border-border">
          {/* Tab Item 1: Movements List */}
          <button
            onClick={() => setActiveTab("exercises")}
            className={`relative flex flex-1 items-center justify-center gap-2 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors duration-300 z-10 cursor-pointer ${
              activeTab === "exercises"
                ? "text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Dumbbell size={16} />
            Exercises
            {activeTab === "exercises" && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-primary rounded-xl shadow-md -z-10"
                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
              />
            )}
          </button>

          {/* Tab Item 2: Workout Routines */}
          <button
            onClick={() => setActiveTab("routines")}
            className={`relative flex flex-1 items-center justify-center gap-2 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors duration-300 z-10 cursor-pointer ${
              activeTab === "routines"
                ? "text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Layers size={16} />
            Routines
            {activeTab === "routines" && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-primary rounded-xl shadow-md -z-10"
                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
              />
            )}
          </button>
        </div>
      </section>

      {/* INDEPENDENT LAYOUT CONTENT VIEWPORT */}
      <main className="flex-1 overflow-y-auto px-6 touch-pan-y">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="pb-28"
          >
            {activeTab === "exercises" ? <ExerciseList /> : <RoutineList />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
