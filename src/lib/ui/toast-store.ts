/**
 * Tiny toast pub-sub (SDD 06). No library on purpose: the app only needs
 * success feedback and the occasional real error. The host (ToastHost)
 * subscribes here; any module can call toast().
 */

export type ToastTone = "success" | "error";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

type Listener = (toasts: ToastItem[]) => void;

const TOAST_DURATION_MS = 3000;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener(toasts);
}

export function toast(message: string, tone: ToastTone = "success") {
  const id = nextId++;
  toasts = [...toasts, { id, message, tone }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((item) => item.id !== id);
    notify();
  }, TOAST_DURATION_MS);
}

/** Subscribes and immediately receives the current list. Returns an unsubscribe fn. */
export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}
