import { useEffect } from "react";
import { useSyncStore } from "@/stores/syncStore";

export function useSyncTrigger() {
  const performSync = useSyncStore((state) => state.performSync);

  useEffect(() => {
    // 1. Sync when coming back online
    const handleOnline = () => performSync();
    window.addEventListener("online", handleOnline);

    // 2. Periodic sync every 5 minutes
    const interval = setInterval(
      () => {
        performSync();
      },
      1000 * 60 * 5,
    );

    // 3. Initial sync on app load
    performSync();

    return () => {
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, [performSync]);
}
