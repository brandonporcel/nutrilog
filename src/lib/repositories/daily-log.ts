import { db, type Category, type DailyLog, type DailyLogItem, type Product, type Unit } from "@/lib/db/database";
import { servingsFor } from "@/lib/portion";
import { scheduleSync } from "@/lib/sync/sync";

/**
 * Daily log repository (SDD 08). Local-first like the other repositories:
 * the UI never touches Dexie or Supabase directly. A meal is a set of
 * daily_log_items sharing one meal_id; the log row is the day anchor
 * (one per user per day). Items store nutritional snapshots so the
 * history stays frozen even if a product changes later.
 */

/** Draft item: a product and a quantity in the product's OWN unit (g, rebanadas…). */
export interface MealItemInput {
  product_id: string;
  quantity: number;
}

/** A meal (group of items) with its product-resolved rows for display. */
export interface Meal {
  meal_id: string;
  /** Derived from the first item's local time (Desayuno/Almuerzo/Merienda/Cena). */
  name: string;
  /** Lucide icon name for the meal avatar (see mealKind). */
  icon: string;
  items: MealItemDetail[];
  protein_total: number;
  calories_total: number;
}

export interface MealItemDetail extends DailyLogItem {
  product_name: string;
  category_icon: string | null;
  unit_label: string;
}

/** Full meal for /meals/[id]: items, totals and the editable local date/time. */
export interface MealDetail {
  meal_id: string;
  /** Derived from the first item's local time (Desayuno/Almuerzo/Merienda/Cena). */
  name: string;
  /** Lucide icon name for the meal avatar (see mealKind). */
  icon: string;
  /** Local calendar date (YYYY-MM-DD) of the meal's first item. */
  date: string;
  /** Local clock time (HH:MM) of the meal's first item. */
  time: string;
  items: MealItemDetail[];
  protein_total: number;
  calories_total: number;
}

export interface TodaySummary {
  meals: Meal[];
  protein_total: number;
  calories_total: number;
  meal_count: number;
}

