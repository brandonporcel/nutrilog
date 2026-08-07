"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { type Brand, type Category, type Unit } from "@/lib/db/database";
import {
  type ProductDetail,
  type ProductInput,
} from "@/lib/repositories/products";
import { brandsRepository } from "@/lib/repositories/brands";
import { categoriesRepository } from "@/lib/repositories/categories";
import { unitLabel } from "@/lib/repositories/templates";
import { unitsRepository, UNIT_PICKER_ORDER } from "@/lib/repositories/units";
import { createClient } from "@/lib/supabase/client";

const inputCls =
  "h-12 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-lg text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20";

const selectCls =
  "h-12 w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-3 pr-10 text-body-lg text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";

/** Accepts both "." and "," decimal separators. */
function toNumber(value: string): number {
  const n = Number(value.trim().replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-outline">
        {label}
      </span>
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-outline">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={selectCls}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-3.5 size-5 text-outline"
          aria-hidden
        />
      </div>
    </div>
  );
}

function NumericCard({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-outline-variant bg-surface p-4">
      <span className="text-label-caps uppercase text-on-surface-variant">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          placeholder="Ej: 160"
          aria-label={label}
          className="w-20 bg-transparent text-center text-headline-lg-mobile font-semibold text-on-surface outline-none placeholder:text-outline"
        />
        <span className="text-label-caps text-outline">{unit}</span>
      </div>
    </div>
  );
}


/**
 * Single brand row of the drawer (checkmark when selected). Module-level:
 * react-hooks/static-components forbids components defined during render.
 */
function BrandOptionRow({
  selected,
  label,
  onSelect,
}: {
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-container-low active:bg-surface-container"
    >
      <span
        className={
          selected
            ? "text-body-lg font-semibold text-primary"
            : "text-body-lg text-on-surface"
        }
      >
        {label}
      </span>
      {selected && (
        <Check className="size-5 flex-shrink-0 text-primary" aria-hidden />
      )}
    </button>
  );
}

/**
 * Brand picker as a bottom drawer (SDD 09): the native select is ugly on
 * Android, and a drawer also hosts the "create a new brand" input. The form
 * owns the option list; creations come back through onBrandCreated.
 */
function BrandDrawer({
  open,
  onOpenChange,
  userId,
  brands,
  value,
  onChange,
  onBrandCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  brands: Brand[];
  value: string;
  onChange: (brandId: string) => void;
  onBrandCreated: (brand: Brand) => void;
}) {
  const [newBrandName, setNewBrandName] = useState("");

  async function handleCreateBrand() {
    const name = newBrandName.trim();
    if (!name) return;
    const brand = await brandsRepository.getOrCreateByName(userId, name);
    onBrandCreated(brand);
    onChange(brand.id);
    setNewBrandName("");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[70dvh] rounded-t-2xl sm:max-w-md"
      >
        <SheetHeader className="border-b border-outline-variant">
          <SheetTitle className="text-center font-title-md text-on-surface">
            Marca / Fabricante
          </SheetTitle>
          <SheetDescription className="sr-only">
            Elegí una marca existente o creá una nueva.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-4">
          <div className="min-h-0 flex-1 overflow-y-auto px-1">
            <BrandOptionRow
              selected={value === ""}
              label="Sin marca"
              onSelect={() => {
                onChange("");
                onOpenChange(false);
              }}
            />
            {brands.map((brand) => (
              <BrandOptionRow
                key={brand.id}
                selected={value === brand.id}
                label={brand.name}
                onSelect={() => {
                  onChange(brand.id);
                  onOpenChange(false);
                }}
              />
            ))}
          </div>

          <div className="border-t border-outline-variant pt-4">
            <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-outline">
              O crear una nueva
            </p>
            <div className="mt-1 flex gap-2">
              <input
                value={newBrandName}
                onChange={(event) => setNewBrandName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreateBrand();
                  }
                }}
                placeholder="Ej: Bimbo"
                aria-label="Nombre de la nueva marca"
                className={inputCls}
              />
              <Button
                type="button"
                onClick={() => void handleCreateBrand()}
                disabled={!newBrandName.trim()}
                size="icon"
                className="h-12 w-12 flex-shrink-0 rounded-full"
                aria-label="Crear marca"
              >
                <Plus className="size-5" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ProductFormProps {
  /** When set, the form pre-fills the values (edit mode). */
  initial?: ProductDetail | null;
  submitLabel: string;
  /** Receives the assembled input; the page decides save/update + navigation. */
  onSubmit: (input: ProductInput) => Promise<void>;
}

