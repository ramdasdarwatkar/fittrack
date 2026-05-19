import { db } from "@/db";
import { supabase } from "@/lib/supabase";

export const MuscleGroupService = {
  /**
   * Retrieves all muscle groups stored in the static local reference table.
   */
  async getAll() {
    return await db.muscleGroups.toArray();
  },

  /**
   * Finds a specific muscle group definition record by its numeric identifier.
   */
  async getOne(id: number) {
    return await db.muscleGroups.get(id);
  },

  /**
   * Reference Pull Operation: Clears the local static cache, downloads
   * the absolute source matrix from Supabase, and populates the database.
   */
  async pull() {
    const { data, error } = await supabase.from("muscle_groups").select("*");

    if (!error && data) {
      await db.transaction("rw", db.muscleGroups, async () => {
        await db.muscleGroups.clear();
        await db.muscleGroups.bulkPut(data);
      });
    }
  },
};

export const MuscleService = {
  /**
   * Retrieves all muscle rows stored in the local reference table.
   */
  async getAll() {
    return await db.muscles.toArray();
  },

  /**
   * Finds a single muscle record by its numeric identifier.
   */
  async getOne(id: number) {
    return await db.muscles.get(id);
  },

  /**
   * Helper filter: Retrieves muscles belonging exclusively to a specific group.
   */
  async getByGroup(groupId: number) {
    return await db.muscles.where("muscle_group").equals(groupId).toArray();
  },

  /**
   * Reference Pull Operation: Syncs target muscle categories cleanly down into client cache files.
   */
  async pull() {
    const { data, error } = await supabase.from("muscles").select("*");

    if (!error && data) {
      await db.transaction("rw", db.muscles, async () => {
        await db.muscles.clear();
        await db.muscles.bulkPut(data);
      });
    }
  },
};
