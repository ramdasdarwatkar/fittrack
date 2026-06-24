import { db } from "@/db";
import type { LocalRoutine } from "@/db";

export interface SuggestedWorkout {
  routine: LocalRoutine;
  reason: string;
  sequenceNumber: number;
}

export const WorkoutSuggestionService = {
  /**
   * Evaluates and returns the next recommended routine for the user.
   */
  async getSuggestedWorkout(userId: string): Promise<SuggestedWorkout | null> {
    if (!userId) return null;

    // 1. Get all active routines for this user that have a valid sequence number
    const routines = await db.routines
      .where("user_id")
      .equals(userId)
      .filter((r) => r.is_deleted === 0 && r.user_id === userId && r.sequence_number !== null && typeof r.sequence_number === "number")
      .toArray() as (LocalRoutine & { sequence_number: number })[];

    if (routines.length === 0) return null;

    // 2. Find the last completed workout that has a routine_id
    const lastWorkout = await db.workouts
      .where("user_id")
      .equals(userId)
      .filter((w) => w.completed === 1 && w.is_deleted === 0 && !!w.routine_id && w.user_id === userId)
      .toArray();

    // Sort by date/start_time descending to get the absolute last workout
    const sortedWorkouts = lastWorkout.sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );

    const mostRecentWorkout = sortedWorkouts[0];

    // If we have a recent workout, find its routine sequence number
    if (mostRecentWorkout && mostRecentWorkout.routine_id) {
      const lastRoutine = await db.routines.get(mostRecentWorkout.routine_id);
      
      if (lastRoutine && lastRoutine.user_id === userId) {
        const lastSeq = typeof lastRoutine.sequence_number === "number" ? lastRoutine.sequence_number : null;
        
        if (lastSeq !== null) {
          // Look for next sequence: lastSeq + 1
          const nextRoutine = routines.find((r) => r.sequence_number === lastSeq + 1);
          if (nextRoutine) {
            return {
              routine: nextRoutine,
              reason: `Follows your last routine "${lastRoutine.name}" (Seq #${lastSeq})`,
              sequenceNumber: nextRoutine.sequence_number,
            };
          }
          
          // If lastSeq + 1 doesn't exist, try wrapping around to sequence number 1
          const firstRoutine = routines.find((r) => r.sequence_number === 1);
          if (firstRoutine) {
            return {
              routine: firstRoutine,
              reason: `Restarting progression loop from Seq #1 after "${lastRoutine.name}" (Seq #${lastSeq})`,
              sequenceNumber: 1,
            };
          }
        }
      }
    }

    // Default Fallbacks:
    // Try to find the routine with sequence number 1
    const seq1Routine = routines.find((r) => r.sequence_number === 1);
    if (seq1Routine) {
      return {
        routine: seq1Routine,
        reason: "Start your routine progression with Sequence #1",
        sequenceNumber: 1,
      };
    }

    // Otherwise, pick the routine with the lowest sequence number
    const sortedBySeq = routines.sort((a, b) => a.sequence_number - b.sequence_number);
    return {
      routine: sortedBySeq[0],
      reason: `Suggested starting point (Seq #${sortedBySeq[0].sequence_number})`,
      sequenceNumber: sortedBySeq[0].sequence_number,
    };
  },
};