/**
 * Shared product form (SDD 06, UX reworked in SDD 09): creation
 * (products/new) and editing (products/[id]/edit) render the exact same
 * screens. Local-first: the page persists via the repository, never here.
 */
export function ProductForm({ initial, submitLabel, onSubmit }: ProductFormProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [brandValue, setBrandValue] = useState(initial?.brand_id ?? "");
  const [brandSheetOpen, setBrandSheetOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [servingAmount, setServingAmount] = useState(
    String(initial?.serving_amount ?? "1")
  );
  const [servingUnitId, setServingUnitId] = useState(
    initial?.serving_unit_id ?? ""
  );
  const [servingWeight, setServingWeight] = useState(
    initial?.serving_weight_grams ? String(initial.serving_weight_grams) : ""
  );
  const [protein, setProtein] = useState(initial ? String(initial.protein) : "");
  const [calories, setCalories] = useState(
    initial ? String(initial.calories) : ""
  );
  const [carbs, setCarbs] = useState(initial ? String(initial.carbs) : "");
  const [fat, setFat] = useState(initial ? String(initial.fat) : "");
  const [fiber, setFiber] = useState(initial ? String(initial.fiber) : "");

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setUserId(data.session?.user.id ?? null);
      });
  }, []);

  useEffect(() => {
    if (!userId) return;
    void Promise.all([
      categoriesRepository.ensureSeeds(userId),
      unitsRepository.ensureSeeds(userId),
    ]).then(async () => {
      const [brandList, categoryList, unitList] = await Promise.all([
        brandsRepository.getAll(userId),
        categoriesRepository.getAll(userId),
        unitsRepository.getAll(userId),
      ]);
      setBrands(brandList);
      setCategories(categoryList);
      setUnits(unitList);
      // Default serving unit on creation: "Gram" (labels express macros
      // per 100 g). Edit mode keeps the product's own unit.
      if (!initial) {
        const gram = unitList.find((unit) => unit.name === "Gram");
        if (gram) setServingUnitId(gram.id);
      }
    });
  }, [userId, initial]);

  /**
   * "Peso equivalente" only makes sense for non-weight units (g/ml are the
   * measure itself): it must react immediately when the unit changes.
   */
  const selectedUnit = units.find((unit) => unit.id === servingUnitId);
  const unitName = selectedUnit?.name.trim().toLowerCase() ?? "";
  const isWeightUnit = unitName === "gram" || unitName === "milliliter";
  const showWeight = selectedUnit !== undefined && !isWeightUnit;

  /** Canonical units first (g, ml, unidad, rebanada…), custom ones after. */
  const orderedUnits = useMemo(() => {
    const order = new Map(
      UNIT_PICKER_ORDER.map((name, index) => [name.toLowerCase(), index])
    );
    return [...units].sort((a, b) => {
      const indexA = order.get(a.name.toLowerCase());
      const indexB = order.get(b.name.toLowerCase());
      if (indexA !== undefined && indexB !== undefined) return indexA - indexB;
      if (indexA !== undefined) return -1;
      if (indexB !== undefined) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [units]);

  const selectedBrandName = brands.find(
    (brand) => brand.id === brandValue
  )?.name;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!userId || saving) return;

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    const amount = toNumber(servingAmount);
    if (!servingAmount.trim() || amount < 1) {
      setError("La cantidad de la porción es obligatoria (al menos 1).");
      return;
    }
    if (!protein.trim()) {
      setError("La proteína es obligatoria.");
      return;
    }
    if (!servingUnitId) {
      setError("Elegí una unidad para la porción.");
      return;
    }
    if (showWeight && !servingWeight.trim()) {
      setError("El peso equivalente es obligatorio para esta unidad.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name,
        brand_id: brandValue || null,
        category_id: categoryId || null,
        serving_amount: amount,
        serving_unit_id: servingUnitId || null,
        serving_weight_grams: servingWeight ? toNumber(servingWeight) : null,
        protein: toNumber(protein),
        carbs: toNumber(carbs),
        fat: toNumber(fat),
        fiber: toNumber(fiber),
        calories: toNumber(calories),
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el producto."
      );
      setSaving(false);
    }
  }

  return (
    <form
      id="product-form"
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 px-margin-mobile pb-32 pt-4"
    >
      {/* Identificación */}
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-label-caps uppercase text-on-surface-variant">
          Identificación
        </h2>
        <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface p-4">
          <Field label="Nombre del producto*">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Pechuga de pollo grillada"
              aria-label="Nombre del producto"
              className={inputCls}
            />
          </Field>

          <Field label="Marca / Fabricante">
            <button
              type="button"
              onClick={() => setBrandSheetOpen(true)}
              aria-label="Elegir marca"
              className="flex h-12 w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-lg text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <span>{selectedBrandName ?? "Sin marca"}</span>
              <ChevronDown className="size-5 text-outline" aria-hidden />
            </button>
          </Field>

          <SelectField
            label="Categoría"
            value={categoryId}
            onChange={setCategoryId}
          >
            <option value="">Sin categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
        </div>
      </section>

      {/* Porción de referencia */}
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-label-caps uppercase text-on-surface-variant">
          Porción de referencia*
        </h2>
        <p className="px-1 text-body-sm-dense text-on-surface-variant">
          La porción de la etiqueta (ej. 2 rebanadas) y su peso equivalente en
          gramos (ej. 50 g).
        </p>
        <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface p-4">
          <Field label="Cantidad*">
            <input
              value={servingAmount}
              onChange={(event) => setServingAmount(event.target.value)}
              inputMode="decimal"
              placeholder="Ej: 2"
              aria-label="Cantidad de la porción"
              className={inputCls}
            />
          </Field>

          <SelectField
            label="Unidad"
            value={servingUnitId}
            onChange={setServingUnitId}
          >
            <option value="">—</option>
            {orderedUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unitLabel(unit.name)}
              </option>
            ))}
          </SelectField>

          {showWeight && (
            <Field label="Peso equivalente (g)">
              <input
                value={servingWeight}
                onChange={(event) => setServingWeight(event.target.value)}
                inputMode="decimal"
                placeholder="Ej: 50"
                aria-label="Peso equivalente de la porción en gramos"
                className={inputCls}
              />
              <p className="px-1 text-body-sm-dense text-on-surface-variant">
                Cuántos gramos pesa esa porción. Se usa para convertir cuando
                registrás por peso.
              </p>
            </Field>
          )}
        </div>
      </section>

      {/* Nutrición */}
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-label-caps uppercase text-on-surface-variant">
          Información nutricional
        </h2>
        <p className="px-1 text-body-sm-dense text-on-surface-variant">
          Copiá los valores de la etiqueta o de Google (ej. manzana: 1 unidad
          (182 g)).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-primary bg-primary-container p-5 text-on-primary-container">
            <span className="text-label-caps uppercase opacity-80">
              Proteína*
            </span>
            <div className="flex items-baseline gap-1">
              <input
                value={protein}
                onChange={(event) => setProtein(event.target.value)}
                inputMode="decimal"
                placeholder="Ej: 20"
                aria-label="Proteína por porción en gramos"
                className="w-40 bg-transparent text-center text-display-protein font-bold text-on-primary-container outline-none placeholder:text-on-primary-container/30"
              />
              <span className="text-title-md">g</span>
            </div>
            <p className="text-body-sm-dense opacity-70">
              Nutriente prioritario
            </p>
          </div>

          <NumericCard
            label="Calorías"
            unit="kcal"
            value={calories}
            onChange={setCalories}
          />
          <NumericCard
            label="Carbohidratos"
            unit="g"
            value={carbs}
            onChange={setCarbs}
          />
          <NumericCard label="Grasas" unit="g" value={fat} onChange={setFat} />
          <NumericCard label="Fibras" unit="g" value={fiber} onChange={setFiber} />
        </div>
      </section>

      {error && (
        <p className="px-1 text-body-sm-dense text-destructive">{error}</p>
      )}

      {/* Brand drawer (SDD 09): select nativo reemplazado */}
      {userId && (
        <BrandDrawer
          open={brandSheetOpen}
          onOpenChange={setBrandSheetOpen}
          userId={userId}
          brands={brands}
          value={brandValue}
          onChange={setBrandValue}
          onBrandCreated={(brand) =>
            setBrands((current) =>
              current.some((existing) => existing.id === brand.id)
                ? current
                : [...current, brand]
            )
          }
        />
      )}

      {/* Fixed save footer (the bottom nav is hidden on these screens) */}
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface p-margin-mobile">
        <div className="mx-auto max-w-[768px]">
          <Button
            type="submit"
            disabled={saving}
            className="h-touch-target-min w-full rounded-full text-title-md"
          >
            {submitLabel}
          </Button>
        </div>
      </footer>
    </form>
  );
}
