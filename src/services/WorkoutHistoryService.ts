import { db } from "@/db";
import type { LocalWorkout, LocalExercise, LocalSet } from "@/db";

export interface WorkoutHistoryCard {
  workout: LocalWorkout;

  exercises: {
    id: string;
    name: string;
    count: number;
  }[];

  muscleGroups: string[];

  totalVolume: number;
  totalSets: number;
}

export async function getWorkoutHistoryDetails(
  workout: LocalWorkout,
): Promise<WorkoutHistoryCard> {
  // -----------------------------------------
  // 1. Fetch all sets for workout
  // -----------------------------------------
  const sets = await db.sets.where("workout_id").equals(workout.id).toArray();

  // -----------------------------------------
  // 2. Unique Exercise IDs
  // -----------------------------------------
  const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))];

  // -----------------------------------------
  // 3. Fetch Exercises
  // -----------------------------------------
  const exercises = await db.exercises.bulkGet(exerciseIds);

  const validExercises = exercises.filter(Boolean) as LocalExercise[];

  // -----------------------------------------
  // 4. Unique Muscle Group IDs
  // -----------------------------------------
  const muscleGroupIds = [
    ...new Set(validExercises.map((e) => e.muscle_group_id)),
  ];

  // -----------------------------------------
  // 5. Fetch Muscle Groups
  // -----------------------------------------
  const muscleGroups = await db.muscleGroups.bulkGet(muscleGroupIds);

  // -----------------------------------------
  // 6. Aggregate Exercise Counts
  // -----------------------------------------
  const exerciseMap = new Map<
    string,
    {
      id: string;
      name: string;
      count: number;
    }
  >();

  for (const set of sets) {
    const exercise = validExercises.find((e) => e.id === set.exercise_id);

    if (!exercise) continue;

    const existing = exerciseMap.get(exercise.id);

    if (existing) {
      existing.count += 1;
    } else {
      exerciseMap.set(exercise.id, {
        id: exercise.id,
        name: exercise.name,
        count: 1,
      });
    }
  }

  // -----------------------------------------
  // 7. Calculate Volume
  // -----------------------------------------
  const totalVolume = sets.reduce((sum, set) => {
    const reps = set.reps ?? 0;
    const weight = set.weight ?? 0;

    return sum + reps * weight;
  }, 0);

  // -----------------------------------------
  // 8. Muscle Group Labels
  // -----------------------------------------
  const muscleGroupLabels = muscleGroups.filter(Boolean).map((mg) => mg!.name);

  return {
    workout,
    exercises: [...exerciseMap.values()],
    muscleGroups: muscleGroupLabels,
    totalVolume,
    totalSets: sets.length,
  };
}
