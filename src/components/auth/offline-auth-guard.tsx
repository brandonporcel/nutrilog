"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Client-side fallback for protected routes.
 * The SSR guard (src/proxy.ts) validates online; this component covers
 * offline navigation using the locally persisted session.
 * getSession() reads localStorage — no network call.
 */
export function OfflineAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data.session) {
          router.replace("/login");
        } else {
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) return null;

  return <>{children}</>;
}
