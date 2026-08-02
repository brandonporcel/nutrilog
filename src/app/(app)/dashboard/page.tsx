import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Inicio",
};

/** Placeholder for the daily summary (Epic 3). Sign out lives in the drawer. */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-margin-mobile text-center">
      <h1 className="text-headline-lg-mobile text-on-surface">Inicio</h1>
      <p className="text-body-sm-dense text-on-surface-variant">
        Acá vas a ver tu resumen del día y el progreso de proteínas (Epic 3).
      </p>
    </div>
  );
}
