import Dexie, { type EntityTable } from "dexie";

/**
 * Local database (IndexedDB via Dexie).
 *
 * Entity tables mirror the Supabase schema from docs/database.md:
 * snake_case fields everywhere so local and remote rows map 1:1,
 * with no transformation layer between Dexie and PostgREST.
 */

export interface SyncEntity {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Unit extends SyncEntity {
  name: string;
}

export interface Category extends SyncEntity {
  name: string;
  /** Lucide icon name (see src/lib/icons/category-icon.tsx); default "package". */
  icon: string;
}

export interface Brand extends SyncEntity {
  name: string;
}

export interface Product extends SyncEntity {
  name: string;
  brand_id: string | null;
  category_id: string | null;
  serving_amount: number;
  serving_unit_id: string | null;
  serving_weight_grams: number | null;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  calories: number;
  sugars: number;
  sodium: number;
}

export interface Template extends SyncEntity {
  name: string;
}

export interface TemplateItem extends SyncEntity {
  template_id: string;
  product_id: string;
  quantity: number;
}

export interface DailyLog extends SyncEntity {
  date: string; // YYYY-MM-DD, único por (user_id, date)
}

export interface DailyLogItem extends SyncEntity {
  daily_log_id: string;
  product_id: string;
  quantity: number;
  /** Groups items into a meal (all items saved together share one id). */
  meal_id: string | null;
  // Snapshot nutricional: el historial no cambia aunque el producto cambie.
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  calories: number;
  sugars: number;
  sodium: number;
}

export interface Meta {
  key: string;
  value: string;
}

const db = new Dexie("nutrilog") as Dexie & {
  units: EntityTable<Unit, "id">;
  categories: EntityTable<Category, "id">;
  brands: EntityTable<Brand, "id">;
  products: EntityTable<Product, "id">;
  templates: EntityTable<Template, "id">;
  template_items: EntityTable<TemplateItem, "id">;
  daily_logs: EntityTable<DailyLog, "id">;
  daily_log_items: EntityTable<DailyLogItem, "id">;
  meta: EntityTable<Meta, "key">;
};

db.version(1).stores({
  units: "id, user_id, updated_at",
  categories: "id, user_id, updated_at",
  brands: "id, user_id, updated_at",
  products: "id, user_id, updated_at",
  templates: "id, user_id, updated_at",
  template_items: "id, user_id, updated_at",
  daily_logs: "id, user_id, date, updated_at",
  daily_log_items: "id, user_id, updated_at",
  meta: "key",
});

// v2: index template_items by template_id (getDetail/update/softDelete) and
// compound id+user_id lookups on templates (avoids full scans).
db.version(2).stores({
  templates: "id, user_id, updated_at, [id+user_id]",
  template_items: "id, user_id, updated_at, template_id, [template_id+user_id]",
});

// v3: daily log reads (SDD 08) — today's log by (user_id, date), items by
// daily_log_id or meal_id, and today's items by (user_id, created_at range).
db.version(3).stores({
  daily_logs: "id, user_id, date, updated_at, [id+user_id], [user_id+date]",
  daily_log_items:
    "id, user_id, updated_at, daily_log_id, meal_id, [user_id+created_at]",
});

export { db };
