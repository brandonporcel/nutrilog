"use client";

import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/shell/bottom-nav";
import { Fab } from "@/components/shell/fab";
import { AppHeader } from "@/components/shell/header";

/** Screen titles, contextual FABs and back links keyed by route. */
const SCREENS: Record<string, { title: string; fab?: string; back?: string }> = {
  "/dashboard": { title: "Inicio" },
  "/history": { title: "Histórico" },
  "/templates": { title: "Modelos" },
  "/products": { title: "Productos", fab: "/products/new" },
  "/products/new": { title: "Nuevo producto", back: "/products" },
  "/units": { title: "Unidades" },
};

/**
 * Shell for authenticated screens (SDD 04): fixed header, contextual FAB
 * and bottom nav. Pages under src/app/(app)/ inherit it from the layout.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const screen =
    SCREENS[pathname] ??
    (pathname.startsWith("/products/") && pathname !== "/products/new"
      ? { title: "Detalle", back: "/products" }
      : undefined);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={screen?.title ?? "NutriLog"} backHref={screen?.back} />
      <main className="mx-auto w-full max-w-[768px] flex-1 pt-16 pb-28">
        {children}
      </main>
      {screen?.fab && <Fab href={screen.fab} />}
      {/* Task-focused screens (with a back arrow) cover the bottom nav. */}
      {!screen?.back && <BottomNav />}
    </div>
  );
}
