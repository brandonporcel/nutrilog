import { db, type Category } from "@/lib/db/database";
import { scheduleSync } from "@/lib/sync/sync";

/**
 * Seeds from docs/database.md. Inserted the first time a user
 * opens the app; the sync loop pushes them to Supabase.
 * icon: lucide icon name rendered as the product avatar (SDD 06).
 */
const CATEGORY_SEEDS: Array<{ name: string; icon: string }> = [
  { name: "Huevos", icon: "egg" },
  { name: "Carnes", icon: "drumstick" },
  { name: "Lácteos", icon: "milk" },
  { name: "Frutas", icon: "apple" },
  { name: "Verduras", icon: "carrot" },
  { name: "Panificados", icon: "croissant" },
  { name: "Cereales", icon: "wheat" },
  { name: "Legumbres", icon: "bean" },
  { name: "Bebidas", icon: "cup-soda" },
  { name: "Suplementos", icon: "pill" },
  { name: "Snacks", icon: "candy" },
  { name: "Otros", icon: "package" },
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

  /**
   * Seeds the catalog once per user and backfills icons on installs that
   * created their categories before the icon field existed (SDD 06) — those
   * rows have no `icon` and render as the "package" fallback.
   */
  async ensureSeeds(userId: string): Promise<void> {
    const existing = await db.categories.where("user_id").equals(userId).count();
    if (existing > 0) {
      await backfillSeedIcons(userId);
      return;
    }

    const timestamp = now();
    const categories: Category[] = CATEGORY_SEEDS.map(({ name, icon }) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      icon,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    }));

    await db.categories.bulkAdd(categories);
    scheduleSync();
  },
};

/**
 * One-time heal: seed categories without an `icon` get the icon from the
 * seed list (matched by name). User-created categories are left alone, and
 * rows that already carry an icon are not touched (no sync churn).
 * The bumped `updated_at` makes the sync push the fix to Supabase.
 */
async function backfillSeedIcons(userId: string): Promise<void> {
  const iconByName = new Map(CATEGORY_SEEDS.map(({ name, icon }) => [name, icon]));
  const rows = await db.categories
    .where("user_id")
    .equals(userId)
    .filter((category) => !category.icon)
    .toArray();
  if (rows.length === 0) return;

  const timestamp = now();
  const patches: Category[] = [];
  for (const row of rows) {
    const icon = iconByName.get(row.name);
    if (!icon) continue;
    patches.push({ ...row, icon, updated_at: timestamp });
  }
  if (patches.length === 0) return;

  await db.categories.bulkPut(patches);
  scheduleSync();
}
