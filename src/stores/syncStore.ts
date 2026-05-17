import { create } from "zustand";
import { SyncService } from "@/services/SyncService";

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  error: string | null;
  performSync: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastSyncTime: null,
  error: null,
  performSync: async () => {
    if (!navigator.onLine) {
      set({ error: "Offline: Cannot sync right now." });
      return;
    }

    set({ isSyncing: true, error: null });
    try {
      // Run both Pull and Push
      await SyncService.pullAll();
      await SyncService.pushAll();

      set({ lastSyncTime: new Date(), isSyncing: false });
    } catch (err: any) {
      set({ error: err.message || "Sync failed", isSyncing: false });
    }
  },
}));
