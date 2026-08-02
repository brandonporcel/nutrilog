"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { type Brand, type Category, type Unit } from "@/lib/db/database";
import {
  type ProductDetail,
  type ProductInput,
} from "@/lib/repositories/products";
import { brandsRepository } from "@/lib/repositories/brands";
import { categoriesRepository } from "@/lib/repositories/categories";
import { unitsRepository } from "@/lib/repositories/units";
import { createClient } from "@/lib/supabase/client";

const NEW_BRAND = "__new";

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
          placeholder="0"
          aria-label={label}
          className="w-20 bg-transparent text-center text-headline-lg-mobile font-semibold text-on-surface outline-none placeholder:text-outline"
        />
        <span className="text-label-caps text-outline">{unit}</span>
      </div>
    </div>
  );
}

function PresetChip({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-secondary-container hover:text-on-secondary-container"
    >
      {children}
    </button>
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
 * Shared product form (SDD 06): creation (products/new) and editing
 * (products/[id]/edit) render the exact same screens. Local-first: the
 * page persists via the repository, never here.
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
  const [newBrandName, setNewBrandName] = useState("");
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

  function applyPreset(kind: "100g" | "1unidad") {
    if (kind === "100g") {
      const gram = units.find((unit) => unit.name === "Gram");
      setServingAmount("100");
      setServingUnitId(gram?.id ?? "");
      setServingWeight("100");
    } else {
      const unit = units.find((unit) => unit.name === "Unit");
      setServingAmount("1");
      setServingUnitId(unit?.id ?? "");
      setServingWeight("");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!userId || saving) return;

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    const amount = toNumber(servingAmount);
    if (amount < 1) {
      setError("La cantidad de la porción debe ser al menos 1.");
      return;
    }

    let brandId: string | null = null;
    if (brandValue === NEW_BRAND) {
      if (newBrandName.trim()) {
        const brand = await brandsRepository.getOrCreateByName(
          userId,
          newBrandName
        );
        brandId = brand.id;
      }
    } else if (brandValue) {
      brandId = brandValue;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name,
        brand_id: brandId,
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
          <Field label="Nombre del producto">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Pechuga de pollo grillada"
              aria-label="Nombre del producto"
              className={inputCls}
            />
          </Field>

          <SelectField
            label="Marca / Fabricante"
            value={brandValue}
            onChange={setBrandValue}
          >
            <option value="">Sin marca</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
            <option value={NEW_BRAND}>Nueva marca…</option>
          </SelectField>

          {brandValue === NEW_BRAND && (
            <input
              value={newBrandName}
              onChange={(event) => setNewBrandName(event.target.value)}
              placeholder="Nombre de la nueva marca"
              aria-label="Nombre de la nueva marca"
              className={inputCls}
            />
          )}

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

      {/* Porción */}
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-label-caps uppercase text-on-surface-variant">
          Porción
        </h2>
        <p className="px-1 text-body-sm-dense text-on-surface-variant">
          La porción tal como figura en la etiqueta (ej. 2 rebanadas · 59 g).
        </p>
        <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface p-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <span className="px-1 text-center text-[10px] font-bold uppercase tracking-wider text-outline">
                Cantidad
              </span>
              <input
                value={servingAmount}
                onChange={(event) => setServingAmount(event.target.value)}
                inputMode="decimal"
                aria-label="Cantidad de la porción"
                className={`${inputCls} text-center`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="px-1 text-center text-[10px] font-bold uppercase tracking-wider text-outline">
                Unidad
              </span>
              <div className="relative">
                <select
                  value={servingUnitId}
                  onChange={(event) => setServingUnitId(event.target.value)}
                  aria-label="Unidad de la porción"
                  className={selectCls}
                >
                  <option value="">—</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-3.5 size-5 text-outline"
                  aria-hidden
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="px-1 text-center text-[10px] font-bold uppercase tracking-wider text-outline">
                Peso (g/ml)
              </span>
              <input
                value={servingWeight}
                onChange={(event) => setServingWeight(event.target.value)}
                inputMode="decimal"
                placeholder="59"
                aria-label="Peso de la porción en gramos o mililitros"
                className={`${inputCls} text-center`}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PresetChip onClick={() => applyPreset("100g")}>100 g</PresetChip>
            <PresetChip onClick={() => applyPreset("1unidad")}>
              1 unidad
            </PresetChip>
          </div>
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
              Proteína
            </span>
            <div className="flex items-baseline gap-1">
              <input
                value={protein}
                onChange={(event) => setProtein(event.target.value)}
                inputMode="decimal"
                placeholder="0,0"
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
          <NumericCard label="Carbos" unit="g" value={carbs} onChange={setCarbs} />
          <NumericCard label="Grasas" unit="g" value={fat} onChange={setFat} />
          <NumericCard label="Fibras" unit="g" value={fiber} onChange={setFiber} />
        </div>
      </section>

      {error && (
        <p className="px-1 text-body-sm-dense text-destructive">{error}</p>
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
