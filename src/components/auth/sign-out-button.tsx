"use client";

import { LogOut } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut()}
      className="flex h-touch-target-min items-center justify-center gap-2 rounded-xl bg-primary px-6 text-title-md text-on-primary shadow-md transition-transform hover:bg-primary/90 active:scale-[0.98]"
    >
      <LogOut aria-hidden className="size-5" />
      Cerrar sesión
    </button>
  );
}
