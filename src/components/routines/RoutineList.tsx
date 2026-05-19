import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Loader2, Layers } from "lucide-react";
import { RoutineService } from "@/services/RoutineService";

export default function RoutineList() {
  const navigate = useNavigate();

  // Reactive Subscription tracking item exercise composition counts
  const routines = useLiveQuery(() => RoutineService.listActiveWithCount());

  if (!routines) return <LoadingState />;

  return (
    <div className="space-y-4 pt-2 bg-background">
      <AnimatePresence mode="popLayout">
        {routines.map((routine) => (
          <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={routine.id}
            className="p-5 bg-card border border-border rounded-xl space-y-5 shadow-sm"
          >
            {/* TOP CARD BUTTON VIEW LINK */}
            <button
              onClick={() => navigate(`/library/routine/${routine.id}`)}
              className="flex w-full items-center justify-between px-1 active:opacity-60 transition-opacity group cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Layers size={20} />
                </div>

                <div className="flex flex-col justify-center text-left min-w-0 h-11">
                  <h3 className="font-black text-base uppercase tracking-tight text-foreground leading-none truncate">
                    {routine.name}
                  </h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 leading-none">
                    {routine.exerciseCount}{" "}
                    {routine.exerciseCount === 1 ? "movement" : "movements"}
                  </p>
                </div>
              </div>
            </button>

            {/* ACTION PLAY BUTTON RUN */}
            <button
              onClick={() => navigate(`/workout/start/${routine.id}`)}
              className="w-full h-14 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-primary/10 cursor-pointer"
            >
              <Play size={16} fill="currentColor" />
              <span className="font-black text-xs uppercase tracking-[0.2em]">
                Start Workout
              </span>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {routines.length === 0 && (
        <div className="py-20 text-center opacity-20 uppercase font-black text-xs tracking-widest text-muted-foreground">
          No routines found
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center py-24 text-primary">
      <Loader2 size={34} className="animate-spin" />
    </div>
  );
}
