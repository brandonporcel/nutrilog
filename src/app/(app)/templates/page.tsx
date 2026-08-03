"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Utensils } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { SwipeableRow } from "@/components/products/swipeable-row";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  templatesRepository,
  type TemplateSummary,
} from "@/lib/repositories/templates";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast-store";

export default function TemplatesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TemplateSummary | null>(
    null
  );

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setUserId(data.session?.user.id ?? null);
      });
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setTemplates(await templatesRepository.getAll(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) void Promise.resolve().then(refresh);
  }, [userId, refresh]);

  // Scrolling closes any open row (Material behavior for swipe actions).
  useEffect(() => {
    const closeRow = () => setOpenRowId(null);
    window.addEventListener("scroll", closeRow, { passive: true });
    return () => window.removeEventListener("scroll", closeRow);
  }, []);

  async function handleDelete() {
    if (!userId || !deleteTarget) return;
    await templatesRepository.softDelete(userId, deleteTarget.id);
    setTemplates((current) =>
      current.filter((template) => template.id !== deleteTarget.id)
    );
    setDeleteTarget(null);
    toast("Plantilla eliminada");
  }

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="px-margin-mobile pb-4 pt-6">
        <h1 className="text-title-lg text-on-surface">Mis Plantillas</h1>
        <p className="mt-1 text-body-sm-dense text-on-surface-variant">
          Seleccioná una plantilla guardada para añadirla rápidamente a tu
          diario.
        </p>
      </div>

      {loading && (
        <p className="px-margin-mobile py-6 text-body-sm-dense text-on-surface-variant">
          Cargando…
        </p>
      )}

      {!loading && templates.length === 0 && (
        <div className="flex flex-col items-center gap-4 px-margin-mobile py-16 text-center">
          <p className="text-body-lg text-on-surface">
            Todavía no creaste plantillas.
          </p>
          <p className="text-body-sm-dense text-on-surface-variant">
            Armá tus comidas frecuentes para registrarlas en un toque.
          </p>
          <Button render={<Link href="/templates/new" />} nativeButton={false}>
            <Plus />
            Crear la primera
          </Button>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div
          className="flex flex-col divide-y divide-outline-variant"
          onClick={() => setOpenRowId(null)}
        >
          {templates.map((template) => (
            <SwipeableRow
              key={template.id}
              open={openRowId === template.id}
              onOpenChange={(open) =>
                setOpenRowId((current) =>
                  open ? template.id : current === template.id ? null : current
                )
              }
              onEdit={() => router.push(`/templates/${template.id}/edit`)}
              onDelete={() => setDeleteTarget(template)}
              editLabel="Editar plantilla"
              deleteLabel="Eliminar plantilla"
            >
              <Link
                href={`/templates/${template.id}/edit`}
                className="flex items-center px-margin-mobile py-3 transition-colors active:bg-surface-container"
              >
                <div className="mr-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary">
                  <Utensils className="size-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-grow">
                  <h3 className="truncate text-title-md text-on-surface">
                    {template.name}
                  </h3>
                  <p className="truncate text-body-sm-dense text-on-surface-variant">
                    {template.item_count === 0
                      ? "Sin alimentos"
                      : template.preview}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 text-right">
                  <span className="text-numeric-data text-primary">
                    ≈ {template.protein_total} g
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-tight text-on-surface-variant">
                    Proteína
                  </p>
                </div>
                <ChevronRight
                  className="ml-4 size-5 flex-shrink-0 text-outline"
                  aria-hidden
                />
              </Link>
            </SwipeableRow>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.name}” se quita de tu lista de plantillas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
