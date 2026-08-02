import { db, type Brand, type Product, type Unit } from "@/lib/db/database";
import { scheduleSync } from "@/lib/sync/sync";

/**
 * Product catalog repository (SDD 04). Pattern follows units.ts (SDD 03):
 * local-first writes, the UI never touches Dexie or Supabase directly.
 */

/** Row for the products list: product + resolved names for the serving caption. */
export interface ProductListItem extends Product {
  brand_name: string | null;
  serving_unit_name: string | null;
}

/** Full detail for /products/[id]: product + all resolved names. */
export interface ProductDetail extends Product {
  brand_name: string | null;
  category_name: string | null;
  serving_unit_name: string | null;
}

export interface ProductInput {
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
}

function now() {
  return new Date().toISOString();
}

export const productsRepository = {
  async getAll(userId: string): Promise<Product[]> {
    return db.products
      .where("user_id")
      .equals(userId)
      .filter((product) => !product.deleted_at)
      .sortBy("name");
  },

  /** Products with brand and serving unit names resolved for the list. */
  async getListItems(userId: string): Promise<ProductListItem[]> {
    const products = await this.getAll(userId);

    const brandIds = new Set(
      products.map((product) => product.brand_id).filter((id): id is string => Boolean(id))
    );
    const unitIds = new Set(
      products.map((product) => product.serving_unit_id).filter((id): id is string => Boolean(id))
    );

    const [brands, units] = await Promise.all([
      brandIds.size > 0
        ? db.brands.where("id").anyOf([...brandIds]).toArray()
        : Promise.resolve([] as Brand[]),
      unitIds.size > 0
        ? db.units.where("id").anyOf([...unitIds]).toArray()
        : Promise.resolve([] as Unit[]),
    ]);

    const brandName = new Map(brands.map((brand) => [brand.id, brand.name]));
    const unitName = new Map(units.map((unit) => [unit.id, unit.name]));

    return products.map((product) => ({
      ...product,
      brand_name: product.brand_id ? (brandName.get(product.brand_id) ?? null) : null,
      serving_unit_name: product.serving_unit_id
        ? (unitName.get(product.serving_unit_id) ?? null)
        : null,
    }));
  },

  /** Full product detail with brand, category and serving unit resolved. */
  async getDetail(userId: string, id: string): Promise<ProductDetail | null> {
    const product = await db.products.get({ id, user_id: userId });
    if (!product || product.deleted_at) return null;

    const [brand, category, unit] = await Promise.all([
      product.brand_id
        ? db.brands.get(product.brand_id)
        : Promise.resolve(undefined),
      product.category_id
        ? db.categories.get(product.category_id)
        : Promise.resolve(undefined),
      product.serving_unit_id
        ? db.units.get(product.serving_unit_id)
        : Promise.resolve(undefined),
    ]);

    return {
      ...product,
      brand_name: brand?.name ?? null,
      category_name: category?.name ?? null,
      serving_unit_name: unit?.name ?? null,
    };
  },

  async save(userId: string, input: ProductInput): Promise<Product> {
    const timestamp = now();
    const product: Product = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: input.name.trim(),
      brand_id: input.brand_id,
      category_id: input.category_id,
      serving_amount: input.serving_amount,
      serving_unit_id: input.serving_unit_id,
      serving_weight_grams: input.serving_weight_grams,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      fiber: input.fiber,
      calories: input.calories,
      sugars: 0,
      sodium: 0,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    };

    // Local first, always. Never waits for the network.
    await db.products.add(product);
    scheduleSync();

    return product;
  },

  async softDelete(userId: string, id: string): Promise<void> {
    await db.products
      .where({ id, user_id: userId })
      .modify({ deleted_at: now(), updated_at: now() });
    scheduleSync();
  },
};
