import { db } from "@/lib/db/database";
import { brandsRepository } from "@/lib/repositories/brands";
import { categoriesRepository } from "@/lib/repositories/categories";
import { productsRepository } from "@/lib/repositories/products";
import { templatesRepository } from "@/lib/repositories/templates";
import { unitsRepository } from "@/lib/repositories/units";

/**
 * Initial catalog seeder. Like categories/units, the seed products are
 * inserted PER USER by the app the first time it runs (the sync loop then
 * pushes them to Supabase) — the RLS model is user-scoped, so there is no
 * "shared catalog": every account starts with the same base foods.
 *
 * Idempotent by design: categories/units seed only when the user has none,
 * and products are matched by name against ALL rows (including soft-deleted
 * ones) so a product the user deleted never comes back.
 */

interface SeedProduct {
  name: string;
  /** Brand name (created on demand via getOrCreateByName) or null. */
  brand: string | null;
  /** Category name — must exist in the categories seeds. */
  category: string;
  serving_amount: number;
  /** Unit name — must exist in the units seeds. */
  serving_unit: string;
  serving_weight_grams: number | null;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  calories: number;
}

const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: "Huevo entero",
    brand: null,
    category: "Huevos",
    serving_amount: 1,
    serving_unit: "Unit",
    serving_weight_grams: 60,
    protein: 6.3,
    carbs: 0.4,
    fat: 5.3,
    fiber: 0,
    calories: 72,
  },
  {
    name: "Banana",
    brand: null,
    category: "Frutas",
    serving_amount: 1,
    serving_unit: "Unit",
    serving_weight_grams: 120,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    fiber: 2.6,
    calories: 105,
  },
  {
    name: "Manzana",
    brand: null,
    category: "Frutas",
    serving_amount: 1,
    serving_unit: "Unit",
    serving_weight_grams: 180,
    protein: 0.5,
    carbs: 25,
    fat: 0.2,
    fiber: 4.4,
    calories: 95,
  },
  {
    name: "Arroz blanco cocido",
    brand: null,
    category: "Cereales",
    serving_amount: 100,
    serving_unit: "Gram",
    serving_weight_grams: 100,
    protein: 2.7,
    carbs: 28,
    fat: 0.3,
    fiber: 0.4,
    calories: 130,
  },
  {
    name: "Avena",
    brand: null,
    category: "Cereales",
    serving_amount: 100,
    serving_unit: "Gram",
    serving_weight_grams: 100,
    protein: 13,
    carbs: 56,
    fat: 7,
    fiber: 10,
    calories: 380,
  },
  {
    name: "Pan integral",
    brand: "Bimbo",
    category: "Panificados",
    serving_amount: 2,
    serving_unit: "Slice",
    serving_weight_grams: 50,
    protein: 7.7,
    carbs: 22,
    fat: 2.5,
    fiber: 3.2,
    calories: 130,
  },
  {
    name: "Pechuga de pollo",
    brand: null,
    category: "Carnes",
    serving_amount: 100,
    serving_unit: "Gram",
    serving_weight_grams: 100,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    fiber: 0,
    calories: 165,
  },
  {
    name: "Atún en lata",
    brand: null,
    category: "Carnes",
    serving_amount: 100,
    serving_unit: "Gram",
    serving_weight_grams: 100,
    protein: 26,
    carbs: 0,
    fat: 0.8,
    fiber: 0,
    calories: 116,
  },
  {
    name: "Shake de proteína",
    brand: "Star Nutrition",
    category: "Suplementos",
    serving_amount: 1,
    serving_unit: "Scoop",
    serving_weight_grams: 30,
    protein: 24,
    carbs: 3,
    fat: 1.5,
    fiber: 0.5,
    calories: 120,
  },
  {
    name: "Leche descremada",
    brand: null,
    category: "Lácteos",
    serving_amount: 200,
    serving_unit: "Milliliter",
    serving_weight_grams: 200,
    protein: 6.6,
    carbs: 10,
    fat: 0.4,
    fiber: 0,
    calories: 70,
  },
  {
    name: "Papa",
    brand: null,
    category: "Verduras",
    serving_amount: 100,
    serving_unit: "Gram",
    serving_weight_grams: 100,
    protein: 2,
    carbs: 17,
    fat: 0.1,
    fiber: 2.2,
    calories: 77,
  },
];

/**
 * Seeds categories, units, brands and products in FK order, then one starter
 * template. Safe to call on every entry point (dashboard, products, new
 * meal): each step is a no-op once its data exists.
 */
export async function ensureUserCatalog(userId: string): Promise<void> {
  await categoriesRepository.ensureSeeds(userId);
  await unitsRepository.ensureSeeds(userId);

  const categories = await categoriesRepository.getAll(userId);
  const categoryByName = new Map(
    categories.map((category) => [category.name.toLowerCase(), category])
  );
  const units = await unitsRepository.getAll(userId);
  const unitByName = new Map(
    units.map((unit) => [unit.name.toLowerCase(), unit])
  );

  // All rows (soft-deleted included): a product the user deleted must not
  // be re-seeded on the next visit.
  const existing = await db.products.where("user_id").equals(userId).toArray();
  const existingByName = new Set(
    existing.map((product) => product.name.trim().toLowerCase())
  );

  for (const seed of SEED_PRODUCTS) {
    if (existingByName.has(seed.name.toLowerCase())) continue;

    const category = categoryByName.get(seed.category.toLowerCase());
    const unit = unitByName.get(seed.serving_unit.toLowerCase());
    if (!category || !unit) continue; // seeding is best-effort

    const brand = seed.brand
      ? await brandsRepository.getOrCreateByName(userId, seed.brand)
      : null;

    await productsRepository.save(userId, {
      name: seed.name,
      brand_id: brand?.id ?? null,
      category_id: category.id,
      serving_amount: seed.serving_amount,
      serving_unit_id: unit.id,
      serving_weight_grams: seed.serving_weight_grams,
      protein: seed.protein,
      carbs: seed.carbs,
      fat: seed.fat,
      fiber: seed.fiber,
      calories: seed.calories,
    });
  }

  await seedStarterTemplate(userId);
}

/**
 * One starter template ("Desayuno": 3 huevos + 1 manzana) so a new user
 * sees a template from day one. Only when the user has NO templates, and
 * only referencing products that exist (the user may have deleted a seed).
 */
async function seedStarterTemplate(userId: string): Promise<void> {
  const templateCount = await db.templates
    .where("user_id")
    .equals(userId)
    .count();
  if (templateCount > 0) return;

  const products = await db.products
    .where("user_id")
    .equals(userId)
    .filter((product) => !product.deleted_at)
    .toArray();
  const productByName = new Map(
    products.map((product) => [product.name.trim().toLowerCase(), product])
  );

  const items = [
    { name: "Huevo entero", quantity: 3 },
    { name: "Manzana", quantity: 1 },
  ]
    .map(({ name, quantity }) => {
      const product = productByName.get(name);
      return product ? { product_id: product.id, quantity } : null;
    })
    .filter((item): item is { product_id: string; quantity: number } => item !== null);

  if (items.length === 0) return;

  await templatesRepository.save(userId, { name: "Desayuno", items });
}
