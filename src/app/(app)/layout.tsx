import { OfflineAuthGuard } from "@/components/auth/offline-auth-guard";
import { AppShell } from "@/components/shell/app-shell";

/**
 * Shell layout for authenticated screens (SDD 04).
 * The route group does not change URLs: /dashboard, /products, /units, etc.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OfflineAuthGuard>
      <AppShell>{children}</AppShell>
    </OfflineAuthGuard>
  );
}
