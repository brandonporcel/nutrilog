"use client";

import { ArrowLeft, Check, Minus, PackageSearch, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CategoryIcon } from "@/lib/icons/category-icon";
import {
  productsRepository,
  type ProductListItem,
} from "@/lib/repositories/products";
import { createClient } from "@/lib/supabase/client";

/** Accepts both "." and "," decimal separators; clamps to a positive value. */
function toQuantity(value: string): number {
  const n = Number(value.trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function servingCaption(item: ProductListItem): string {
  const parts = [item.serving_amount, item.serving_unit_name].filter(Boolean);
  const text = `por ${parts.join(" ")}`;
  return item.serving_weight_grams
    ? `${text} (${item.serving_weight_grams} g)`
    : text;
}

/** Adds one serving to the draft on confirm (quantity step → pick step). */
export interface AddItemResult {
  product: ProductListItem;
  quantity: number;
}

interface AddItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Confirmed product + quantity; the editor upserts it into the draft. */
  onItemChange: (result: AddItemResult) => void;
  /** When set, the sheet opens on the quantity step for this existing item. */
  editing?: { product_id: string; quantity: number } | null;
}

/**
 * Product picker for template items (SDD 07), a two-step bottom sheet:
 *  1) search + list of products, 2) quantity stepper with quick chips.
 * It lives inside the editor so the draft never loses context; the
 * full-screen numpad from the Stitch design arrives with the daily log
 * (Epic 2), where it belongs.
 */
export function AddItemSheet({
  open,
  onOpenChange,
  onItemChange,
  editing,
}: AddItemSheetProps) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<"pick" | "amount">("pick");
  const [selected, setSelected] = useState<ProductListItem | null>(null);
  const [quantity, setQuantity] = useState("1");

  // Load the catalog whenever the sheet opens and reset to the pick step.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      setLoading(true);
      if (!editing) {
        setStep("pick");
        setSelected(null);
        setQuantity("1");
        setQuery("");
      }
      const { data } = await createClient().auth.getSession();
      const userId = data.session?.user.id;
      if (!userId || cancelled) return;
      const list = await productsRepository.getListItems(userId);
      if (cancelled) return;
      setProducts(list);
      setLoading(false);

      // Edit mode: jump straight to the quantity step for that product.
      if (editing) {
        const product = list.find((p) => p.id === editing.product_id);
        if (product) {
          setSelected(product);
          setQuantity(String(editing.quantity));
          setStep("amount");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, editing]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      `${product.name} ${product.brand_name ?? ""}`.toLowerCase().includes(term)
    );
  }, [products, query]);

  const qty = toQuantity(quantity);
  const protein = selected ? Math.round(qty * selected.protein * 10) / 10 : 0;
  const calories = selected ? Math.round(qty * selected.calories) : 0;

  function pickProduct(product: ProductListItem) {
    setSelected(product);
    setQuantity(editing?.product_id === product.id ? String(editing.quantity) : "1");
    setStep("amount");
  }

  function confirm() {
    if (!selected) return;
    onItemChange({ product: selected, quantity: toQuantity(quantity) });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={step === "pick"}
        className="mx-auto max-h-[85dvh] rounded-t-2xl sm:max-w-md"
      >
        <SheetHeader className="border-b border-outline-variant">
          {step === "amount" && selected && (
            <button
              type="button"
              onClick={() => {
                setStep("pick");
                setSelected(null);
              }}
              aria-label="Volver a buscar alimentos"
              className="absolute left-3 top-3 flex size-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-container-low"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </button>
          )}
          <SheetTitle className="text-center font-title-md text-on-surface">
            {step === "pick" ? "Buscar alimento" : selected?.name}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {step === "pick"
              ? "Elegí un producto de tu lista para agregarlo a la plantilla."
              : "Elegí la cantidad y confirmá."}
          </SheetDescription>
        </SheetHeader>

        {step === "pick" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative px-4 pb-2 pt-3">
              <div className="pointer-events-none absolute inset-y-0 left-0 ml-7 flex items-center">
                <PackageSearch className="size-5 text-on-surface-variant" aria-hidden />
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar productos…"
                aria-label="Buscar productos"
                autoFocus
                className="block h-touch-target-min w-full rounded-xl border border-outline-variant bg-surface-container pl-10 pr-3 text-body-lg text-on-surface outline-none transition-all placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
              {loading && (
                <p className="px-4 py-6 text-body-sm-dense text-on-surface-variant">
                  Cargando…
                </p>
              )}
              {!loading && filtered.length === 0 && (
                <p className="px-4 py-6 text-body-sm-dense text-on-surface-variant">
                  {query.trim()
                    ? `Sin resultados para “${query.trim()}”.`
                    : "Todavía no tenés productos."}
                </p>
              )}
              {!loading &&
                filtered.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => pickProduct(product)}
                    className="flex w-full items-center rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-container-low active:bg-surface-container"
                  >
                    <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary">
                      <CategoryIcon
                        icon={product.category_icon}
                        className="size-5"
                      />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className="truncate text-body-lg font-semibold text-on-surface">
                        {product.name}
                      </p>
                      <p className="truncate text-body-sm-dense text-on-surface-variant">
                        {product.brand_name ?? "Sin marca"} ·{" "}
                        <span className="text-primary">
                          {product.protein} g prot
                        </span>
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          selected && (
            <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-4 pt-4">
              {/* Estimated result for the chosen quantity */}
              <div className="rounded-xl border border-outline-variant bg-surface p-4 text-center">
                <p className="text-label-caps uppercase text-on-surface-variant">
                  Resultado estimado
                </p>
                <p className="text-display-protein font-bold text-primary">
                  {protein} g
                </p>
                <p className="text-title-md text-primary/80">Proteína</p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-container px-4 py-1 text-numeric-data text-secondary">
                  {calories} kcal
                </div>
                <p className="mt-2 text-body-sm-dense text-on-surface-variant">
                  {servingCaption(selected)}
                </p>
              </div>

              {/* Stepper */}
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) => {
                      const next = toQuantity(current) - 0.5;
                      return String(next < 0.5 ? 0.5 : next);
                    })
                  }
                  aria-label="Disminuir cantidad"
                  className="flex size-14 items-center justify-center rounded-full border-2 border-primary text-primary transition-transform active:scale-90"
                >
                  <Minus className="size-6" aria-hidden />
                </button>
                <input
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  inputMode="decimal"
                  aria-label="Cantidad de porciones"
                  className="w-20 bg-transparent text-center text-display-protein font-bold text-on-surface outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((current) => String(toQuantity(current) + 1))}
                  aria-label="Aumentar cantidad"
                  className="flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-md transition-transform active:scale-90"
                >
                  <Plus className="size-6" aria-hidden />
                </button>
              </div>

              {/* Quick chips */}
              <div className="flex flex-wrap justify-center gap-2">
                {["0.5", "1", "2", "3"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantity(preset)}
                    className={
                      quantity === preset
                        ? "rounded-full border-2 border-primary bg-primary px-5 py-2 text-label-caps text-on-primary shadow-sm"
                        : "rounded-full border border-outline-variant px-5 py-2 text-label-caps text-on-surface-variant transition-colors hover:bg-surface-container-low"
                    }
                  >
                    {preset.endsWith(".5") ? "½" : preset}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                onClick={confirm}
                className="h-14 w-full rounded-full text-title-md"
              >
                <Check className="size-5" aria-hidden />
                {editing?.product_id === selected.id ? "Actualizar" : "Agregar"}
              </Button>
            </div>
          )
        )}
      </SheetContent>
    </Sheet>
  );
}
