"use client";

import { Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { signIn, type AuthFormState } from "@/app/(auth)/actions";
import { AuthInput } from "./auth-input";
import { Divider } from "./divider";
import { GoogleButton } from "./google-button";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signIn,
    { error: null }
  );

  return (
    <>
      <form action={formAction} className="space-y-6">
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
          autoComplete="current-password"
          showToggle
          labelAction={
            <a
              href="#"
              onClick={(event) => event.preventDefault()}
              className="text-body-sm-dense font-semibold text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </a>
          }
        />

        {state.error && (
          <p role="alert" className="text-body-sm-dense text-destructive">
            {state.error}
          </p>
        )}

        <div className="space-y-4 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="flex h-touch-target-min w-full items-center justify-center rounded-xl bg-primary text-title-md text-on-primary shadow-md transition-transform hover:bg-primary/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {pending ? "Ingresando..." : "Ingresar"}
          </button>
          <Divider label="O" />
          <GoogleButton>Continuar con Google</GoogleButton>
        </div>
      </form>
      <p className="mt-10 text-center text-body-sm-dense text-on-surface-variant">
        ¿No tienes una cuenta?{" "}
        <Link
          href="/register"
          className="font-bold text-primary hover:underline"
        >
          Regístrate
        </Link>
      </p>
    </>
  );
}
