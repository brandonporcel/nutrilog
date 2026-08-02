"use client";

import { AlertTriangle, Loader2, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import {
  getSyncStatus,
  subscribeSyncStatus,
  type SyncStatus,
} from "@/lib/sync/sync-status";

/**
 * Subtle sync state chip (SDD 06) in the app bar. Invisible when everything
 * is synced; only syncing, offline and error states get a chip — a toast
 * already covers real online errors.
 */
export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>(() => getSyncStatus());

  useEffect(() => subscribeSyncStatus(setStatus), []);

  if (status === "synced") return null;

  const content =
    status === "syncing" ? (
      <>
        <Loader2 className="size-4 animate-spin" aria-hidden />
        <span>Sincronizando</span>
      </>
    ) : status === "offline" ? (
      <>
        <WifiOff className="size-4" aria-hidden />
        <span>Sin conexión</span>
      </>
    ) : (
      <>
        <AlertTriangle className="size-4" aria-hidden />
        <span>Error de sync</span>
      </>
    );

  return (
    <span
      role="status"
      className={
        status === "error"
          ? "flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-label-caps text-destructive"
          : "flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1 text-label-caps text-on-surface-variant"
      }
    >
      {content}
    </span>
  );
}
