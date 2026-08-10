"use client";

import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/shell/bottom-nav";
import { Fab } from "@/components/shell/fab";
import { AppHeader } from "@/components/shell/header";

/** Screen titles, contextual FABs and back links keyed by route. */
const SCREENS: Record<string, { title: string; fab?: string; back?: string }> = {
  "/dashboard": { title: "Inicio", fab: "/meals/new" },
  "/templates": { title: "Plantillas", fab: "/templates/new" },
  "/templates/new": { title: "Nueva plantilla", back: "/templates" },
  "/products": { title: "Productos", fab: "/products/new" },
  "/products/new": { title: "Nuevo producto", back: "/products" },
  "/units": { title: "Unidades" },
  "/meals/new": { title: "Nueva comida", back: "/dashboard" },
};

interface ScreenConfig {
  title: string;
  fab?: string;
  back?: string;
}

/**
 * Resolves static routes plus the dynamic product, template and meal screens
 * (/products/[id], /products/[id]/edit, /templates/[id]/edit, /meals/[id]).
 */
function getScreen(pathname: string): ScreenConfig | undefined {
  const templateEdit = pathname.match(/^\/templates\/([^/]+)\/edit$/);
  if (templateEdit) return { title: "Editar plantilla", back: "/templates" };
  const productEdit = pathname.match(/^\/products\/([^/]+)\/edit$/);
  if (productEdit) return { title: "Editar", back: `/products/${productEdit[1]}` };
  const productDetail = pathname.match(/^\/products\/([^/]+)$/);
  if (productDetail) return { title: "Detalle", back: "/products" };
  const mealDetail = pathname.match(/^\/meals\/(?!new$)[^/]+$/);
  if (mealDetail) return { title: "Detalle", back: "/dashboard" };
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
