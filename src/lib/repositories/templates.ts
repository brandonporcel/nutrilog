import { db, type Template, type TemplateItem } from "@/lib/db/database";
import { scheduleSync } from "@/lib/sync/sync";

/**
 * Templates repository (SDD 07). Follows the products.ts pattern (SDD 04):
 * local-first writes, the UI never touches Dexie or Supabase directly.
 * A template is saved as a whole: name + the FULL list of items, replaced
 * on every update (no diffs) — simple and consistent with last-write-wins.
 */

/** Draft item: a product and how many servings the template uses. */
export interface TemplateItemInput {
  product_id: string;
  quantity: number;
}

export interface TemplateInput {
  name: string;
  items: TemplateItemInput[];
}

/** List row: template + aggregated totals and a preview of its foods. */
export interface TemplateSummary extends Template {
  item_count: number;
  protein_total: number;
  calories_total: number;
  /** "3 Huevos, 2 Pães" — first 3 product names, truncated by the UI. */
  preview: string;
}

/** Template item with its product resolved for the editor rows. */
export interface TemplateItemDetail extends TemplateItem {
  product_name: string;
  category_icon: string | null;
  /** Serving unit display label ("g", "unidad", "rebanada"…) or raw name. */
  unit_label: string;
  /** Protein for this item's quantity (servings × protein per serving). */
  protein: number;
  calories: number;
}

export interface TemplateDetail extends Template {
  items: TemplateItemDetail[];
  protein_total: number;
  calories_total: number;
}

function now() {
  return new Date().toISOString();
}

/**
 * Display label for the seeded units (presentation only — the unit names
 * themselves are user data and stay untouched). Unknown units show as-is.
 */
const UNIT_LABELS: Record<string, string> = {
  unit: "unidad",
  gram: "g",
  milliliter: "ml",
  slice: "rebanada",
  scoop: "scoop",
  tablespoon: "cucharada",
  teaspoon: "cucharadita",
  cup: "taza",
  glass: "vaso",
  can: "lata",
  pack: "paquete",
};

