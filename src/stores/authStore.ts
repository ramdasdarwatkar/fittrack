import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthState, UserProfile } from "@/types/auth";

interface AuthActions {
  setAuth: (user: UserProfile) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      // Initial State
      user: null,
      isAuthenticated: false,
      isLoading: true,

      // Actions
      setAuth: (user) =>
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        }),

      clearAuth: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "fittrack-auth-storage", // Unique key for localStorage
      storage: createJSONStorage(() => localStorage),
      // Only persist the user and authentication status, not the loading state
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
