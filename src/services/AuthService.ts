import { supabase } from "@/lib/supabase";
import { db } from "@/db";

export const AuthService = {
  async signIn(email: string, pass: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await supabase.auth.signOut();
    // Clear all tables on logout
    await db.delete();
    window.location.href = "/";
  },
};
