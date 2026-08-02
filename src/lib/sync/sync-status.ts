/**
 * Minimal pub-sub for the sync state (SDD 06).
 * The sync loop emits facts here; the header chip and the error toast subscribe.
 * Kept dependency-free and tiny on purpose.
 */

export type SyncStatus = "syncing" | "synced" | "offline" | "error";

type Listener = (status: SyncStatus) => void;

let current: SyncStatus = "synced";
const listeners = new Set<Listener>();

function emit(status: SyncStatus) {
  if (status === current) return;
  current = status;
  for (const listener of listeners) listener(status);
}

/** Subscribes and immediately receives the current status. Returns an unsubscribe fn. */
export function subscribeSyncStatus(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncStatus(): SyncStatus {
  return current;
}

export function setSyncStatus(status: SyncStatus) {
  emit(status);
}
