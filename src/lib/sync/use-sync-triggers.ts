"use client";

import { useEffect } from "react";

import { sync } from "@/lib/sync/sync";

/**
 * Sync triggers. Connectivity events are triggers, not truth:
 * the sync loop itself decides by attempting the requests.
 */
export function useSyncTriggers() {
  useEffect(() => {
    void sync(); // On app start (reads the local session from storage).

    const handleOnline = () => void sync();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void sync();
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
}
