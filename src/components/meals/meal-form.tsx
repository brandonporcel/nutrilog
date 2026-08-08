"use client";

import { LayoutTemplate, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { SwipeableRow } from "@/components/products/swipeable-row";
import { AddItemSheet } from "@/components/templates/add-item-sheet";
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
import { DAILY_PROTEIN_GOAL_GRAMS } from "@/lib/daily-goal";
import { type Template } from "@/lib/db/database";
import { formatNumber } from "@/lib/format";
import { CategoryIcon } from "@/lib/icons/category-icon";
import { type MealItemInput } from "@/lib/repositories/daily-log";
import {
  type TemplateSummary,
  templatesRepository,
} from "@/lib/repositories/templates";
import { toast } from "@/lib/ui/toast-store";
import { pluralUnit, useDraftItems } from "@/lib/use-draft-items";

const templateNameInputCls =
  "h-12 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-lg text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20";

/** Lifts a freshly-saved template into a list row for the Plantillas tab. */
function toSummary(template: Template, items: { product_name: string; protein: number; calories: number }[], proteinTotal: number, caloriesTotal: number): TemplateSummary {
  return {
    ...template,
    item_count: items.length,
    protein_total: proteinTotal,
    calories_total: caloriesTotal,
    preview: items
      .slice(0, 3)
      .map((item) => item.product_name)
      .join(", "),
  };
}

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
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [localTemplates, setLocalTemplates] = useState<TemplateSummary[]>(templates);
  const draft = useDraftItems();

  const remaining = Math.max(0, DAILY_PROTEIN_GOAL_GRAMS - consumedToday);

  async function handleTemplatePick(template: TemplateSummary) {
    const detail = await templatesRepository.getDetail(userId, template.id);
    if (detail) draft.addFromTemplate(detail);
  }

  /** Saves the current cart as a reusable template (SDD 09). */
  async function handleSaveTemplate() {
    const name = templateName.trim();
    if (!name || savingTemplate || draft.items.length === 0) return;

    setSavingTemplate(true);
    try {
      const saved = await templatesRepository.save(userId, {
        name,
        items: draft.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      });
      const summary = toSummary(
        saved,
        draft.items.map((item) => ({
          product_name: item.product_name,
          protein: item.protein,
          calories: item.calories,
        })),
        draft.totals.protein,
        draft.totals.calories
      );
      setLocalTemplates((current) => [summary, ...current]);
      setTemplateDialogOpen(false);
      setTemplateName("");
      toast("Plantilla guardada");
    } catch (saveError) {
      toast(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar la plantilla.",
        "error"
      );
    } finally {
      setSavingTemplate(false);
    }
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
      className="flex flex-col gap-6 px-margin-mobile pb-44 pt-4"
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
              {formatNumber(consumedToday)} g
            </p>
            <p className="text-body-sm-dense text-on-surface-variant">
              Consumido hoy
            </p>
          </div>
          <div>
            <p className="text-numeric-data text-primary">
              +{formatNumber(draft.totals.protein)} g
            </p>
            <p className="text-body-sm-dense text-on-surface-variant">
              Esta comida
            </p>
          </div>
        </div>
        <p className="mt-3 text-body-sm-dense text-on-surface-variant">
          Te faltan{" "}
          <span className="text-primary">{formatNumber(remaining)} g</span> para
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
                      {formatNumber(item.quantity, 2)}{" "}
                      {pluralUnit(item.quantity, item.unit_label)} ·{" "}
                      <span className="text-primary">
                        {formatNumber(item.protein)} g prot
                      </span>
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
              {formatNumber(draft.totals.protein)} g
            </span>
            <span className="text-body-sm-dense text-on-surface-variant">
              Calorías
            </span>
            <span className="text-numeric-data text-on-surface">
              {formatNumber(draft.totals.calories, 0)} kcal
            </span>
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="h-touch-target-min w-full rounded-full text-title-md"
          >
            Guardar comida
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setTemplateDialogOpen(true)}
            disabled={draft.items.length === 0 || savingTemplate}
            className="h-touch-target-min w-full rounded-full text-title-md"
          >
            <LayoutTemplate className="size-5" aria-hidden />
            Guardar como plantilla
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
        templates={localTemplates}
        onTemplatePick={handleTemplatePick}
      />

      {/* Save-as-template name dialog */}
      <AlertDialog
        open={templateDialogOpen}
        onOpenChange={(open) => {
          setTemplateDialogOpen(open);
          if (!open) setTemplateName("");
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Guardar como plantilla</AlertDialogTitle>
            <AlertDialogDescription>
              Esta comida queda guardada para reutilizarla en otros días.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1 px-4 pb-2">
            <label
              htmlFor="template-name"
              className="px-1 text-[10px] font-bold uppercase tracking-wider text-outline"
            >
              Nombre de la plantilla
            </label>
            <input
              id="template-name"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSaveTemplate();
                }
              }}
              placeholder="Ej: Desayuno"
              aria-label="Nombre de la plantilla"
              className={templateNameInputCls}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleSaveTemplate()}
              disabled={!templateName.trim() || savingTemplate}
            >
              Guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
