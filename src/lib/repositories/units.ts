import { db, type Unit } from "@/lib/db/database";
import { scheduleSync } from "@/lib/sync/sync";

/**
 * Seeds from docs/database.md. Inserted the first time a user
 * opens the app; the sync loop pushes them to Supabase.
 * Cup/Glass/Can/Pack were added later (SDD 09 form rework): existing users
 * get them via the backfill below, new users from the start.
 */
const UNIT_SEEDS = [
  "Unit",
  "Gram",
  "Milliliter",
  "Slice",
  "Scoop",
  "Tablespoon",
  "Teaspoon",
  "Cup",
  "Glass",
  "Can",
  "Pack",
];

/**
 * Display order of the picker in the product form (SDD 09 rework):
 * g, ml, unidad, rebanada, scoop, cucharada, cucharadita, taza, vaso,
 * lata, paquete. Custom units sort after, alphabetically.
 */
export const UNIT_PICKER_ORDER = [
  "Gram",
  "Milliliter",
  "Unit",
  "Slice",
  "Scoop",
  "Tablespoon",
  "Teaspoon",
  "Cup",
  "Glass",
  "Can",
  "Pack",
];

/**
 * Test leftovers from the SDD 03 verification screen, when unit names were
 * free text and duplicates were possible. Exact matches or names containing
 * these tokens are dropped by dedupe.
 */
const JUNK_UNIT_TOKENS = ["test", "prueba", "asd"];

function now() {
  return new Date().toISOString();
}

function isJunkUnitName(name: string): boolean {
  const key = name.toLowerCase();
  return JUNK_UNIT_TOKENS.some((token) => key.includes(token));
}

/**
 * One-time cleanup for data created before unit names were unique:
 *  - duplicates by name (case-insensitive) merge into the first non-deleted
 *    row; products pointing at a removed row are repointed to the survivor
 *  - test leftovers ("test", "prueba"…) are soft-deleted; products that used
 *    one lose the unit reference (there is no legitimate target to map to)
 * Idempotent and cheap — it runs inside ensureSeeds, so every entry point
 * converges. The sync pushes the merged state to Supabase.
 */
async function dedupeUnits(userId: string): Promise<void> {
  const all = await db.units.where("user_id").equals(userId).toArray();
  if (all.length === 0) return;

  const byName = new Map<string, Unit[]>();
  for (const unit of all) {
    const key = unit.name.trim().toLowerCase();
    const group = byName.get(key) ?? [];
    group.push(unit);
    byName.set(key, group);
  }

  let changed = false;
  const byCreated = (a: Unit, b: Unit) =>
    a.created_at.localeCompare(b.created_at);

  for (const group of byName.values()) {
    if (group.length <= 1) continue;

    // Survivor: first non-deleted row (earliest wins); all-deleted groups
    // keep the earliest row so the name stays deleted.
    const active = group.filter((unit) => !unit.deleted_at).sort(byCreated);
    const kept = (active[0] ?? [...group].sort(byCreated)[0]).id;

    for (const victim of group) {
      if (victim.id === kept) continue;
      // Repoint products even when the victim is already deleted: a deleted
      // unit may still be referenced by older rows.
      await db.products
        .where("user_id")
        .equals(userId)
        .filter((product) => product.serving_unit_id === victim.id)
        .modify({ serving_unit_id: kept, updated_at: now() });
      if (!victim.deleted_at) {
        await db.units.update(victim.id, {
          deleted_at: now(),
          updated_at: now(),
        });
        changed = true;
      }
    }
  }

  for (const [key, group] of byName) {
    if (!isJunkUnitName(key)) continue;
    for (const unit of group) {
      if (unit.deleted_at) continue;
      await db.products
        .where("user_id")
        .equals(userId)
        .filter((product) => product.serving_unit_id === unit.id)
        .modify({ serving_unit_id: null, updated_at: now() });
      await db.units.update(unit.id, { deleted_at: now(), updated_at: now() });
      changed = true;
    }
  }

  if (changed) scheduleSync();
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

  /**
   * Creates a unit, or returns the existing row with the same name (trimmed,
   * case-insensitive) — duplicates by name are impossible, so the product
   * form and the /units screen never show two chips for "g".
   */
  async save(userId: string, input: { name: string }): Promise<Unit> {
    const name = input.name.trim();
    if (!name) throw new Error("El nombre de la unidad no puede estar vacío.");

    const existing = await db.units
      .where("user_id")
      .equals(userId)
      .filter(
        (unit) =>
          !unit.deleted_at &&
          unit.name.trim().toLowerCase() === name.toLowerCase()
      )
      .first();
    if (existing) return existing;

    const timestamp = now();
    const unit: Unit = {
      id: crypto.randomUUID(),
      user_id: userId,
      name,
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

  /**
   * Seeds the catalog once per user: merges legacy duplicates first, then
   * adds only the seed units missing by name (backfill for Cup/Glass/Can/
   * Pack) — user-created units are never touched, just deduplicated.
   */
  async ensureSeeds(userId: string): Promise<void> {
    await dedupeUnits(userId);

    const timestamp = now();
    const existing = await db.units.where("user_id").equals(userId).toArray();
    const known = new Set(existing.map((unit) => unit.name.toLowerCase()));
    const missing = UNIT_SEEDS.filter(
      (name) => !known.has(name.toLowerCase())
    );

    if (missing.length === 0) return;

    const units: Unit[] = missing.map((name) => ({
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
