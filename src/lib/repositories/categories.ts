import { db, type Category } from "@/lib/db/database";
import { scheduleSync } from "@/lib/sync/sync";

/**
 * Seeds from docs/database.md. Inserted the first time a user
 * opens the app; the sync loop pushes them to Supabase.
 */
const CATEGORY_SEEDS = [
  "Huevos",
  "Carnes",
  "Lácteos",
  "Frutas",
  "Verduras",
  "Panificados",
  "Cereales",
  "Legumbres",
  "Bebidas",
  "Suplementos",
  "Snacks",
  "Otros",
];

function now() {
  return new Date().toISOString();
}

/** Pattern follows src/lib/repositories/units.ts (SDD 03). */
export const categoriesRepository = {
  async getAll(userId: string): Promise<Category[]> {
    return db.categories
      .where("user_id")
      .equals(userId)
      .filter((category) => !category.deleted_at)
      .sortBy("name");
  },

  /** Seeds the catalog once per user (no-op when the user already has categories). */
  async ensureSeeds(userId: string): Promise<void> {
    const existing = await db.categories.where("user_id").equals(userId).count();
    if (existing > 0) return;

    const timestamp = now();
    const categories: Category[] = CATEGORY_SEEDS.map((name) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    }));

    await db.categories.bulkAdd(categories);
    scheduleSync();
  },
};
