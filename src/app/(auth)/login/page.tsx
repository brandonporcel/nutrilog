import type { Metadata } from "next";

import { BrandPanel } from "@/components/auth/brand-panel";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/auth/logo";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-margin-mobile md:p-margin-desktop">
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05),0_8px_10px_-6px_rgba(0,0,0,0.05)] md:min-h-[640px] md:flex-row">
        <BrandPanel />
        <div className="flex w-full flex-col justify-center bg-white p-8 md:w-1/2 md:p-16">
          <Logo
            className="mb-6 md:hidden"
            iconClassName="size-8"
            textClassName="text-headline-lg-mobile"
          />
          <div className="mb-10">
            <h2 className="mb-2 text-title-md text-on-surface">
              Bienvenido de nuevo
            </h2>
            <p className="text-body-sm-dense text-on-surface-variant">
              Ingresa a tu cuenta para gestionar tus registros nutricionales.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
