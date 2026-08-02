"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { subscribeToasts, type ToastItem } from "@/lib/ui/toast-store";

/**
 * Global toast container (SDD 06). Mounted once in the root layout;
 * individual screens never render their own toasts anymore.
 */
export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex flex-col items-center gap-2 px-4">
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-full px-6 py-3 text-label-caps shadow-xl",
            item.tone === "error"
              ? "bg-destructive text-destructive-foreground"
              : "bg-foreground text-background"
          )}
        >
          {item.tone === "error" ? (
            <XCircle className="size-5" aria-hidden />
          ) : (
            <CheckCircle2 className="size-5 text-primary" aria-hidden />
          )}
          {item.message}
        </div>
      ))}
    </div>
  );
}
