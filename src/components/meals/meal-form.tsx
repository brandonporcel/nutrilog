"use client";

import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { SwipeableRow } from "@/components/products/swipeable-row";
import { AddItemSheet } from "@/components/templates/add-item-sheet";
import { Button } from "@/components/ui/button";
import { DAILY_PROTEIN_GOAL_GRAMS } from "@/lib/daily-goal";
import { CategoryIcon } from "@/lib/icons/category-icon";
import { type MealItemInput } from "@/lib/repositories/daily-log";
import { type TemplateSummary, templatesRepository } from "@/lib/repositories/templates";
import { pluralUnit, useDraftItems } from "@/lib/use-draft-items";

interface MealFormProps {
  userId: string;
  /** Protein already logged today, without the meal being drafted. */
  consumedToday: number;
  /** Template catalog for the Plantillas tab (empty when none exist). */
  templates: TemplateSummary[];
  /** Receives the meal items; the page persists via the repository. */
  onSubmit: (items: MealItemInput[]) => Promise<void>;
}

/**
 * Meal editor (SDD 08), the central screen of the app: a cart where the
 * user adds products (or a whole template), tweaks quantities and saves.
 * The draft is local state (useDraftItems); saving snapshots nutrition in
 * the daily-log repository so history never changes.
 */
export function MealForm({
  userId,
  consumedToday,
  templates,
  onSubmit,
}: MealFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draft = useDraftItems();

  const remaining = Math.max(0, DAILY_PROTEIN_GOAL_GRAMS - consumedToday);

  async function handleTemplatePick(template: TemplateSummary) {
    const detail = await templatesRepository.getDetail(userId, template.id);
    if (detail) draft.addFromTemplate(detail);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    if (draft.items.length === 0) {
      setError("Agregá al menos un alimento para guardar la comida.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit(
        draft.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        }))
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar la comida."
      );
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 px-margin-mobile pb-36 pt-4"
    >
      {/* Daily summary card */}
      <section className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
        <p className="text-label-caps uppercase text-on-surface-variant">
          Resumen del día
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-numeric-data text-on-surface">
              {DAILY_PROTEIN_GOAL_GRAMS} g
            </p>
            <p className="text-body-sm-dense text-on-surface-variant">
              Meta diaria
            </p>
          </div>
          <div className="border-x border-outline-variant/60">
            <p className="text-numeric-data text-secondary">
              {consumedToday} g
            </p>
            <p className="text-body-sm-dense text-on-surface-variant">
              Consumido hoy
            </p>
          </div>
          <div>
            <p className="text-numeric-data text-primary">
              +{draft.totals.protein} g
            </p>
            <p className="text-body-sm-dense text-on-surface-variant">
              Esta comida
            </p>
          </div>
        </div>
        <p className="mt-3 text-body-sm-dense text-on-surface-variant">
          Te faltan <span className="text-primary">{remaining} g</span> para
          llegar a la meta de hoy.
        </p>
      </section>

      {/* Selected foods */}
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-label-caps uppercase text-on-surface-variant">
            Alimentos seleccionados
          </h2>
          <span className="text-body-sm-dense text-on-surface-variant">
            {draft.items.length} {draft.items.length === 1 ? "item" : "items"}
          </span>
        </div>

        {draft.items.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-outline-variant px-4 py-6 text-center text-body-sm-dense text-on-surface-variant">
            Todavía no agregaste alimentos. Buscá un producto o una plantilla
            para armar tu comida.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface">
            {draft.items.map((item) => (
              <SwipeableRow
                key={item.key}
                open={false}
                onOpenChange={() => {}}
                onEdit={() => draft.openEdit(item)}
                onDelete={() => draft.removeItem(item.key)}
                editLabel="Editar alimento"
                deleteLabel="Eliminar alimento"
              >
                <button
                  type="button"
                  onClick={() => draft.openEdit(item)}
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
          onClick={draft.openSheetForNew}
          className="mt-2 flex h-touch-target-min w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 text-body-lg font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          <Plus className="size-5" aria-hidden />
          Añadir alimento
        </button>
      </section>

      {error && (
        <p className="px-1 text-body-sm-dense text-destructive">{error}</p>
      )}

      {/* Fixed summary + save footer */}
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface p-margin-mobile">
        <div className="mx-auto flex max-w-[768px] flex-col gap-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-body-sm-dense text-on-surface-variant">
              Proteína total
            </span>
            <span className="text-numeric-data text-primary">
              {draft.totals.protein} g
            </span>
            <span className="text-body-sm-dense text-on-surface-variant">
              Calorías
            </span>
            <span className="text-numeric-data text-on-surface">
              {draft.totals.calories} kcal
            </span>
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="h-touch-target-min w-full rounded-full text-title-md"
          >
            Guardar comida
          </Button>
        </div>
      </footer>

      <AddItemSheet
        open={draft.sheetOpen}
        onOpenChange={draft.setSheetOpen}
        onItemChange={(result) =>
          draft.handleItemChange(result, draft.editingItem?.key ?? null)
        }
        editing={draft.editingItem}
        templates={templates}
        onTemplatePick={handleTemplatePick}
      />
    </form>
  );
}