export function unitLabel(name: string | null | undefined): string {
  if (!name) return "";
  return UNIT_LABELS[name.toLowerCase()] ?? name;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export const templatesRepository = {
  /** Templates with aggregated item count, totals and a foods preview. */
  async getAll(userId: string): Promise<TemplateSummary[]> {
    const templates = await db.templates
      .where("user_id")
      .equals(userId)
      .filter((template) => !template.deleted_at)
      .sortBy("name");

    if (templates.length === 0) return [];

    const items = await db.template_items
      .where("user_id")
      .equals(userId)
      .filter((item) => !item.deleted_at)
      .toArray();

    const productIds = [...new Set(items.map((item) => item.product_id))];
    const products = productIds.length > 0 ? await db.products.bulkGet(productIds) : [];
    const productById = new Map(
      products.filter((p) => p !== undefined).map((p) => [p!.id, p!])
    );

    const byTemplate = new Map<string, TemplateItem[]>();
    for (const item of items) {
      const list = byTemplate.get(item.template_id) ?? [];
      list.push(item);
      byTemplate.set(item.template_id, list);
    }

    return templates.map((template) => {
      const templateItems = byTemplate.get(template.id) ?? [];
      const protein = templateItems.reduce(
        (sum, item) => sum + item.quantity * (productById.get(item.product_id)?.protein ?? 0),
        0
      );
      const calories = templateItems.reduce(
        (sum, item) => sum + item.quantity * (productById.get(item.product_id)?.calories ?? 0),
        0
      );
      const preview = templateItems
        .slice(0, 3)
        .map((item) => productById.get(item.product_id)?.name ?? "")
        .filter(Boolean)
        .join(", ");

      return {
        ...template,
        item_count: templateItems.length,
        protein_total: round1(protein),
        calories_total: Math.round(calories),
        preview,
      };
    });
  },

  /** Full template with every item resolved (product, icon, unit, macros). */
  async getDetail(userId: string, id: string): Promise<TemplateDetail | null> {
    const template = await db.templates.get({ id, user_id: userId });
    if (!template || template.deleted_at) return null;

    const items = await db.template_items
      .where("template_id")
      .equals(id)
      .filter((item) => !item.deleted_at)
      .sortBy("created_at");

    const productIds = [...new Set(items.map((item) => item.product_id))];
    const products = productIds.length > 0 ? await db.products.bulkGet(productIds) : [];
    const productById = new Map(
      products.filter((p) => p !== undefined).map((p) => [p!.id, p!])
    );

    const categoryIds = products
      .map((p) => p?.category_id)
      .filter((c): c is string => Boolean(c));
    const unitIds = products
      .map((p) => p?.serving_unit_id)
      .filter((u): u is string => Boolean(u));

    const [categories, units] = await Promise.all([
      categoryIds.length > 0 ? db.categories.bulkGet(categoryIds) : Promise.resolve([]),
      unitIds.length > 0 ? db.units.bulkGet(unitIds) : Promise.resolve([]),
    ]);
    const categoryById = new Map(
      categories.filter((c) => c !== undefined).map((c) => [c!.id, c!])
    );
    const unitById = new Map(units.filter((u) => u !== undefined).map((u) => [u!.id, u!]));

    let proteinTotal = 0;
    let caloriesTotal = 0;
    const detailItems: TemplateItemDetail[] = items.map((item) => {
      const product = productById.get(item.product_id);
      const protein = item.quantity * (product?.protein ?? 0);
      const calories = item.quantity * (product?.calories ?? 0);
      proteinTotal += protein;
      caloriesTotal += calories;
      return {
        ...item,
        product_name: product?.name ?? "Producto eliminado",
        category_icon: product?.category_id
          ? (categoryById.get(product.category_id)?.icon ?? null)
          : null,
        unit_label: unitLabel(product?.serving_unit_id ? unitById.get(product.serving_unit_id)?.name : ""),
        protein: round1(protein),
        calories: Math.round(calories),
      };
    });

    return {
      ...template,
      items: detailItems,
      protein_total: round1(proteinTotal),
      calories_total: Math.round(caloriesTotal),
    };
  },

  async save(userId: string, input: TemplateInput): Promise<Template> {
    const timestamp = now();
    const template: Template = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: input.name.trim(),
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    };

    const items: TemplateItem[] = input.items.map((item) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      template_id: template.id,
      product_id: item.product_id,
      quantity: item.quantity,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    }));

    await db.transaction("rw", db.templates, db.template_items, async () => {
      await db.templates.add(template);
      if (items.length > 0) await db.template_items.bulkAdd(items);
    });
    scheduleSync();

    return template;
  },

  /**
   * Replaces the template's items: previous ones become soft-deleted (they
   * may already be on the remote; hard-deleting would orphan them) and new
   * ones are added. Returns null when the template does not exist.
   */
  async update(
    userId: string,
    id: string,
    input: TemplateInput
  ): Promise<Template | null> {
    const existing = await db.templates.get({ id, user_id: userId });
    if (!existing || existing.deleted_at) return null;

    const timestamp = now();
    const template: Template = {
      ...existing,
      name: input.name.trim(),
      updated_at: timestamp,
    };

    const items: TemplateItem[] = input.items.map((item) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      template_id: id,
      product_id: item.product_id,
      quantity: item.quantity,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    }));

    await db.transaction("rw", db.templates, db.template_items, async () => {
      await db.templates.put(template);
      await db.template_items
        .where("template_id")
        .equals(id)
        .modify({ deleted_at: timestamp, updated_at: timestamp });
      if (items.length > 0) await db.template_items.bulkAdd(items);
    });
    scheduleSync();

    return template;
  },

  /** Soft-deletes the template AND its items (cascade, in one transaction). */
  async softDelete(userId: string, id: string): Promise<void> {
    const timestamp = now();
    await db.transaction("rw", db.templates, db.template_items, async () => {
      await db.templates
        .where({ id, user_id: userId })
        .modify({ deleted_at: timestamp, updated_at: timestamp });
      await db.template_items
        .where("template_id")
        .equals(id)
        .modify({ deleted_at: timestamp, updated_at: timestamp });
    });
    scheduleSync();
  },
};
