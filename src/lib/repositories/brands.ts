import { db, type Brand } from "@/lib/db/database";
import { scheduleSync } from "@/lib/sync/sync";

/**
 * Brands are created on demand from the product form ("Nueva marca…").
 * docs/database.md defines no brand seeds; full brand management is Epic 1.
 */
function now() {
  return new Date().toISOString();
}

export const brandsRepository = {
  async getAll(userId: string): Promise<Brand[]> {
    return db.brands
      .where("user_id")
      .equals(userId)
      .filter((brand) => !brand.deleted_at)
      .sortBy("name");
  },

  /** Finds a brand by name (case-insensitive) or creates it. */
  async getOrCreateByName(userId: string, name: string): Promise<Brand> {
    const trimmed = name.trim();
    const existing = (await this.getAll(userId)).find(
      (brand) => brand.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;

    const timestamp = now();
    const brand: Brand = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: trimmed,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    };

    await db.brands.add(brand);
    scheduleSync();

    return brand;
  },
};