/** Local calendar date (YYYY-MM-DD) — the day boundary is the user's, not UTC. */
export function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Local calendar date (YYYY-MM-DD) of a stored (UTC) timestamp. */
function localDateOf(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Local clock time (HH:MM) of a stored (UTC) timestamp. */
function localTimeOf(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

/** Local calendar date (YYYY-MM-DD) `days` days ago. */
function daysAgoLocal(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Meal identity derived from the local hour of the meal's first item. */
export function mealKind(createdAt: string): { name: string; icon: string } {
  const hour = new Date(createdAt).getHours();
  if (hour < 11) return { name: "Desayuno", icon: "Coffee" };
  if (hour < 15) return { name: "Almuerzo", icon: "UtensilsCrossed" };
  if (hour < 19) return { name: "Merienda", icon: "Cookie" };
  return { name: "Cena", icon: "CookingPot" };
}

function now() {
  return new Date().toISOString();
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export const dailyLogRepository = {
  /** Today's meals with resolved products and the day's totals. */
  async getToday(userId: string): Promise<TodaySummary> {
    const log = await db.daily_logs
      .where("[user_id+date]")
      .equals([userId, todayLocal()])
      .first();
    if (!log || log.deleted_at) return emptyToday();

    const items = await db.daily_log_items
      .where("daily_log_id")
      .equals(log.id)
      .filter((item) => !item.deleted_at)
      .sortBy("created_at");

    const { productById, categoryById, unitById } = await resolveItemDetails(
      items
    );

    const byMeal = new Map<string, DailyLogItem[]>();
    for (const item of items) {
      const list = byMeal.get(item.meal_id ?? "") ?? [];
      list.push(item);
      byMeal.set(item.meal_id ?? "", list);
    }

    // Newest meal first: every item of a meal shares one created_at, so the
    // first item's timestamp is the meal's time.
    const mealGroups = [...byMeal.entries()].sort((a, b) =>
      b[1][0].created_at.localeCompare(a[1][0].created_at)
    );

    const meals: Meal[] = [];
    let proteinTotal = 0;
    let caloriesTotal = 0;

    for (const [mealId, mealItems] of mealGroups) {
      const { name, icon } = mealKind(mealItems[0].created_at);
      const { protein: mealProtein, calories: mealCalories } = mealTotals(
        mealItems,
        productById
      );
      proteinTotal += mealProtein;
      caloriesTotal += mealCalories;
      const detailItems: MealItemDetail[] = mealItems.map((item) => {
        const product = productById.get(item.product_id);
        return {
          ...item,
          product_name: product?.name ?? "Producto eliminado",
          category_icon: product?.category_id
            ? (categoryById.get(product.category_id)?.icon ?? null)
            : null,
          unit_label: product?.serving_unit_id
            ? (unitById.get(product.serving_unit_id)?.name ?? "")
            : "",
        };
      });
      proteinTotal += mealProtein;
      caloriesTotal += mealCalories;
      meals.push({
        meal_id: mealId,
        name,
        icon,
        items: detailItems,
        protein_total: round1(mealProtein),
        calories_total: Math.round(mealCalories),
      });
    }

    return {
      meals,
      protein_total: round1(proteinTotal),
      calories_total: Math.round(caloriesTotal),
      meal_count: meals.length,
    };
  },

  /**
   * Saves a meal: upserts today's log row and inserts one item per product
   * with the same meal_id and a nutritional snapshot computed now.
   */
  async saveMeal(userId: string, input: MealItemInput[]): Promise<void> {
    if (input.length === 0) return;
    const timestamp = now();
    const mealId = crypto.randomUUID();

    const products = await db.products.bulkGet(input.map((i) => i.product_id));
    const productById = new Map(
      products.filter((p) => p !== undefined).map((p) => [p!.id, p!])
    );

    await db.transaction("rw", db.daily_logs, db.daily_log_items, async () => {
      let logId: string;
      const existing = await db.daily_logs
        .where("[user_id+date]")
        .equals([userId, todayLocal()])
        .first();
      if (existing && !existing.deleted_at) {
        await db.daily_logs.update(existing.id, { updated_at: timestamp });
        logId = existing.id;
      } else {
        const log = {
          id: crypto.randomUUID(),
          user_id: userId,
          date: todayLocal(),
          created_at: timestamp,
          updated_at: timestamp,
          deleted_at: null,
        };
        await db.daily_logs.add(log);
        logId = log.id;
      }

      const items: DailyLogItem[] = input.map((item) => {
        const product = productById.get(item.product_id);
        const quantity = item.quantity;
        return {
          id: crypto.randomUUID(),
          user_id: userId,
          daily_log_id: logId,
          meal_id: mealId,
          product_id: item.product_id,
          quantity,
          ...snapshotFor(product, quantity),
          created_at: timestamp,
          updated_at: timestamp,
          deleted_at: null,
        };
      });

      await db.daily_log_items.bulkAdd(items);
    });

    scheduleSync();
  },

  getFrequentProductIds,
  getWeeklyAverage,
  getMeal,
  updateMealTime,
  updateItem,
  deleteItem,
  deleteMeal,
};

function emptyToday(): TodaySummary {
  return { meals: [], protein_total: 0, calories_total: 0, meal_count: 0 };
}

/**
 * One meal (group of items sharing a meal_id) with its resolved items and
 * totals, plus the editable local date/time of its first item.
 */
async function getMeal(userId: string, mealId: string): Promise<MealDetail | null> {
  const items = await db.daily_log_items
    .where("meal_id")
    .equals(mealId)
    .filter((item) => !item.deleted_at && item.user_id === userId)
    .sortBy("created_at");
  if (items.length === 0) return null;

  const { productById, categoryById, unitById } = await resolveItemDetails(items);
  const { protein, calories } = mealTotals(items, productById);
  const { name, icon } = mealKind(items[0].created_at);

  return {
    meal_id: mealId,
    name,
    icon,
    date: localDateOf(items[0].created_at),
    time: localTimeOf(items[0].created_at),
    items: items.map((item) => {
      const product = productById.get(item.product_id);
      return {
        ...item,
        product_name: product?.name ?? "Producto eliminado",
        category_icon: product?.category_id
          ? (categoryById.get(product.category_id)?.icon ?? null)
          : null,
        unit_label: product?.serving_unit_id
          ? (unitById.get(product.serving_unit_id)?.name ?? "")
          : "",
      };
    }),
    protein_total: round1(protein),
    calories_total: Math.round(calories),
  };
}

/**
 * Moves a meal to another local date/time: its items re-point to that day's
 * log (upserted when missing) and get the new timestamp. The meal_id never
 * changes — only the day anchor and the clock time do. A meal moved away can
 * leave an empty log row behind (harmless; the UI only lists days with items).
 */
async function updateMealTime(
  userId: string,
  mealId: string,
  date: string,
  time: string
): Promise<void> {
  const items = await db.daily_log_items
    .where("meal_id")
    .equals(mealId)
    .filter((item) => !item.deleted_at && item.user_id === userId)
    .toArray();
  if (items.length === 0) return;

  // "YYYY-MM-DDTHH:MM" parses as LOCAL time → the stored UTC instant matches
  // what the user saw in the pickers.
  const timestamp = new Date(`${date}T${time}`).toISOString();

  await db.transaction("rw", db.daily_logs, db.daily_log_items, async () => {
    let logId: string;
    const existing = await db.daily_logs
      .where("[user_id+date]")
      .equals([userId, date])
      .first();
    if (existing && !existing.deleted_at) {
      await db.daily_logs.update(existing.id, { updated_at: timestamp });
      logId = existing.id;
    } else {
      const log: DailyLog = {
        id: crypto.randomUUID(),
        user_id: userId,
        date,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      };
      await db.daily_logs.add(log);
      logId = log.id;
    }

    await db.daily_log_items
      .where("meal_id")
      .equals(mealId)
      .filter((item) => !item.deleted_at && item.user_id === userId)
      .modify({
        daily_log_id: logId,
        created_at: timestamp,
        updated_at: timestamp,
      });
  });

  scheduleSync();
}

/**
 * Snapshot of the nutritional values for a consumed quantity. Macros scale
 * with the reference portion (servingsFor), so 2 rebanadas of a product whose
 * portion is "2 rebanadas" counts one portion, not two.
 */
function snapshotFor(product: Product | undefined, quantity: number) {
  const servings = servingsFor(quantity, product);
  return {
    protein: round1(servings * (product?.protein ?? 0)),
    carbs: round1(servings * (product?.carbs ?? 0)),
    fat: round1(servings * (product?.fat ?? 0)),
    fiber: round1(servings * (product?.fiber ?? 0)),
    calories: Math.round(servings * (product?.calories ?? 0)),
    sugars: round1(servings * (product?.sugars ?? 0)),
    sodium: round1(servings * (product?.sodium ?? 0)),
  };
}

/** Changes an item's quantity and recomputes its snapshot. */
async function updateItem(
  userId: string,
  itemId: string,
  quantity: number
): Promise<void> {
  const item = await db.daily_log_items.get({ id: itemId, user_id: userId });
  if (!item || item.deleted_at) return;

  const product = await db.products.get(item.product_id);
  await db.daily_log_items.update(itemId, {
    quantity,
    ...snapshotFor(product, quantity),
    updated_at: now(),
  });
  scheduleSync();
}

/** Soft-deletes a single item of a meal. */
async function deleteItem(userId: string, itemId: string): Promise<void> {
  await db.daily_log_items
    .where({ id: itemId, user_id: userId })
    .modify({ deleted_at: now(), updated_at: now() });
  scheduleSync();
}

/** Soft-deletes every item of a meal (the day log row stays, harmless). */
async function deleteMeal(userId: string, mealId: string): Promise<void> {
  await db.daily_log_items
    .where("meal_id")
    .equals(mealId)
    .filter((item) => item.user_id === userId)
    .modify({ deleted_at: now(), updated_at: now() });
  scheduleSync();
}

/**
 * Resolves the products (and their categories/units) referenced by a set of
 * log items — shared by getToday and getMeal.
 */
async function resolveItemDetails(items: DailyLogItem[]): Promise<{
  productById: Map<string, Product>;
  categoryById: Map<string, Category>;
  unitById: Map<string, Unit>;
}> {
  const productIds = [...new Set(items.map((item) => item.product_id))];
  const products =
    productIds.length > 0 ? await db.products.bulkGet(productIds) : [];
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
    categoryIds.length > 0
      ? db.categories.bulkGet(categoryIds)
      : Promise.resolve([]),
    unitIds.length > 0 ? db.units.bulkGet(unitIds) : Promise.resolve([]),
  ]);

  return {
    productById,
    categoryById: new Map(
      categories.filter((c) => c !== undefined).map((c) => [c!.id, c!])
    ),
    unitById: new Map(
      units.filter((u) => u !== undefined).map((u) => [u!.id, u!])
    ),
  };
}

/** Protein/calories of a group of items using the CURRENT product values. */
function mealTotals(
  items: DailyLogItem[],
  productById: Map<string, Product>
): { protein: number; calories: number } {
  let protein = 0;
  let calories = 0;
  for (const item of items) {
    const product = productById.get(item.product_id);
    protein += servingsFor(item.quantity, product) * (product?.protein ?? 0);
    calories += servingsFor(item.quantity, product) * (product?.calories ?? 0);
  }
  return { protein, calories };
}

/**
 * Most-used products from real consumption (SDD 08 "Frecuentes" tab):
 * counted over daily_log_items, most recent wins ties. Soft-deleted
 * products are filtered out by the caller (getListItems).
 */
async function getFrequentProductIds(userId: string, limit = 10): Promise<string[]> {
  const items = await db.daily_log_items
    .where("user_id")
    .equals(userId)
    .filter((item) => !item.deleted_at)
    .toArray();

  const stats = new Map<string, { count: number; last: string }>();
  for (const item of items) {
    const entry = stats.get(item.product_id) ?? { count: 0, last: "" };
    entry.count += 1;
    if (item.created_at > entry.last) entry.last = item.created_at;
    stats.set(item.product_id, entry);
  }

  return [...stats.entries()]
    .sort(
      (a, b) =>
        b[1].count - a[1].count || b[1].last.localeCompare(a[1].last)
    )
    .slice(0, limit)
    .map(([productId]) => productId);
}

/** Average protein of the last `days` days and change vs the previous window. */
export interface WeeklyAverage {
  /** Mean protein (g) over days WITH meals in the window (empty days excluded). */
  average: number;
  /** Percent change vs the previous window, or null when there is no baseline. */
  delta: number | null;
}

async function getWeeklyAverage(
  userId: string,
  days = 7
): Promise<WeeklyAverage | null> {
  const currentStart = daysAgoLocal(days - 1);
  const prevStart = daysAgoLocal(days * 2 - 1);

  const logs = await db.daily_logs
    .where("user_id")
    .equals(userId)
    .filter((log) => !log.deleted_at && log.date >= prevStart)
    .sortBy("date");
  if (logs.length === 0) return null;

  const logIds = new Set(logs.map((log) => log.id));
  const items = await db.daily_log_items
    .where("user_id")
    .equals(userId)
    .filter((item) => !item.deleted_at && logIds.has(item.daily_log_id))
    .toArray();
  const byLog = new Map<string, number>();
  for (const item of items) {
    byLog.set(item.daily_log_id, (byLog.get(item.daily_log_id) ?? 0) + item.protein);
  }

  const windowAverage = (logsSlice: typeof logs): number => {
    const daysWithMeals = logsSlice.filter((log) => (byLog.get(log.id) ?? 0) > 0);
    if (daysWithMeals.length === 0) return 0;
    const total = daysWithMeals.reduce(
      (sum, log) => sum + (byLog.get(log.id) ?? 0),
      0
    );
    return total / daysWithMeals.length;
  };

  const current = windowAverage(logs.filter((log) => log.date >= currentStart));
  const previous = windowAverage(logs.filter((log) => log.date < currentStart));
  const average = Math.round(current);
  const delta =
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

  return { average, delta };
}
