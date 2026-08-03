"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TemplateForm } from "@/components/templates/template-form";
import { templatesRepository } from "@/lib/repositories/templates";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast-store";

export default function NewTemplatePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setUserId(data.session?.user.id ?? null);
      });
  }, []);

  return (
    <TemplateForm
      submitLabel="Guardar plantilla"
      onSubmit={async (input) => {
        if (!userId) return;
        await templatesRepository.save(userId, input);
        toast("Plantilla creada con éxito");
        router.push("/templates");
      }}
    />
  );
}
