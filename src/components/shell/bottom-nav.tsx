"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, Package, ReceiptText } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/history", label: "Histórico", icon: History },
  { href: "/templates", label: "Modelos", icon: ReceiptText },
  { href: "/products", label: "Productos", icon: Package },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-[768px] items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-0.5 transition-all",
                active
                  ? "text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              )}
            >
              <Icon
                className={cn("size-6", active && "fill-primary/15")}
                aria-hidden
              />
              <span className="text-label-caps">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
