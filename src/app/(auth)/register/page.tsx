import type { Metadata } from "next";
import { Activity, Dumbbell, Salad, type LucideIcon } from "lucide-react";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

const highlights: { icon: LucideIcon; containerClass: string }[] = [
  { icon: Dumbbell, containerClass: "bg-primary-container text-on-primary-container" },
  { icon: Activity, containerClass: "bg-tertiary-container text-on-tertiary-container" },
  { icon: Salad, containerClass: "bg-secondary-container text-on-secondary-container" },
];

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface p-margin-mobile md:p-margin-desktop">
      <header className="mb-8 text-center">
        <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary md:text-headline-lg">
          NutriLog
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-body-sm-dense text-on-surface-variant">
          Precisión clínica en el monitoreo de tu performance nutricional.
        </p>
      </header>

      <div className="w-full max-w-[480px] rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
        <h2 className="mb-1 text-title-md text-on-surface">Crear cuenta</h2>
        <p className="mb-8 text-body-sm-dense text-on-surface-variant">
          Comienza tu jornada de alta densidad proteica hoy.
        </p>
        <RegisterForm />
      </div>

      {/* Decorative highlight pills */}
      <div
        aria-hidden
        className="pointer-events-none mt-12 grid w-full max-w-[480px] grid-cols-3 select-none gap-gutter opacity-40"
      >
        {highlights.map(({ icon: Icon, containerClass }) => (
          <div key={containerClass} className="flex flex-col items-center gap-2">
            <div
              className={`flex size-10 items-center justify-center rounded-full ${containerClass}`}
            >
              <Icon className="size-5" />
            </div>
            <div className="h-1 w-12 rounded-full bg-outline-variant" />
          </div>
        ))}
      </div>
    </main>
  );
}
