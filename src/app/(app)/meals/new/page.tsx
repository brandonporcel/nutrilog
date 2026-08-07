"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MealForm } from "@/components/meals/meal-form";
import { dailyLogRepository } from "@/lib/repositories/daily-log";
import {
  templatesRepository,
  type TemplateSummary,
} from "@/lib/repositories/templates";
import { ensureUserCatalog } from "@/lib/seeder";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast-store";

export default function NewMealPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [consumedToday, setConsumedToday] = useState(0);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(async ({ data }) => {
        const currentUserId = data.session?.user.id;
        if (!currentUserId) return;
        setUserId(currentUserId);
        const [today, templateList] = await Promise.all([
          dailyLogRepository.getToday(currentUserId),
          templatesRepository.getAll(currentUserId),
          ensureUserCatalog(currentUserId),
        ]);
        setConsumedToday(today.protein_total);
        setTemplates(templateList);
      });
  }, []);

  if (!userId) {
    return (
      <p className="px-margin-mobile py-6 text-body-sm-dense text-on-surface-variant">
        Cargando…
      </p>
    );
  }

  return (
    <MealForm
      userId={userId}
      consumedToday={consumedToday}
      templates={templates}
      onSubmit={async (items) => {
        await dailyLogRepository.saveMeal(userId, items);
        toast("Comida guardada");
        router.push("/dashboard");
      }}
    />
  );
}
