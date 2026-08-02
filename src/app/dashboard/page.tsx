import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface p-6 text-center">
      <h1 className="text-headline-lg text-on-surface">Dashboard</h1>
      <p className="text-body-lg text-on-surface-variant">
        Sesión iniciada como{" "}
        <span className="font-semibold text-on-surface">{user.email}</span>
      </p>
      <SignOutButton />
    </main>
  );
}
