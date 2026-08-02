"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

/** Contextual floating action button, aligned to the content column. */
export function Fab({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Agregar"
      className="fixed bottom-20 right-margin-mobile z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-transform active:scale-95 sm:right-[calc((100vw-768px)/2+16px)]"
    >
      <Plus className="size-7" aria-hidden />
    </Link>
  );
}
