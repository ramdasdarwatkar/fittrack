import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, X, Dumbbell } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { MuscleGroupService } from "@/services/StaticReferenceService";
import type { Tables } from "@/db/supabase";

interface ExerciseSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedExercises: Tables<"exercises">[]) => void;
  library: Tables<"exercises">[];
}

export default function ExerciseSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  library,
}: ExerciseSelectorModalProps) {
  const [search, setSearch] = useState("");
  const [activeChip, setActiveChip] = useState<number | "ALL">("ALL");
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);

  // Stream dynamic lookup metrics straight through Service interfaces
  const muscleGroups = useLiveQuery(() => MuscleGroupService.getAll()) || [];

  // Filter local collection matrix components dynamically using true database primary key checks
  const filteredList = useMemo(() => {
    return library.filter((ex) => {
      const matchesSearch = ex.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesChip =
        activeChip === "ALL" || ex.muscle_group_id === activeChip;
      return matchesSearch && matchesChip;
    });
  }, [library, search, activeChip]);

  const handleConfirm = () => {
    const selected = library.filter((ex) => tempSelectedIds.includes(ex.id));
    onConfirm(selected);
    setTempSelectedIds([]);
    setSearch("");
    setActiveChip("ALL");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end overflow-hidden">
          {/* MASK BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* SLIDING CONSOLIDATED DRAWER FRAME */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.y > 140 || info.velocity.y > 450) {
                onClose();
              }
            }}
            className="relative w-full h-[90vh] bg-background text-foreground rounded-t-[2.5rem] border-t border-border flex flex-col overflow-hidden shadow-2xl select-none"
          >
            {/* Swiper Visual Bar Handle */}
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-4 shrink-0" />

            {/* BAR HEADERS PACK REGISTRY */}
            <div className="px-6 pt-5 pb-2 space-y-4 shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Select Movements
                </h3>
                <span className="text-[10px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-md uppercase">
                  {tempSelectedIds.length} Checked
                </span>
              </div>

              {/* Dynamic Input Filtering Frame */}
              <div className="bg-secondary border border-border rounded-xl h-13 flex items-center px-4 gap-3">
                <Search
                  size={18}
                  className="text-muted-foreground opacity-60"
                />
                <input
                  placeholder="Search by name..."
                  className="flex-1 text-sm font-medium bg-transparent outline-none placeholder:text-muted-foreground/50 text-foreground"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <X
                    size={16}
                    className="text-muted-foreground cursor-pointer"
                    onClick={() => setSearch("")}
                  />
                )}
              </div>

              {/* DYNAMIC RELATION HORIZONTAL CHIP SYSTEM (Stripped of Hardcoded Chains) */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-6 px-6">
                <button
                  onClick={() => setActiveChip("ALL")}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeChip === "ALL"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground border border-border"
                  }`}
                >
                  ALL
                </button>
                {muscleGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setActiveChip(group.id)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      activeChip === group.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-muted-foreground border border-border"
                    }`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE DATASTREAM INNER LOOP POOL */}
            <div className="flex-1 overflow-y-auto px-6 pt-2 pb-36 touch-pan-y no-scrollbar">
              <div className="space-y-1.5">
                {filteredList.map((ex) => {
                  const isChecked = tempSelectedIds.includes(ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() =>
                        setTempSelectedIds((prev) =>
                          isChecked
                            ? prev.filter((id) => id !== ex.id)
                            : [...prev, ex.id],
                        )
                      }
                      className="w-full py-4 flex items-center justify-between border-b border-border/40 active:bg-secondary/40 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex flex-col min-w-0 pr-4">
                        <span
                          className={`font-black text-sm uppercase tracking-tight truncate ${isChecked ? "text-primary" : "text-foreground"}`}
                        >
                          {ex.name}
                        </span>
                        {ex.variation && (
                          <span className="text-[9px] font-bold text-primary uppercase tracking-wider mt-0.5">
                            {ex.variation}
                          </span>
                        )}
                      </div>

                      <div
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                          isChecked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border bg-secondary"
                        }`}
                      >
                        {isChecked && <Check size={14} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredList.length === 0 && (
                <div className="py-20 text-center text-muted-foreground opacity-30 flex flex-col items-center justify-center">
                  <Dumbbell size={36} className="mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Nothing matches lookup
                  </p>
                </div>
              )}
            </div>

            {/* FLOATING ACTION ACTION BASEBOARD PANEL */}
            <div className="absolute bottom-0 inset-x-0 p-6 pb-9 bg-gradient-to-t from-background via-background to-transparent z-10">
              <button
                onClick={handleConfirm}
                disabled={tempSelectedIds.length === 0}
                className="w-full h-15 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-xl active:scale-98 transition-all disabled:opacity-30 disabled:grayscale cursor-pointer"
              >
                Confirm Checked Assets ({tempSelectedIds.length})
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
