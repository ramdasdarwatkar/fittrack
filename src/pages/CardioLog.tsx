import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Check,
  X,
  Search,
  Dumbbell,
  Award,
  Zap,
  ChevronRight,
  TrendingUp,
  FileText,
} from "lucide-react";
import { db, type LocalWorkout, type LocalSet, type LocalExercise } from "@/db";
import { ExerciseService } from "@/services/ExerciseService";
import { WorkoutService } from "@/services/WorkoutService";
import { supabase } from "@/lib/supabase";

export default function CardioLog() {
  const navigate = useNavigate();

  // --- Auth state ---
  const [userId, setUserId] = useState<string | null>(null);

  // --- Form States ---
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:30");
  const [note, setNote] = useState("");

  // --- Exercise Select States ---
  const [selectedExercise, setSelectedExercise] = useState<LocalExercise | null>(null);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  // --- Dynamic Metric Inputs ---
  const [distanceKm, setDistanceKm] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [durationSecs, setDurationSecs] = useState("00");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  // --- Error & Saving States ---
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- Queries ---
  const [exercises, setExercises] = useState<LocalExercise[]>([]);

  // Fetch session user
  useEffect(() => {
    const getSessionUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) setUserId(user.id);
    };
    getSessionUser();
  }, []);

  // Load exercises on mount
  useEffect(() => {
    ExerciseService.listActive().then((list) => {
      setExercises(list);
    });
  }, []);

  // --- Filter Cardio Exercises ---
  const cardioExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const m = Array.isArray(ex.metrics)
        ? ex.metrics
        : typeof ex.metrics === "object" && ex.metrics !== null
        ? Object.keys(ex.metrics).filter((k) => (ex.metrics as Record<string, unknown>)[k] === true || (ex.metrics as Record<string, unknown>)[k] === 1)
        : [];
      const hasCardioMetric = m.includes("duration") || m.includes("distance") || m.includes("duration_sec") || m.includes("distance_meters");
      
      const isCardioGroup = String(ex.variation || "").toLowerCase().includes("cardio") || 
                           String(ex.name || "").toLowerCase().includes("cardio");
      
      return hasCardioMetric || isCardioGroup;
    });
  }, [exercises]);

  const filteredCardioExercises = useMemo(() => {
    if (!search.trim()) return cardioExercises;
    return cardioExercises.filter((ex) =>
      ex.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [cardioExercises, search]);

  // --- Determine available metrics on selected exercise ---
  const activeMetrics = useMemo(() => {
    if (!selectedExercise) return { showDistance: false, showDuration: false, showWeight: false, showReps: false };
    const m = Array.isArray(selectedExercise.metrics)
      ? selectedExercise.metrics
      : typeof selectedExercise.metrics === "object" && selectedExercise.metrics !== null
      ? Object.keys(selectedExercise.metrics).filter((k) => (selectedExercise.metrics as Record<string, unknown>)[k] === true || (selectedExercise.metrics as Record<string, unknown>)[k] === 1)
      : [];

    return {
      showDistance: m.includes("distance") || m.includes("distance_meters"),
      showDuration: m.includes("duration") || m.includes("duration_sec"),
      showWeight: m.includes("weight"),
      showReps: m.includes("reps"),
    };
  }, [selectedExercise]);

  // Set default duration value in minutes from start and end time difference
  useEffect(() => {
    if (startTime && endTime) {
      const startParts = startTime.split(":");
      const endParts = endTime.split(":");
      if (startParts.length === 2 && endParts.length === 2) {
        const startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
        const endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
        const diff = endMin - startMin;
        if (diff > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDurationMins(String(diff));
          setDurationSecs("00");
        }
      }
    }
  }, [startTime, endTime]);

  // --- Save / Commit Handler ---
  const handleSave = async () => {
    if (!selectedExercise) {
      setError("Please select a cardio exercise.");
      return;
    }

    if (!date) {
      setError("Please select a date.");
      return;
    }

    if (!userId) {
      setError("User session not resolved. Please wait.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(`${date}T${endTime}:00`);
      
      let computedDurationSec = Math.max(
        0,
        Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 1000)
      );

      // Overwrite computed duration if manual duration inputs are provided
      const enteredMins = parseInt(durationMins, 10) || 0;
      const enteredSecs = parseInt(durationSecs, 10) || 0;
      const manualDurationSec = enteredMins * 60 + enteredSecs;
      if (manualDurationSec > 0) {
        computedDurationSec = manualDurationSec;
      }

      const workoutId = crypto.randomUUID();

      // 1. Create completed workout record
      const workoutRecord: LocalWorkout = {
        id: workoutId,
        user_id: userId,
        date: date,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        note: note.trim() || `Cardio Session - ${selectedExercise.name}`,
        duration_sec: computedDurationSec,
        completed: 1,
        is_dirty: 1,
        is_deleted: 0,
        updated_at: new Date().toISOString(),
      };

      // 2. Create completed set record linked to the workout
      const setRecord: LocalSet = {
        id: crypto.randomUUID(),
        workout_id: workoutId,
        user_id: userId,
        exercise_id: selectedExercise.id,
        set_number: 1,
        set_type: "MAIN",
        completed: 1,
        reps: activeMetrics.showReps ? parseInt(reps, 10) || null : null,
        weight: activeMetrics.showWeight ? parseFloat(weight) || null : null,
        distance_meters: activeMetrics.showDistance
          ? Math.round((parseFloat(distanceKm) || 0) * 1000) || null
          : null,
        duration_sec: activeMetrics.showDuration ? computedDurationSec || null : null,
        is_dirty: 1,
        is_deleted: 0,
        updated_at: new Date().toISOString(),
      };

      // Put records in IndexedDB
      await db.workouts.put(workoutRecord);
      await db.sets.put(setRecord);

      // 3. Invoke WorkoutService completeSession to reward XP, check inactivity penalties, and sync
      await WorkoutService.completeSession(workoutId, {
        date: workoutRecord.date,
        start_time: workoutRecord.start_time,
        end_time: workoutRecord.end_time,
        duration_sec: workoutRecord.duration_sec,
        note: workoutRecord.note,
        user_id: userId,
      });

      navigate("/");
    } catch (err) {
      console.error("[CardioLog] Error saving cardio workout:", err);
      setError("Failed to save session. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 pb-24">
      {/* Visual top HUD card */}
      <div
        className="rounded-3xl p-5 border relative overflow-hidden group shadow-lg"
        style={{
          background: "color-mix(in srgb, var(--card) 75%, transparent)",
          borderColor: "var(--border)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
            <Award size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-primary">
              Premium Performance
            </p>
            <h3 className="font-black text-sm uppercase tracking-tight text-foreground leading-none">
              Cardio Workouts HUD
            </h3>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Log your running, walking, cycling, or other cardiovascular sessions. FitTrack will automatically calculate metrics, compute durations, and reward **Cardio XP** to keep your streaks alive.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold uppercase tracking-wider">
          {error}
        </div>
      )}

      {/* Main logging form */}
      <div
        className="rounded-3xl p-6 border space-y-5 bg-card"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Date and Times */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Calendar size={11} strokeWidth={2.5} /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-4 rounded-xl text-xs font-bold bg-secondary border border-border text-foreground focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Clock size={11} strokeWidth={2.5} /> Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full h-11 px-4 rounded-xl text-xs font-bold bg-secondary border border-border text-foreground focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Clock size={11} strokeWidth={2.5} /> End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full h-11 px-4 rounded-xl text-xs font-bold bg-secondary border border-border text-foreground focus:outline-none"
            />
          </div>
        </div>

        {/* Exercise Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Dumbbell size={11} strokeWidth={2.5} /> Choose Exercise
          </label>

          {selectedExercise ? (
            <div
              onClick={() => setIsExercisePickerOpen(true)}
              className="flex items-center justify-between p-4 rounded-2xl bg-secondary border border-primary/20 hover:border-primary/40 cursor-pointer transition-all hover:bg-secondary/80"
            >
              <div className="flex flex-col">
                <span className="font-black text-sm uppercase tracking-tight text-primary">
                  {selectedExercise.name}
                </span>
                {(selectedExercise.variation || selectedExercise.equipment) && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    {selectedExercise.variation && <span>{selectedExercise.variation}</span>}
                    {selectedExercise.equipment && <span className="text-success">{selectedExercise.equipment}</span>}
                  </span>
                )}
              </div>
              <ChevronRight size={18} className="text-primary" />
            </div>
          ) : (
            <button
              onClick={() => setIsExercisePickerOpen(true)}
              className="w-full py-5 px-4 rounded-2xl bg-secondary border border-dashed border-border hover:border-primary/50 text-center text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all cursor-pointer"
            >
              + Tap to Choose Cardio Movement
            </button>
          )}
        </div>

        {/* Dynamic metrics form inputs */}
        {selectedExercise && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 p-5 rounded-2xl border bg-secondary/20"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-1.5">
              <TrendingUp size={12} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Activity Metrics
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Distance */}
              {activeMetrics.showDistance && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 5.25"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl text-xs font-bold bg-secondary border border-border text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                  />
                </div>
              )}

              {/* Manual Duration Override */}
              {activeMetrics.showDuration && (
                <div className="space-y-1.5 col-span-1 sm:col-span-2 grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                      Duration (Mins)
                    </label>
                    <input
                      type="number"
                      placeholder="Minutes"
                      value={durationMins}
                      onChange={(e) => setDurationMins(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl text-xs font-bold bg-secondary border border-border text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                      Seconds
                    </label>
                    <input
                      type="number"
                      placeholder="Seconds"
                      value={durationSecs}
                      onChange={(e) => setDurationSecs(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl text-xs font-bold bg-secondary border border-border text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Weight */}
              {activeMetrics.showWeight && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    placeholder="Weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl text-xs font-bold bg-secondary border border-border text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                  />
                </div>
              )}

              {/* Reps */}
              {activeMetrics.showReps && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                    Reps
                  </label>
                  <input
                    type="number"
                    placeholder="Reps"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl text-xs font-bold bg-secondary border border-border text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Note block */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <FileText size={11} strokeWidth={2.5} /> Notes
          </label>
          <textarea
            placeholder="Describe your cardio session (e.g. fast pace, hilly route, felt strong...)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full h-24 rounded-xl p-3.5 text-xs font-medium bg-secondary border border-border text-foreground focus:outline-none resize-none focus:border-primary/40 transition-colors"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-5 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-secondary text-foreground border border-border transition-all active:scale-95 cursor-pointer hover:bg-secondary/80"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !selectedExercise}
            className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-1.5"
            style={{
              boxShadow: "0 4px 16px color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          >
            {isSaving ? (
              <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
            ) : (
              <>
                <Check size={14} strokeWidth={2.5} />
                <span>Save Cardio</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* --- Nested Cardio Exercise Selector Modal --- */}
      <AnimatePresence>
        {isExercisePickerOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden">
            {/* Dark Mask */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExercisePickerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Sliding Drawer Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="relative w-full max-w-md h-[80vh] bg-background text-foreground rounded-t-[2.5rem] border-t border-border flex flex-col overflow-hidden shadow-2xl select-none"
              style={{ background: "var(--background)", borderColor: "var(--border)" }}
            >
              {/* Swipe handle */}
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-4 shrink-0" />

              {/* Title & Search bar */}
              <div className="px-6 pt-5 pb-3 space-y-4 shrink-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Select Cardio Movement
                  </h3>
                  <span className="text-[8px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">
                    {cardioExercises.length} Available
                  </span>
                </div>

                {/* Search input */}
                <div className="bg-secondary border border-border rounded-xl h-11 flex items-center px-3.5 gap-2.5">
                  <Search size={16} className="text-muted-foreground opacity-60" />
                  <input
                    placeholder="Search cardio movements..."
                    className="flex-1 text-xs font-bold bg-transparent outline-none placeholder:text-muted-foreground/40 text-foreground"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <X
                      size={14}
                      className="text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => setSearch("")}
                    />
                  )}
                </div>
              </div>

              {/* List space */}
              <div className="flex-1 overflow-y-auto px-6 pb-24 touch-pan-y no-scrollbar">
                <div className="space-y-1">
                  {filteredCardioExercises.map((ex) => {
                    const isChecked = selectedExercise?.id === ex.id;
                    return (
                      <button
                        key={ex.id}
                        onClick={() => {
                          setSelectedExercise(ex);
                          setIsExercisePickerOpen(false);
                          setSearch("");
                        }}
                        className="w-full py-4 flex items-center justify-between border-b border-border/40 transition-colors text-left active:bg-secondary/40 cursor-pointer"
                      >
                        <div className="flex flex-col min-w-0 pr-4">
                          <span
                            className={`font-black text-sm uppercase tracking-tight truncate ${
                              isChecked ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {ex.name}
                          </span>
                          {(ex.variation || ex.equipment) && (
                            <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                              {ex.variation && <span>{ex.variation}</span>}
                              {ex.equipment && <span className="text-success">{ex.equipment}</span>}
                            </span>
                          )}
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                            isChecked
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border bg-secondary"
                          }`}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}

                  {filteredCardioExercises.length === 0 && (
                    <div className="py-20 text-center text-muted-foreground opacity-40 flex flex-col items-center justify-center">
                      <Zap size={32} className="mb-2 text-primary" />
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        No cardio exercises found
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
