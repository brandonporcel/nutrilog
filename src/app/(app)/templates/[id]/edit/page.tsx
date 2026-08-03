"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TemplateForm } from "@/components/templates/template-form";
import {
  templatesRepository,
  type TemplateDetail,
} from "@/lib/repositories/templates";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast-store";

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [state, setState] = useState<"loading" | "found" | "missing">(
    "loading"
  );

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(async ({ data }) => {
        const currentUserId = data.session?.user.id;
        if (!currentUserId) return;
        setUserId(currentUserId);
        const detail = await templatesRepository.getDetail(currentUserId, params.id);
        setTemplate(detail);
        setState(detail ? "found" : "missing");
      });
  }, [params.id]);

  if (state === "loading") {
    return (
      <p className="px-margin-mobile py-6 text-body-sm-dense text-on-surface-variant">
        Cargando…
      </p>
    );
  }

  if (state === "missing" || !template) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-margin-mobile text-center">
        <p className="text-body-lg text-on-surface">Plantilla no encontrada.</p>
        <Link
          href="/templates"
          className="text-body-lg text-primary underline-offset-4 hover:underline"
        >
          Volver a plantillas
        </Link>
      </div>
    );
  }

  return (
    <TemplateForm
      key={template.id}
      initial={template}
      submitLabel="Guardar cambios"
      onSubmit={async (input) => {
        if (!userId) return;
        await templatesRepository.update(userId, params.id, input);
        toast("Plantilla actualizada");
        router.push("/templates");
      }}
    />
  );
}
