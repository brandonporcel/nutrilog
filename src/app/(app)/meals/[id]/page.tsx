"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/lib/icons/category-icon";
import { MealIcon } from "@/lib/icons/meal-icon";
import {
  dailyLogRepository,
  type MealDetail,
} from "@/lib/repositories/daily-log";
import { unitLabel } from "@/lib/repositories/templates";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast-store";

function prettyDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const label = new Date(year, month - 1, day).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function MealDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [meal, setMeal] = useState<MealDetail | null>(null);
  const [state, setState] = useState<"loading" | "found" | "missing">(
    "loading"
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(async ({ data }) => {
        const currentUserId = data.session?.user.id;
        if (!currentUserId) return;
        setUserId(currentUserId);
        const detail = await dailyLogRepository.getMeal(
          currentUserId,
          params.id
        );
        if (detail) {
          setDate(detail.date);
          setTime(detail.time);
        }
        setMeal(detail);
        setState(detail ? "found" : "missing");
      });
  }, [params.id]);

  async function handleSave() {
    if (!userId || !date || !time || saving) return;
    setSaving(true);
    try {
      await dailyLogRepository.updateMealTime(userId, params.id, date, time);
      toast("Fecha y hora actualizadas");
      router.push("/dashboard");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudo guardar el cambio.",
        "error"
      );
      setSaving(false);
    }
  }

  if (state === "loading") {
    return (
      <p className="px-margin-mobile py-6 text-body-sm-dense text-on-surface-variant">
        Cargando…
      </p>
    );
  }

  if (state === "missing" || !meal) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-margin-mobile text-center">
        <p className="text-body-lg text-on-surface">
          Comida no encontrada.
        </p>
        <Link
          href="/dashboard"
          className="text-body-lg text-primary underline-offset-4 hover:underline"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-margin-mobile pb-32 pt-4">
      {/* Header: identity + totals */}
      <section className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary">
            <MealIcon icon={meal.icon} className="size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-headline-lg-mobile text-on-surface">
              {meal.name}
            </h1>
            <p className="truncate text-body-sm-dense text-on-surface-variant">
              {prettyDate(meal.date)} · {meal.time}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-outline-variant/60 pt-3">
          <div className="text-center">
            <p className="text-display-protein font-bold text-primary">
              {meal.protein_total} g
            </p>
            <p className="text-body-sm-dense text-on-surface-variant">
              Proteína
            </p>
          </div>
          <div className="text-center">
            <p className="text-numeric-data text-on-surface">
              {meal.calories_total} kcal
            </p>
            <p className="text-body-sm-dense text-on-surface-variant">
              Calorías
            </p>
          </div>
        </div>
      </section>

      {/* Items */}
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-label-caps uppercase text-on-surface-variant">
          Alimentos
        </h2>
        <div className="flex flex-col divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface">
          {meal.items.map((item) => (
            <div key={item.id} className="flex items-center px-3 py-3">
              <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary">
                <CategoryIcon icon={item.category_icon} className="size-5" />
              </div>
              <div className="min-w-0 flex-grow">
                <p className="truncate text-body-lg font-semibold text-on-surface">
                  {item.product_name}
                </p>
                <p className="truncate text-body-sm-dense text-on-surface-variant">
                  {item.quantity}{" "}
                  {unitLabel(item.unit_label || undefined)} ·{" "}
                  <span className="text-primary">{item.protein} g prot</span>
                </p>
              </div>
              <span className="ml-4 flex-shrink-0 text-numeric-data text-on-surface">
                {item.calories} kcal
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Edit date/time */}
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-label-caps uppercase text-on-surface-variant">
          Fecha y hora
        </h2>
        <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface p-4">
          <p className="text-body-sm-dense text-on-surface-variant">
            Si te olvidaste de registrar una comida, movela al día y hora
            correctos.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-label-caps text-on-surface-variant">
                Fecha
              </span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-touch-target-min rounded-xl border border-outline-variant bg-surface-container px-3 text-body-lg text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label-caps text-on-surface-variant">
                Hora
              </span>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="h-touch-target-min rounded-xl border border-outline-variant bg-surface-container px-3 text-body-lg text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !date || !time}
            className="h-touch-target-min w-full rounded-full text-title-md"
          >
            <CalendarClock className="size-5" aria-hidden />
            Guardar cambios
          </Button>
        </div>
      </section>
    </div>
  );
}
