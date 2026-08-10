"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { type Unit } from "@/lib/db/database";
import { unitsRepository } from "@/lib/repositories/units";
import { createClient } from "@/lib/supabase/client";

/**
 * Verification screen for the data layer (SDD 03); moved under the app
 * shell in SDD 04. Auth is handled by the (app) layout + proxy.
 */
export default function UnitsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setUserId(data.session?.user.id ?? null);
      });
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const list = await unitsRepository.getAll(userId);
    setUnits(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void unitsRepository.ensureSeeds(userId).then(refresh);
  }, [userId, refresh]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!userId || !name.trim()) return;
    await unitsRepository.save(userId, { name });
    setName("");
    await refresh();
  }

  async function handleDelete(unit: Unit) {
    if (!userId) return;
    await unitsRepository.softDelete(userId, unit.id);
    await refresh();
  }

  return (
    <div className="flex min-h-[70vh] flex-col gap-6 p-margin-mobile">
      <header className="flex flex-col gap-1">
        <h1 className="text-headline-lg-mobile text-on-surface">Unidades</h1>
        <p className="text-body-sm-dense text-on-surface-variant">
          Temporal (SDD 03): gestión mínima de unidades hasta que Plantillas la
          reemplace.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2"
        aria-label="Nueva unidad"
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nueva unidad…"
          aria-label="Nombre de la unidad"
          className="h-touch-target-min w-full rounded-lg border border-outline-variant bg-white px-4 text-body-lg text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Button type="submit" size="lg" aria-label="Agregar unidad">
          <Plus />
          Agregar
        </Button>
      </form>

      <ul className="flex flex-col divide-y divide-outline-variant/60 rounded-lg border border-outline-variant bg-white">
        {loading && (
          <li className="px-4 py-3 text-body-sm-dense text-on-surface-variant">
            Cargando…
          </li>
        )}
        {!loading && units.length === 0 && (
          <li className="px-4 py-3 text-body-sm-dense text-on-surface-variant">
            Sin unidades todavía.
          </li>
        )}
        {units.map((unit) => (
          <li
            key={unit.id}
            className="flex items-center justify-between gap-2 px-4 py-3"
          >
            <span className="text-body-lg text-on-surface">{unit.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void handleDelete(unit)}
              aria-label={`Eliminar ${unit.name}`}
            >
              <Trash2 className="text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
