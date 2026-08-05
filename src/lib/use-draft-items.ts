import { useMemo, useState } from "react";

import { type AddItemResult } from "@/components/templates/add-item-sheet";
import {
  type TemplateDetail,
  type TemplateItemDetail,
  unitLabel,
} from "@/lib/repositories/templates";

/** Draft row: what an editor renders and edits before saving. */
export interface DraftItem {
  /** Line id — the same product may appear more than once in a draft. */
  key: string;
  product_id: string;
  product_name: string;
  category_icon: string | null;
  unit_label: string;
  quantity: number;
  protein: number;
  calories: number;
}

/** Renders the display unit for a quantity ("g", "unidad", "rebanadas"…). */
export function pluralUnit(quantity: number, label: string): string {
  // Short units (g, ml…) don't pluralize; everything else gets an "s".
  if (quantity === 1 || label.length <= 2 || label.endsWith("s")) return label;
  return `${label}s`;
}

function toDraftItem(item: TemplateItemDetail): DraftItem {
  return {
    key: crypto.randomUUID(),
    product_id: item.product_id,
    product_name: item.product_name,
    category_icon: item.category_icon,
    unit_label: item.unit_label,
    quantity: item.quantity,
    protein: item.protein,
    calories: item.calories,
  };
}

/**
 * Draft state shared by the template editor (SDD 07) and the meal editor
 * (SDD 08): a cart-like list of products with quantities, an AddItemSheet
 * and edit/remove helpers. The draft is UI state — persistence and
 * snapshots live in the repositories. Every row has its own key, so the
 * same product can appear more than once (e.g. added by hand and later by
 * a template); edits target a specific row.
 */
export function useDraftItems(initial: DraftItem[] = []) {
  const [items, setItems] = useState<DraftItem[]>(initial);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    key: string;
    product_id: string;
    quantity: number;
  } | null>(null);

  const totals = useMemo(() => {
    const protein = items.reduce((sum, item) => sum + item.protein, 0);
    const calories = items.reduce((sum, item) => sum + item.calories, 0);
    return {
      protein: Math.round(protein * 10) / 10,
      calories: Math.round(calories),
    };
  }, [items]);

  /** Adds a new row, or replaces the row being edited (targetKey). */
  function handleItemChange(
    { product, quantity }: AddItemResult,
    targetKey: string | null
  ) {
    if (targetKey) {
      setItems((current) =>
        current.map((item) =>
          item.key === targetKey
            ? {
                ...item,
                product_name: product.name,
                category_icon: product.category_icon,
                unit_label: unitLabel(product.serving_unit_name),
                quantity,
                protein: Math.round(quantity * product.protein * 10) / 10,
                calories: Math.round(quantity * product.calories),
              }
            : item
        )
      );
      return;
    }
    setItems((current) => [...current, {
      key: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      category_icon: product.category_icon,
      unit_label: unitLabel(product.serving_unit_name),
      quantity,
      protein: Math.round(quantity * product.protein * 10) / 10,
      calories: Math.round(quantity * product.calories),
    }]);
  }

  function openEdit(item: DraftItem) {
    setEditingItem({
      key: item.key,
      product_id: item.product_id,
      quantity: item.quantity,
    });
    setSheetOpen(true);
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  /** Opens the sheet for a brand-new item (clears the edit target). */
  function openSheetForNew() {
    setEditingItem(null);
    setSheetOpen(true);
  }

  /** Appends every item of a template (SDD 08: templates are a starting point). */
  function addFromTemplate(template: TemplateDetail) {
    setItems((current) => [...current, ...template.items.map(toDraftItem)]);
  }

  return {
    items,
    totals,
    sheetOpen,
    setSheetOpen,
    editingItem,
    handleItemChange,
    openEdit,
    removeItem,
    openSheetForNew,
    addFromTemplate,
  };
}
