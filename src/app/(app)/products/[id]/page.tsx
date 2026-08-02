"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

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
import {
  productsRepository,
  type ProductDetail,
} from "@/lib/repositories/products";
import { CategoryIcon } from "@/lib/icons/category-icon";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast-store";

function servingText(product: ProductDetail): string {
  const parts = [product.serving_amount, product.serving_unit_name].filter(
    Boolean
  );
  const base = parts.length
    ? `por ${parts.join(" ")}`
    : "Porción sin definir";
  return product.serving_weight_grams
    ? `${base} (${product.serving_weight_grams} g)`
    : base;
}

function MacroCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-outline-variant bg-surface p-4">
      <span className="text-label-caps uppercase text-on-surface-variant">
        {label}
      </span>
      <span className="text-headline-lg-mobile font-semibold text-on-surface">
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-1 text-label-caps uppercase text-on-surface-variant">
      {children}
    </h2>
  );
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [state, setState] = useState<"loading" | "found" | "missing">(
    "loading"
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(async ({ data }) => {
        const currentUserId = data.session?.user.id;
        if (!currentUserId) return;
        setUserId(currentUserId);
        const detail = await productsRepository.getDetail(currentUserId, params.id);
        setProduct(detail);
        setState(detail ? "found" : "missing");
      });
  }, [params.id]);

  async function handleDelete() {
    if (!userId) return;
    await productsRepository.softDelete(userId, params.id);
    setConfirmDelete(false);
    toast("Producto eliminado");
    router.push("/products");
  }

  if (state === "loading") {
    return (
      <p className="px-margin-mobile py-6 text-body-sm-dense text-on-surface-variant">
        Cargando…
      </p>
    );
  }

  if (state === "missing" || !product) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-margin-mobile text-center">
        <p className="text-body-lg text-on-surface">Producto no encontrado.</p>
        <Link
          href="/products"
          className="text-body-lg text-primary underline-offset-4 hover:underline"
        >
          Volver a productos
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-margin-mobile pb-32 pt-4">
      {/* Identificación */}
      <section className="flex flex-col gap-2">
        <SectionTitle>Identificación</SectionTitle>
        <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary">
              <CategoryIcon
                icon={product.category_id ? product.category_icon : null}
                className="size-6"
              />
            </div>
            <h1 className="text-headline-lg-mobile text-on-surface">
              {product.name}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.brand_name && (
              <span className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-label-caps text-on-surface-variant">
                {product.brand_name}
              </span>
            )}
            {product.category_name ? (
              <span className="rounded-full border border-primary bg-primary-container px-3 py-1 text-label-caps text-on-primary-container">
                {product.category_name}
              </span>
            ) : (
              <span className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-label-caps text-on-surface-variant">
                Sin categoría
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Porción */}
      <section className="flex flex-col gap-2">
        <SectionTitle>Porción</SectionTitle>
        <div className="rounded-xl border border-outline-variant bg-surface p-4">
          <p className="text-body-lg text-on-surface">
            {servingText(product)}
          </p>
        </div>
      </section>

      {/* Nutrición */}
      <section className="flex flex-col gap-2">
        <SectionTitle>Información nutricional</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-primary bg-primary-container p-5 text-on-primary-container">
            <span className="text-label-caps uppercase opacity-80">
              Proteína
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-display-protein font-bold">
                {product.protein}
              </span>
              <span className="text-title-md">g</span>
            </div>
            <p className="text-body-sm-dense opacity-70">
              {servingText(product)}
            </p>
          </div>

          <MacroCard label="Calorías" value={`${product.calories} kcal`} />
          <MacroCard label="Carbos" value={`${product.carbs} g`} />
          <MacroCard label="Grasas" value={`${product.fat} g`} />
          <MacroCard label="Fibras" value={`${product.fiber} g`} />
        </div>
      </section>

      {/* Actions (the bottom nav is hidden on this screen) */}
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface p-margin-mobile">
        <div className="mx-auto flex max-w-[768px] gap-3">
          <Button
            render={<Link href={`/products/${product.id}/edit`} />}
            nativeButton={false}
            className="h-touch-target-min flex-1 rounded-full text-title-md"
          >
            Editar
          </Button>
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            className="h-touch-target-min flex-1 rounded-full text-title-md"
          >
            Eliminar
          </Button>
        </div>
      </footer>

      {/* Delete confirmation */}
      <AlertDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(false);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              “{product.name}” se quita de tu lista de productos.
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
