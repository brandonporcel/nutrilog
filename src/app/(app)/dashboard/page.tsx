"use client";

import Link from "next/link";
import { Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { DAILY_PROTEIN_GOAL_GRAMS } from "@/lib/daily-goal";
import { MealIcon } from "@/lib/icons/meal-icon";
import {
  dailyLogRepository,
  type TodaySummary,
  type WeeklyAverage,
} from "@/lib/repositories/daily-log";
import { createClient } from "@/lib/supabase/client";

function mealPreview(items: TodaySummary["meals"][number]["items"]): string {
  return items
    .slice(0, 3)
    .map((item) => item.product_name)
    .join(", ");
}

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [weekly, setWeekly] = useState<WeeklyAverage | null>(null);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setUserId(data.session?.user.id ?? null);
      });
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [todayData, weeklyData] = await Promise.all([
      dailyLogRepository.getToday(userId),
      dailyLogRepository.getWeeklyAverage(userId, 7),
    ]);
    setToday(todayData);
    setWeekly(weeklyData);
  }, [userId]);

  useEffect(() => {
    if (userId) void Promise.resolve().then(refresh);
  }, [userId, refresh]);

  const goal = DAILY_PROTEIN_GOAL_GRAMS;
  const consumed = today?.protein_total ?? 0;
  const percent = Math.min(100, Math.round((consumed / goal) * 100));
  const remaining = Math.max(0, goal - consumed);

  return (
    <div className="flex flex-col gap-gutter px-margin-mobile pb-8 pt-4">
      {/* Hero protein metric */}
      <section className="mt-1 flex flex-col gap-4 rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-label-caps uppercase tracking-widest text-on-surface-variant">
              Proteína diaria
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-display-protein font-bold text-primary">
                {consumed}
              </span>
              <span className="text-title-md text-on-surface-variant">
                / {goal}g
              </span>
            </div>
          </div>
          <span className="text-numeric-data text-primary">{percent}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-primary/20">
          <div
            className="h-full rounded-full bg-primary-container transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </section>

      {/* Weekly average + remaining goal */}
      <div className="grid grid-cols-2 gap-4">
        {weekly && (
          <div className="flex flex-col gap-2 rounded-xl bg-surface-container-high p-4">
            <span className="text-label-caps uppercase text-primary">
              Media semanal
            </span>
            <span className="text-headline-lg-mobile text-on-surface">
              {weekly.average} g
            </span>
            {weekly.delta !== null && (
              <span
                className={
                  weekly.delta >= 0
                    ? "flex items-center gap-1 text-body-sm-dense text-green-700"
                    : "flex items-center gap-1 text-body-sm-dense text-destructive"
                }
              >
                {weekly.delta >= 0 ? (
                  <TrendingUp className="size-4" aria-hidden />
                ) : (
                  <TrendingDown className="size-4" aria-hidden />
                )}
                {weekly.delta >= 0 ? "+" : ""}
                {weekly.delta}%
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-xl border border-outline-variant bg-white p-4">
          <span className="text-label-caps uppercase text-on-surface-variant">
            Meta restante
          </span>
          <span className="text-headline-lg-mobile text-on-surface">
            {remaining} g
          </span>
          <div className="h-1 w-full overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {!today && (
        <p className="py-6 text-body-sm-dense text-on-surface-variant">
          Cargando…
        </p>
      )}

      {today && today.meals.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-body-lg text-on-surface">
            Todavía no registraste comidas hoy.
          </p>
          <p className="text-body-sm-dense text-on-surface-variant">
            Tocá el botón + para cargar tu primera comida del día.
          </p>
          <Button render={<Link href="/meals/new" />} nativeButton={false}>
            <Plus />
            Nueva comida
          </Button>
        </div>
      )}

      {today && today.meals.length > 0 && (
        <section className="flex flex-col">
          <div className="mb-1 flex items-baseline justify-between border-b border-outline-variant py-2">
            <h2 className="text-title-md font-bold text-on-surface">Hoy</h2>
            <span className="text-label-caps text-on-surface-variant">
              TOTAL: {consumed} g
            </span>
          </div>

          <div className="flex flex-col divide-y divide-outline-variant/30">
            {today.meals.map((meal) => (
              <div key={meal.meal_id} className="flex flex-col py-list-item-gap">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary">
                      <MealIcon icon={meal.icon} className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-title-md text-on-surface">
                        {meal.name}
                      </span>
                      <span className="block truncate text-body-sm-dense text-on-surface-variant">
                        {mealPreview(meal.items)}
                      </span>
                    </div>
                  </div>
                  <span className="ml-3 flex-shrink-0 text-numeric-data text-primary">
                    {meal.protein_total} g
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
