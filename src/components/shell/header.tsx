"use client";

import Link from "next/link";
import { ArrowLeft, Menu, Ruler, UserRound } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { SyncStatusIndicator } from "@/components/shell/sync-status-indicator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Top app bar: hamburger (Sheet drawer) + screen title.
 * Task-focused screens (e.g. product creation) swap the hamburger for a
 * back arrow. The drawer groups what does not fit in the bottom nav:
 * profile, temporary admin (Units) and sign out.
 */
export function AppHeader({ title, backHref }: { title: string; backHref?: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-outline-variant bg-surface">
      <div className="mx-auto flex h-touch-target-min w-full max-w-[768px] items-center justify-between px-margin-mobile">
        <div className="flex items-center gap-2">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="Volver"
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low"
            >
              <ArrowLeft className="size-6 text-primary" aria-hidden />
            </Link>
          ) : (
          <Sheet>
            <SheetTrigger className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low">
              <Menu className="size-6 text-primary" aria-hidden />
              <span className="sr-only">Abrir menú</span>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>NutriLog</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-1 px-2">
                <button
                  type="button"
                  disabled
                  className="flex h-12 items-center gap-3 rounded-lg px-3 text-body-lg text-on-surface-variant/60"
                  title="Próximamente"
                >
                  <UserRound className="size-5" aria-hidden />
                  Perfil
                </button>
                <Link
                  href="/units"
                  className="flex h-12 items-center gap-3 rounded-lg px-3 text-body-lg text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <Ruler className="size-5" aria-hidden />
                  Unidades
                </Link>
              </div>

              <SheetFooter>
                <SignOutButton />
              </SheetFooter>
            </SheetContent>
          </Sheet>
          )}

          <h1 className="font-title-md text-title-md font-bold text-primary">
            {title}
          </h1>
        </div>

        <SyncStatusIndicator />
      </div>
    </header>
  );
}
