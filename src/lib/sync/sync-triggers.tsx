"use client";

import { useSyncTriggers } from "./use-sync-triggers";

/** Mounts once in the root layout to activate sync triggers. */
export function SyncTriggers() {
  useSyncTriggers();
  return null;
}
