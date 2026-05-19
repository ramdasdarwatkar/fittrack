import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Loader2, ChevronRight } from "lucide-react";
import { ExerciseService } from "@/services/ExerciseService";
import { MuscleGroupService } from "@/services/StaticReferenceService";

export default function ExerciseList() {
  const navigate = useNavigate();

  // 1. Live stream active exercises from Dexie
  const exercises = useLiveQuery(() => ExerciseService.listActive());

  // 2. Live stream available muscle groups from your static local reference table
  const muscleGroups = useLiveQuery(() => MuscleGroupService.getAll());

  // State to track the active Category Filter. We store the numeric ID (or "ALL" string)
  const [activeChip, setActiveChip] = useState<number | "ALL">(() => {
    const cached = sessionStorage.getItem("exercise_active_chip_id");
    return cached && cached !== "ALL" ? Number(cached) : "ALL";
  });

  // Sync active selection to session storage safely
  useEffect(() => {
    sessionStorage.setItem("exercise_active_chip_id", String(activeChip));
  }, [activeChip]);

  // 3. Filter exercises dynamically using the relational muscle_group_id column
  const filteredExercises = useMemo(() => {
    if (!exercises) return [];
    if (activeChip === "ALL") return exercises;
    return exercises.filter((ex) => ex.muscle_group_id === activeChip);
  }, [exercises, activeChip]);

  if (!exercises || !muscleGroups) return <LoadingState />;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 4. DYNAMIC CATEGORY CHIPS SCROLLER (Pulls straight from your DB) */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md py-3 -mx-6 px-6 overflow-hidden border-b border-border">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {/* Static "ALL" Option */}
          <button
            onClick={() => setActiveChip("ALL")}
            className={`
              px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border cursor-pointer
              ${
                activeChip === "ALL"
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground border-border"
              }
            `}
          >
            ALL
          </button>

          {/* Dynamic Muscle Group Options from Database */}
          {muscleGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => setActiveChip(group.id)}
              className={`
                px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border cursor-pointer
                ${
                  activeChip === group.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground border-border"
                }
              `}
            >
              {group.name}
            </button>
          ))}
        </div>
      </div>

      {/* EXERCISE RENDER LIST */}
      <div className="mt-2">
        <AnimatePresence mode="popLayout">
          {filteredExercises.length > 0 ? (
            filteredExercises.map((item) => (
              <motion.button
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key={item.id}
                onClick={() => navigate(`/library/exercise/${item.id}`)}
                className="group relative flex w-full items-center justify-between border-b border-border/60 py-5 active:bg-primary/5 transition-colors text-left cursor-pointer"
              >
                {/* 1/0 Integer sync indicator checking dirty states */}
                {item.is_dirty === 1 && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-warning" />
                )}

                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card border border-border text-muted-foreground group-hover:text-primary transition-colors">
                    <Dumbbell size={20} />
                  </div>

                  <div className="flex flex-col justify-center min-w-0 h-11">
                    <h3 className="truncate text-base font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors leading-none">
                      {item.name}
                    </h3>
                    {item.variation && (
                      <p className="truncate text-[10px] font-bold text-primary uppercase tracking-widest leading-none mt-1.5">
                        {item.variation}
                      </p>
                    )}
                  </div>
                </div>

                <ChevronRight
                  size={18}
                  className="shrink-0 text-muted-foreground opacity-20 group-hover:opacity-100 transition-all ml-4"
                />
              </motion.button>
            ))
          ) : (
            <div className="py-20 text-center flex flex-col items-center justify-center opacity-20">
              <p className="uppercase font-black text-xs tracking-widest text-muted-foreground">
                No movements in this category
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center py-24 text-primary">
      <Loader2 size={32} className="animate-spin" />
    </div>
  );
}
