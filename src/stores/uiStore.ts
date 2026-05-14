import { create } from "zustand";
import { APP_TABS, type AppTab } from "@/types/navigation";

interface UIState {
  // Main Tab State
  activeTab: AppTab;

  // Sub-tab State (Generic string to handle different sections)
  activeSubTab: string | null;

  // App-wide UI States
  isKeyboardOpen: boolean;
  modalStack: string[]; // For Vaul bottom sheets
  isOnboardingComplete: boolean;

  // Actions
  setActiveTab: (tab: AppTab) => void;
  setActiveSubTab: (subTab: string | null) => void;
  setKeyboardOpen: (open: boolean) => void;
  pushModal: (id: string) => void;
  popModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: APP_TABS.DASHBOARD,
  activeSubTab: null,
  isKeyboardOpen: false,
  modalStack: [],
  isOnboardingComplete: false,

  setActiveTab: (tab) =>
    set({
      activeTab: tab,
      activeSubTab: null,
    }),

  setActiveSubTab: (subTab) => set({ activeSubTab: subTab }),

  setKeyboardOpen: (open) => set({ isKeyboardOpen: open }),

  pushModal: (id) =>
    set((state) => ({
      modalStack: [...state.modalStack, id],
    })),

  popModal: () =>
    set((state) => ({
      modalStack: state.modalStack.slice(0, -1),
    })),
}));
