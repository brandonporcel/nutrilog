"use client";

import { Plus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { AddItemSheet, type AddItemResult } from "@/components/templates/add-item-sheet";
import { SwipeableRow } from "@/components/products/swipeable-row";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/lib/icons/category-icon";
import { type TemplateDetail, type TemplateInput, unitLabel } from "@/lib/repositories/templates";

/** Draft row: what the editor renders and edits before saving. */
interface DraftItem {
  product_id: string;
  product_name: string;
  category_icon: string | null;
  unit_label: string;
  quantity: number;
  protein: number;
  calories: number;
}

function pluralUnit(quantity: number, label: string): string {
  // Short units (g, ml…) don't pluralize; everything else gets an "s".
  if (quantity === 1 || label.length <= 2 || label.endsWith("s")) return label;
  return `${label}s`;
}

interface TemplateFormProps {
  /** When set, the form pre-fills the values (edit mode). */
  initial?: TemplateDetail | null;
  submitLabel: string;
  /** Receives the assembled input; the page decides save/update + navigation. */
  onSubmit: (input: TemplateInput) => Promise<void>;
}

/**
 * Shared template editor (SDD 07): creation (/templates/new) and editing
 * (/templates/[id]/edit) render the same screen. The draft (name + items)
 * lives here in local state; the page persists via the repository.
 */
export function TemplateForm({ initial, submitLabel, onSubmit }: TemplateFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [items, setItems] = useState<DraftItem[]>(
    () =>
      initial?.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        category_icon: item.category_icon,
        unit_label: item.unit_label,
        quantity: item.quantity,
        protein: item.protein,
        calories: item.calories,
      })) ?? []
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ product_id: string; quantity: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const protein = items.reduce((sum, item) => sum + item.protein, 0);
    const calories = items.reduce((sum, item) => sum + item.calories, 0);
    return {
      protein: Math.round(protein * 10) / 10,
      calories: Math.round(calories),
    };
  }, [items]);

  function handleItemChange({ product, quantity }: AddItemResult) {
    setItems((current) => {
      const existing = current.find((item) => item.product_id === product.id);
      const next: DraftItem = {
        product_id: product.id,
        product_name: product.name,
        category_icon: product.category_icon,
        unit_label: unitLabel(product.serving_unit_name),
        quantity,
        protein: Math.round(quantity * product.protein * 10) / 10,
        calories: Math.round(quantity * product.calories),
      };
      if (existing) {
        return current.map((item) => (item.product_id === product.id ? next : item));
      }
      return [...current, next];
    });
  }

  function openEdit(item: DraftItem) {
    setEditingItem({ product_id: item.product_id, quantity: item.quantity });
    setSheetOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    if (!name.trim()) {
      setError("El nombre de la plantilla es obligatorio.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar la plantilla."
      );
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 px-margin-mobile pb-32 pt-4"
    >
      {/* Template name */}
      <section className="flex flex-col gap-2">
        <label
          htmlFor="template-name"
          className="px-1 text-label-caps uppercase text-on-surface-variant"
        >
          Nombre del template
        </label>
        <input
          id="template-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej: Desayuno"
          aria-label="Nombre del template"
          className="h-12 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-lg text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </section>

      {/* Totals micro-hero */}
      <section className="flex items-end justify-between rounded-xl border border-outline-variant bg-surface-container-low p-4">
        <div>
          <p className="text-label-caps uppercase text-on-surface-variant">
            Proteína total
          </p>
          <p className="text-display-protein font-bold text-primary">
            {totals.protein}
            <span className="ml-1 text-title-md font-normal">g</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-label-caps uppercase text-on-surface-variant">
            Calorías
          </p>
          <p className="text-numeric-data text-on-surface">
            {totals.calories} kcal
          </p>
        </div>
      </section>

      {/* Selected foods */}
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-label-caps uppercase text-on-surface-variant">
            Alimentos seleccionados
          </h2>
          <span className="text-body-sm-dense text-on-surface-variant">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-outline-variant px-4 py-6 text-center text-body-sm-dense text-on-surface-variant">
            Todavía no agregaste alimentos. Tocá &ldquo;+ Agregar alimento&rdquo;
            para empezar.          </p>
        ) : (
          <div className="flex flex-col divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface">
            {items.map((item) => (
              <SwipeableRow
                key={item.product_id}
                open={false}
                onOpenChange={() => {}}
                onEdit={() => openEdit(item)}
                onDelete={() =>
                  setItems((current) =>
                    current.filter((candidate) => candidate.product_id !== item.product_id)
                  )
                }
                editLabel="Editar alimento"
                deleteLabel="Eliminar alimento"
              >
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="flex w-full items-center px-3 py-3 text-left"
                >
                  <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary">
                    <CategoryIcon icon={item.category_icon} className="size-5" />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <p className="truncate text-body-lg font-semibold text-on-surface">
                      {item.product_name}
                    </p>
                    <p className="truncate text-body-sm-dense text-on-surface-variant">
                      {item.quantity} {pluralUnit(item.quantity, item.unit_label)} ·{" "}
                      <span className="text-primary">{item.protein} g prot</span>
                    </p>
                  </div>
                </button>
              </SwipeableRow>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setSheetOpen(true);
          }}
          className="mt-2 flex h-touch-target-min w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 text-body-lg font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          <Plus className="size-5" aria-hidden />
          Agregar alimento
        </button>
      </section>

      {error && (
        <p className="px-1 text-body-sm-dense text-destructive">{error}</p>
      )}

      {/* Fixed save footer */}
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

      <AddItemSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onItemChange={handleItemChange}
        editing={editingItem}
      />
    </form>
  );
}
