"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageSearch, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SwipeableRow } from "@/components/products/swipeable-row";
import { CategoryIcon } from "@/lib/icons/category-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { type Category } from "@/lib/db/database";
import { formatNumber } from "@/lib/format";
import { categoriesRepository } from "@/lib/repositories/categories";
import {
  productsRepository,
  type ProductListItem,
} from "@/lib/repositories/products";
import { ensureUserCatalog } from "@/lib/seeder";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast-store";

function servingCaption(item: ProductListItem): string {
  const parts = [item.serving_amount, item.serving_unit_name].filter(Boolean);
  const text = `por ${parts.join(" ")}`;
  return item.serving_weight_grams ? `${text} (${item.serving_weight_grams} g)` : text;
}

export default function ProductsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setUserId(data.session?.user.id ?? null);
      });
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [list, cats] = await Promise.all([
      productsRepository.getListItems(userId),
      categoriesRepository.getAll(userId),
    ]);
    setProducts(list);
    setCategories(cats);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    // Seeds the catalog once per user (no-op when already seeded).
    void ensureUserCatalog(userId).then(refresh);
  }, [userId, refresh]);

  // Scrolling closes any open row (Material behavior for swipe actions).
  useEffect(() => {
    const closeRow = () => setOpenRowId(null);
    window.addEventListener("scroll", closeRow, { passive: true });
    return () => window.removeEventListener("scroll", closeRow);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      if (categoryId && product.category_id !== categoryId) return false;
      if (!term) return true;
      const haystack = `${product.name} ${product.brand_name ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [products, query, categoryId]);

  const noProductsYet = !loading && products.length === 0;
  const noResults = !loading && products.length > 0 && filtered.length === 0;

  async function handleDelete() {
    if (!userId || !deleteTarget) return;
    await productsRepository.softDelete(userId, deleteTarget.id);
    setProducts((current) =>
      current.filter((product) => product.id !== deleteTarget.id)
    );
    setDeleteTarget(null);
    toast("Producto eliminado");
  }

  return (
    <div className="flex flex-col">
      {/* Search + category chips */}
      <div className="sticky top-[48px] z-30 border-b border-outline-variant bg-surface px-margin-mobile py-2">
        <div className="relative mb-2 mt-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <PackageSearch className="size-5 text-on-surface-variant" aria-hidden />
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar productos…"
            aria-label="Buscar productos"
            className="block h-touch-target-min w-full rounded-xl border border-outline-variant bg-surface-container pl-10 pr-3 text-body-lg text-on-surface outline-none transition-all placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setCategoryId("")}
            className={
              categoryId === ""
                ? "flex-none rounded-full border border-primary bg-primary-container px-4 py-1.5 text-label-caps text-on-primary-container"
                : "flex-none rounded-full border border-outline-variant bg-surface px-4 py-1.5 text-label-caps text-on-surface-variant transition-colors hover:bg-surface-container-low"
            }
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className={
                categoryId === category.id
                  ? "flex-none rounded-full border border-primary bg-primary-container px-4 py-1.5 text-label-caps text-on-primary-container"
                  : "flex-none rounded-full border border-outline-variant bg-surface px-4 py-1.5 text-label-caps text-on-surface-variant transition-colors hover:bg-surface-container-low"
              }
            >
              {category.name.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <p className="px-margin-mobile py-6 text-body-sm-dense text-on-surface-variant">
          Cargando…
        </p>
      )}

      {/* Empty catalog */}
      {noProductsYet && (
        <div className="flex flex-col items-center gap-4 px-margin-mobile py-16 text-center">
          <p className="text-body-lg text-on-surface">
            Todavía no tenés productos.
          </p>
          <p className="text-body-sm-dense text-on-surface-variant">
            Cargá tu primer alimento con la información de la etiqueta o de
            Google.
          </p>
          <Button
            render={<Link href="/products/new" />}
            nativeButton={false}
          >
            <Plus />
            Crear el primero
          </Button>
        </div>
      )}

      {/* No search results */}
      {noResults && (
        <p className="px-margin-mobile py-6 text-body-sm-dense text-on-surface-variant">
          {query.trim()
            ? `Sin resultados para “${query.trim()}”.`
            : "No hay productos en esta categoría."}
        </p>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div
          className="flex flex-col divide-y divide-outline-variant"
          onClick={() => setOpenRowId(null)}
        >
          {filtered.map((product) => (
            <SwipeableRow
              key={product.id}
              open={openRowId === product.id}
              onOpenChange={(open) =>
                setOpenRowId((current) => (open ? product.id : current === product.id ? null : current))
              }
              onEdit={() => router.push(`/products/${product.id}/edit`)}
              onDelete={() => setDeleteTarget(product)}
            >
              <Link
                href={`/products/${product.id}`}
                className="flex items-center px-margin-mobile py-3 transition-colors active:bg-surface-container"
              >
                <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary">
                  <CategoryIcon
                    icon={product.category_icon}
                    className="size-5"
                  />
                </div>
                <div className="min-w-0 flex-grow">
                  <h3 className="truncate text-body-lg font-semibold text-on-surface">
                    {product.name}
                  </h3>
                  <p className="truncate text-body-sm-dense text-on-surface-variant">
                    {product.brand_name ?? "Sin marca"}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 text-right">
                  <span className="text-numeric-data text-primary">
                    {formatNumber(product.protein)} g
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-tight text-on-surface-variant">
                    {servingCaption(product)}
                  </p>
                </div>
              </Link>
            </SwipeableRow>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.name}” se quita de tu lista de productos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
