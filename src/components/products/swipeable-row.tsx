"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useSwipeable, type SwipeEventData } from "react-swipeable";

import { cn } from "@/lib/utils";

const ACTION_WIDTH = 88;
const REVEALED = ACTION_WIDTH * 2; // Edit + Delete side by side

/** True when the primary pointer supports hover (mouse/trackpad). */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = (event: MediaQueryListEvent) =>
      setIsDesktop(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

interface SwipeableRowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
  /** Accessible labels (SDD 07: templates rows are "alimento", not "producto"). */
  editLabel?: string;
  deleteLabel?: string;
}

/**
 * List row with Material-style actions (SDD 06):
 *  - touch devices: swipe left reveals Edit/Delete behind the row
 *  - desktop (hover-capable): no swipe; the actions appear on hover/focus
 * This is the shared pattern for every list (products, templates…).
 */
export function SwipeableRow({
  open,
  onOpenChange,
  onEdit,
  onDelete,
  children,
  editLabel = "Editar producto",
  deleteLabel = "Eliminar producto",
}: SwipeableRowProps) {
  const isDesktop = useIsDesktop();
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const handlers = useSwipeable({
    trackTouch: true,
    trackMouse: false,
    delta: 10,
    onSwiping: (event: SwipeEventData) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        setDragging(true);
        const base = open ? -REVEALED : 0;
        setDragX(Math.max(-REVEALED, Math.min(0, base + event.deltaX)));
      }
    },
    onSwiped: (event: SwipeEventData) => {
      setDragging(false);
      setDragX(0);
      // Past the halfway point the row stays open; otherwise it snaps back.
      onOpenChange(event.deltaX < -REVEALED / 2);
    },
  });

  // Desktop: hover-revealed icon actions on the right edge of the row.
  if (isDesktop) {
    return (
      <div className="group relative">
        <div className="relative z-10">{children}</div>
        <div className="absolute inset-y-0 right-0 z-20 flex items-center gap-1 bg-background pl-6 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            aria-label={editLabel}
            title="Editar"
            className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
          >
            <Pencil className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={deleteLabel}
            title="Eliminar"
            className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
          >
            <Trash2 className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  // Touch: swipe-to-reveal actions behind the row content.
  const offset = dragging ? dragX : open ? -REVEALED : 0;

  return (
    <div {...handlers} className="relative overflow-hidden">
      {/* Revealed actions (behind the content) */}
      <div className="absolute inset-y-0 right-0 z-0 flex">
        <button
          type="button"
          onFocus={() => onOpenChange(true)}
          onClick={onEdit}
          aria-label={editLabel}
          className="flex w-[88px] flex-col items-center justify-center gap-1 bg-primary text-on-primary"
        >
          <Pencil className="size-5" aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Editar
          </span>
        </button>
        <button
          type="button"
          onFocus={() => onOpenChange(true)}
          onClick={onDelete}
          aria-label={deleteLabel}
          className="flex w-[88px] flex-col items-center justify-center gap-1 bg-destructive text-destructive-foreground"
        >
          <Trash2 className="size-5" aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Eliminar
          </span>
        </button>
      </div>

      {/* Content: translated over the actions; transition only when not dragging */}
      <div
        className={cn(
          "relative z-10 bg-background",
          !dragging && "transition-transform duration-200 ease-out"
        )}
        style={{ transform: `translateX(${offset}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
