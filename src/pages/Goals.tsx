import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type LocalGoal } from "@/db";
import { supabase } from "@/lib/supabase";
import { Target, Pencil, Check, X } from "lucide-react";

export default function Goals() {
  const [userId, setUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<number>(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const goals = useLiveQuery(
    async () => (userId ? await db.goals.where("user_id").equals(userId).toArray() : []),
    [userId]
  );

  const activeGoals = goals?.filter((g) => g.is_deleted === 0) || [];

  const handleEdit = (goal: LocalGoal) => {
    setEditingId(goal.id);
    setEditTarget(goal.target ?? 0);
  };

  const handleSave = async (goal: LocalGoal) => {
    if (editTarget !== goal.target) {
      await db.goals.update(goal.id, {
        target: editTarget,
        is_dirty: 1,
      });
    }
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-background" style={{ fontFamily: "var(--font-inter)" }}>
      {/* ── HEADER ──────────────────────────────────────── */}
      <div className="px-5 pt-14 pb-6 relative z-10 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Target size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-foreground leading-none">
              Goals
            </h1>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
              Track your targets
            </p>
          </div>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 pb-32">
        <div className="space-y-4">
          {!goals ? (
            <div className="animate-pulse flex flex-col gap-4">
              <div className="h-24 bg-secondary rounded-2xl w-full"></div>
              <div className="h-24 bg-secondary rounded-2xl w-full"></div>
            </div>
          ) : activeGoals.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Target size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest opacity-50">
                No goals found
              </p>
            </div>
          ) : (
            activeGoals.map((goal) => (
              <div
                key={goal.id}
                className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-4 transition-all hover:border-primary/30"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-black text-lg text-foreground uppercase tracking-tight">
                      {goal.name}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                      {goal.goaltype === "WORKOUT_DAYS" ? "Workout Frequency" : goal.goaltype}
                    </p>
                  </div>
                  {editingId !== goal.id && (
                    <button
                      onClick={() => handleEdit(goal)}
                      className="p-2 -mt-2 -mr-2 text-muted-foreground hover:text-primary transition-colors bg-secondary hover:bg-secondary/80 rounded-xl"
                      aria-label="Edit goal"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                </div>

                {editingId === goal.id ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={editTarget}
                      onChange={(e) => setEditTarget(Number(e.target.value))}
                      className="flex-1 h-12 bg-secondary border border-primary/50 rounded-xl px-4 font-black text-lg outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => handleSave(goal)}
                      className="h-12 w-12 flex items-center justify-center bg-primary text-primary-foreground rounded-xl active:scale-95 transition-transform"
                    >
                      <Check size={20} strokeWidth={3} />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="h-12 w-12 flex items-center justify-center bg-secondary border border-border text-foreground rounded-xl active:scale-95 transition-transform"
                    >
                      <X size={20} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-primary tracking-tighter leading-none">
                      {goal.target}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      {goal.goaltype === "WORKOUT_DAYS" ? "Days" : "Target"}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
