import { db, type Unit } from "@/lib/db/database";
import { scheduleSync } from "@/lib/sync/sync";

/**
 * Seeds from docs/database.md. Inserted the first time a user
 * opens the app; the sync loop pushes them to Supabase.
 */
const UNIT_SEEDS = [
  "Unit",
  "Gram",
  "Milliliter",
  "Slice",
  "Scoop",
  "Tablespoon",
  "Teaspoon",
];

function now() {
  return new Date().toISOString();
}

/**
 * Pattern for every entity repository (Epic 1 extends it):
 * the UI only talks to repositories — never to Dexie or Supabase directly.
 */
export const unitsRepository = {
  async getAll(userId: string): Promise<Unit[]> {
    return db.units
      .where("user_id")
      .equals(userId)
      .filter((unit) => !unit.deleted_at)
      .sortBy("name");
  },

  async save(userId: string, input: { name: string }): Promise<Unit> {
    const timestamp = now();
    const unit: Unit = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: input.name.trim(),
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    };

    // Local first, always. Never waits for the network.
    await db.units.add(unit);
    scheduleSync();

    return unit;
  },

  async softDelete(userId: string, id: string): Promise<void> {
    await db.units
      .where({ id, user_id: userId })
      .modify({ deleted_at: now(), updated_at: now() });
    scheduleSync();
  },

  /** Seeds the catalog once per user (no-op when the user already has units). */
  async ensureSeeds(userId: string): Promise<void> {
    const existing = await db.units.where("user_id").equals(userId).count();
    if (existing > 0) return;

    const timestamp = now();
    const units: Unit[] = UNIT_SEEDS.map((name) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    }));

    await db.units.bulkAdd(units);
    scheduleSync();
  },
};
