import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { WorkoutService } from "@/services/WorkoutService";
import { WorkoutSetService } from "@/services/SetService";
import { RoutineService } from "@/services/RoutineService";
import { useWorkoutUIStore } from "@/stores/useWorkoutUIStore";
import type { Tables } from "@/db/supabase";
import type { LocalSet } from "@/db";

interface InitializerProps {
  userId: string | null;
  setUserId: (id: string | null) => void;
  activeWorkout: Tables<"workouts"> | undefined;
}

export function useWorkoutInitializer({
  userId,
  setUserId,
  activeWorkout,
}: InitializerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setExpanded, setExerciseOrder, clearUIState } = useWorkoutUIStore();
  const initRef = useRef(false);
  const mode = searchParams.get("mode");

  useEffect(() => {
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setUserId(user.id);
      });
    });
  }, [setUserId]);

  useEffect(() => {
    if (!userId || activeWorkout || !mode || initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        clearUIState();
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        switch (mode) {
          case "live":
            await WorkoutService.initializeSession({
              id,
              user_id: userId,
              date: now.split("T")[0],
              start_time: now,
            });
            break;

          case "rest": {
            const restDate = searchParams.get("date") || now.split("T")[0];
            await WorkoutService.initializeSession({
              id,
              user_id: userId,
              date: restDate,
              start_time: `${restDate}T00:00:00Z`,
              end_time: `${restDate}T23:59:59Z`,
              note: "REST_DAY",
            });
            break;
          }

          case "retro": {
            const rDate = searchParams.get("date")!;
            const rStart = `${rDate}T${searchParams.get("startTime")}:00Z`;
            const rEnd = `${rDate}T${searchParams.get("endTime")}:00Z`;
            await WorkoutService.initializeSession({
              id,
              user_id: userId,
              date: rDate,
              start_time: rStart,
              end_time: rEnd,
              duration_sec: Math.floor(
                (new Date(rEnd).getTime() - new Date(rStart).getTime()) / 1000,
              ),
            });
            break;
          }

          case "routine": {
            const template = await RoutineService.getFullRoutine(
              searchParams.get("routineId")!,
            );
            if (template) {
              const w = await WorkoutService.initializeSession({
                id,
                user_id: userId,
                date: now.split("T")[0],
                start_time: now,
              });
              const setsToInsert: LocalSet[] = [];
              template.exercises.sort(
                (a, b) => a.sequence_number - b.sequence_number,
              );
              template.exercises.forEach((re, exIdx) => {
                for (let s = 1; s <= (re.sets || 3); s++) {
                  setsToInsert.push({
                    id: crypto.randomUUID(),
                    workout_id: w.id,
                    user_id: userId,
                    exercise_id: re.exercise_id,
                    set_number: exIdx + 1 + s / 10, // Dot-Notation Sequence
                    set_type: "MAIN",
                    completed: 0 as const,
                    is_dirty: 1 as const,
                    is_deleted: 0 as const,
                    updated_at: now,
                    reps: null,
                    weight: null,
                    distance_meters: null,
                    duration_sec: null,
                  });
                }
              });
              await WorkoutSetService.addBatchSets(setsToInsert);
              setExerciseOrder(template.exercises.map((e) => e.exercise_id));
            }
            break;
          }

          case "clone": {
            const pastSets = await WorkoutSetService.getSetsForWorkout(
              searchParams.get("cloneId")!,
            );
            const w = await WorkoutService.initializeSession({
              id,
              user_id: userId,
              date: now.split("T")[0],
              start_time: now,
            });
            pastSets.sort(
              (a, b) => Number(a.set_number) - Number(b.set_number),
            );
            const uniqueExIds = Array.from(
              new Set(pastSets.map((s) => s.exercise_id)),
            );
            const setsToInsert: LocalSet[] = pastSets.map((ps) => ({
              ...ps,
              id: crypto.randomUUID(),
              workout_id: w.id,
              set_number:
                uniqueExIds.indexOf(ps.exercise_id) +
                1 +
                (ps.set_number % 1 || 0.01) * 1, // Re-map to new sequence
              completed: 0 as const,
              is_dirty: 1 as const,
              is_deleted: 0 as const,
            }));
            await WorkoutSetService.addBatchSets(setsToInsert);
            setExerciseOrder(uniqueExIds);
            break;
          }
        }
        setSearchParams({}, { replace: true });
      } catch (e) {
        console.error("Init failed:", e);
        initRef.current = false;
      }
    })();
  }, [
    userId,
    activeWorkout,
    mode,
    searchParams,
    setSearchParams,
    setExpanded,
    setExerciseOrder,
    clearUIState,
  ]);
}
