"use client";

import { useEffect } from "react";

import { setSyncStatus } from "@/lib/sync/sync-status";
import { sync } from "@/lib/sync/sync";

/**
 * Sync triggers. Connectivity events are triggers, not truth:
 * the sync loop itself decides by attempting the requests.
 *
 * A periodic retry keeps convergence without user action: a push
 * that fails once (e.g. FK order on a first pass) must not wait
 * for another event to succeed.
 */
const SYNC_INTERVAL_MS = 60_000;

export function useSyncTriggers() {
  useEffect(() => {
    void sync(); // On app start (reads the local session from storage).

    const handleOnline = () => void sync();
    const handleOffline = () => setSyncStatus("offline");
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void sync();
    };

    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void sync();
      }
    }, SYNC_INTERVAL_MS);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);
}
