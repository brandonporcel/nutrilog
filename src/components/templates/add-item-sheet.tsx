"use client";

import {
  ArrowLeft,
  Check,
  LayoutTemplate,
  Minus,
  PackageSearch,
  Plus,
} from "lucide-react";
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
import { formatNumber } from "@/lib/format";
import {
  isWeightUnit,
  servingsFor,
  weightGramsFor,
} from "@/lib/portion";
import { dailyLogRepository } from "@/lib/repositories/daily-log";
import {
  productsRepository,
  type ProductListItem,
} from "@/lib/repositories/products";
import { type TemplateSummary, unitLabel } from "@/lib/repositories/templates";
import { pluralUnit } from "@/lib/use-draft-items";
import { createClient } from "@/lib/supabase/client";

/** Accepts both "." and "," decimal separators; clamps to a positive value. */
function toQuantity(value: string): number {
  const n = Number(value.trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * "por 1 unidad (60 g)" / "por 2 rebanadas (50 g)" / "por 250 g".
 * Quantity-aware: weight and plurals follow the value the user picked.
 */
function servingCaption(item: ProductListItem, quantity: number): string {
  const unit = unitLabel(item.serving_unit_name);
  const amount = formatNumber(quantity, 2);
  if (isWeightUnit(item.serving_unit_name)) {
    return `por ${amount} ${unit}`;
  }
  const weight = weightGramsFor(quantity, item);
  const text = `por ${amount} ${pluralUnit(quantity, unit)}`;
  return weight !== null ? `${text} (${formatNumber(weight)} g)` : text;
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
  /** When provided, the pick step shows a Plantillas tab (SDD 08). */
  templates?: TemplateSummary[];
  /** Template picked from the tab; the editor loads all its items. */
  onTemplatePick?: (template: TemplateSummary) => void;
}

/**
 * Product picker for template items (SDD 07) and daily meals (SDD 08):
 * a two-step bottom sheet — 1) search + list of products (or templates),
 * 2) quantity stepper with quick chips. It lives inside the editor so the
 * draft never loses context.
 */
export function AddItemSheet({
  open,
  onOpenChange,
  onItemChange,
  editing,
  templates,
  onTemplatePick,
}: AddItemSheetProps) {
  // On touch devices auto-focusing the search pops the keyboard open the
  // instant the sheet appears; on desktop it is the fastest way to start.
  const desktopOnly = useMemo(
    () =>
      typeof window !== "undefined" &&
      !(window.matchMedia?.("(pointer: coarse)").matches ?? false),
    []
  );
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [frequentIds, setFrequentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"frequent" | "products" | "templates">(
    "frequent"
  );
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
        setTab("frequent");
        setSelected(null);
        setQuantity("1");
        setQuery("");
      }
      const { data } = await createClient().auth.getSession();
      const userId = data.session?.user.id;
      if (!userId || cancelled) return;
      const [list, frequent] = await Promise.all([
        productsRepository.getListItems(userId),
        dailyLogRepository.getFrequentProductIds(userId, 10),
      ]);
      if (cancelled) return;
      setProducts(list);
      setFrequentIds(frequent);
      setLoading(false);

      // Without frequent products the Frecuentes tab would be empty: land
      // on the full catalog instead (still user-switchable).
      if (!editing && frequent.length === 0) setTab("products");

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

  const hasTemplatesTab = templates !== undefined && onTemplatePick !== undefined;

  const frequentProducts = useMemo(
    () =>
      frequentIds
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is ProductListItem => product !== undefined),
    [frequentIds, products]
  );

  function pickTemplate(template: TemplateSummary) {
    onTemplatePick?.(template);
    onOpenChange(false);
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      `${product.name} ${product.brand_name ?? ""}`.toLowerCase().includes(term)
    );
  }, [products, query]);

  /**
   * The Frecuentes tab shows your most-used products; once you type, the
   * query first matches frequent ones and, when nothing matches, falls back
   * to the full catalog — the search always finds what you are looking for.
   */
  const frequentResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return frequentProducts;
    const matches = frequentProducts.filter((product) =>
      product.name.toLowerCase().includes(term)
    );
    return matches.length > 0 ? matches : filtered;
  }, [frequentProducts, filtered, query]);

  const filteredTemplates = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return templates;
    return templates?.filter((template) =>
      template.name.toLowerCase().includes(term)
    );
  }, [templates, query]);

  const qty = toQuantity(quantity);
  const protein = selected
    ? Math.round(servingsFor(qty, selected) * selected.protein * 10) / 10
    : 0;
  const calories = selected
    ? Math.round(servingsFor(qty, selected) * selected.calories)
    : 0;

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
        // Fixed 75% viewport height: short catalogs still fill the sheet so
        // the list sits in the eye line on mobile and desktop alike.
        className="mx-auto data-[side=bottom]:h-[75dvh] rounded-t-2xl sm:max-w-md"
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
            {step === "pick" ? "Agregar a la comida" : selected?.name}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {step === "pick"
              ? "Elegí un producto o una plantilla para agregarlo a la comida."
              : "Elegí la cantidad y confirmá."}
          </SheetDescription>
        </SheetHeader>

        {step === "pick" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex justify-center gap-2 px-4 pb-1 pt-3">
              <button
                type="button"
                onClick={() => setTab("frequent")}
                className={
                  tab === "frequent"
                    ? "flex-none rounded-full border border-primary bg-primary-container px-5 py-1.5 text-label-caps text-on-primary-container"
                    : "flex-none rounded-full border border-outline-variant px-5 py-1.5 text-label-caps text-on-surface-variant transition-colors hover:bg-surface-container-low"
                }
              >
                FRECUENTES
              </button>
              <button
                type="button"
                onClick={() => setTab("products")}
                className={
                  tab === "products"
                    ? "flex-none rounded-full border border-primary bg-primary-container px-5 py-1.5 text-label-caps text-on-primary-container"
                    : "flex-none rounded-full border border-outline-variant px-5 py-1.5 text-label-caps text-on-surface-variant transition-colors hover:bg-surface-container-low"
                }
              >
                ALIMENTOS
              </button>
              {hasTemplatesTab && (
                <button
                  type="button"
                  onClick={() => setTab("templates")}
                  className={
                    tab === "templates"
                      ? "flex-none rounded-full border border-primary bg-primary-container px-5 py-1.5 text-label-caps text-on-primary-container"
                      : "flex-none rounded-full border border-outline-variant px-5 py-1.5 text-label-caps text-on-surface-variant transition-colors hover:bg-surface-container-low"
                  }
                >
                  PLANTILLAS
                </button>
              )}
            </div>

            {/* Search is shared by every tab and always visible. */}
            <div className="relative px-4 pb-1 pt-3">
              <div className="pointer-events-none absolute inset-y-0 left-0 ml-7 flex items-center">
                <PackageSearch className="size-5 text-on-surface-variant" aria-hidden />
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar alimentos o plantillas…"
                aria-label="Buscar alimentos o plantillas"
                autoFocus={desktopOnly}
                className="block h-touch-target-min w-full rounded-xl border border-outline-variant bg-surface-container pl-10 pr-3 text-body-lg text-on-surface outline-none transition-all placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {tab === "frequent" ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
                {loading && (
                  <p className="px-4 py-6 text-body-sm-dense text-on-surface-variant">
                    Cargando…
                  </p>
                )}
                {!loading && frequentResults.length === 0 && (
                  <p className="px-4 py-6 text-body-sm-dense text-on-surface-variant">
                    {query.trim()
                      ? `Sin resultados para “${query.trim()}”.`
                      : "Todavía no tenés alimentos frecuentes. Registrá comidas y tus alimentos más usados aparecen acá."}
                  </p>
                )}
                {!loading &&
                  frequentResults.map((product) => (
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
                            {formatNumber(product.protein)} g prot
                          </span>
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            ) : tab === "products" ? (
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
                            {formatNumber(product.protein)} g prot
                          </span>
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
                {loading && (
                  <p className="px-4 py-6 text-body-sm-dense text-on-surface-variant">
                    Cargando…
                  </p>
                )}
                {!loading && filteredTemplates?.length === 0 ? (
                  <p className="px-4 py-6 text-body-sm-dense text-on-surface-variant">
                    {query.trim()
                      ? `Sin resultados para “${query.trim()}”.`
                      : "Todavía no tenés plantillas. Podés crearlas desde la pestaña Modelos."}
                  </p>
                ) : (
                  filteredTemplates?.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => pickTemplate(template)}
                      className="flex w-full items-center rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-container-low active:bg-surface-container"
                    >
                      <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary">
                        <LayoutTemplate className="size-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-grow">
                        <p className="truncate text-body-lg font-semibold text-on-surface">
                          {template.name}
                        </p>
                        <p className="truncate text-body-sm-dense text-on-surface-variant">
                          {template.item_count === 0
                            ? "Sin alimentos"
                            : template.preview}
                        </p>
                      </div>
                      <span className="ml-4 flex-shrink-0 text-numeric-data text-primary">
                        ≈ {formatNumber(template.protein_total)} g
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
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
                  {formatNumber(protein)} g
                </p>
                <p className="text-title-md text-primary/80">Proteína</p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-container px-4 py-1 text-numeric-data text-secondary">
                  {formatNumber(calories, 0)} kcal
                </div>
                <p className="mt-2 text-body-sm-dense text-on-surface-variant">
                  {servingCaption(selected, qty)}
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
                  aria-label="Cantidad"
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
