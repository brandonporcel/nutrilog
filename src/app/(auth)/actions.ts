"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error: string | null;
};

function mapAuthError(message: string): string {
  switch (message) {
    case "Invalid login credentials":
      return "Email o contraseña incorrectos.";
    case "User already registered":
      return "Ya existe una cuenta con este email.";
    case "Email not confirmed":
      return "Confirma tu email antes de ingresar.";
    default:
      return message;
  }
}

export async function signIn(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  redirect("/dashboard");
}

export async function signUp(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
