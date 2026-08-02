"use client";

import { ArrowRight, Info, KeyRound, Loader2, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { signUp, type AuthFormState } from "@/app/(auth)/actions";
import { AuthInput } from "./auth-input";
import { Divider } from "./divider";
import { GoogleButton } from "./google-button";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signUp,
    { error: null }
  );

  return (
    <>
      <form action={formAction} className="space-y-5">
        <AuthInput
          id="full-name"
          label="Nombre completo"
          icon={User}
          placeholder="Ej: Juan Pérez"
          autoComplete="name"
        />
        <AuthInput
          id="email"
          label="Email"
          type="email"
          icon={Mail}
          placeholder="nombre@ejemplo.com"
          autoComplete="email"
        />
        <AuthInput
          id="password"
          label="Contraseña"
          type="password"
          icon={Lock}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <AuthInput
          id="confirm-password"
          label="Confirmar contraseña"
          type="password"
          icon={KeyRound}
          placeholder="••••••••"
          autoComplete="new-password"
        />

        {state.error && (
          <p role="alert" className="text-body-sm-dense text-destructive">
            {state.error}
          </p>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-secondary-container/40 bg-secondary-container/20 p-3">
          <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-secondary" />
          <p className="text-body-sm-dense text-on-secondary-container">
            <strong>Nota del sistema:</strong> al registrarte aceptas priorizar la
            ingesta proteica como métrica maestra de tu salud metabólica.
          </p>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="flex h-touch-target-min w-full items-center justify-center gap-2 rounded-lg bg-primary text-title-md text-on-primary shadow-sm transition-all hover:bg-[#005321] active:scale-95 disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 aria-hidden className="size-5 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              Crear cuenta
              <ArrowRight aria-hidden className="size-5" />
            </>
          )}
        </button>
      </form>

      <div className="my-8">
        <Divider label="O" />
      </div>
      <GoogleButton>Regístrate con Google</GoogleButton>

      <p className="mt-8 text-center text-body-sm-dense text-on-surface-variant">
        ¿Ya tienes una cuenta?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Ingresa
        </Link>
      </p>
    </>
  );
}
