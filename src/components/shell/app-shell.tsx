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

interface ScreenConfig {
  title: string;
  fab?: string;
  back?: string;
}

/** Resolves static routes plus dynamic /products/[id] and /products/[id]/edit. */
function getScreen(pathname: string): ScreenConfig | undefined {
  const edit = pathname.match(/^\/products\/([^/]+)\/edit$/);
  if (edit) return { title: "Editar", back: `/products/${edit[1]}` };
  const detail = pathname.match(/^\/products\/([^/]+)$/);
  if (detail) return { title: "Detalle", back: "/products" };
  return SCREENS[pathname];
}

/**
 * Shell for authenticated screens (SDD 04): fixed header, contextual FAB
 * and bottom nav. Pages under src/app/(app)/ inherit it from the layout.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const screen = getScreen(pathname);

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
