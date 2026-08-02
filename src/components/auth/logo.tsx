import { Salad } from "lucide-react";

import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
};

export function Logo({ className, iconClassName, textClassName }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Salad
        aria-hidden
        className={cn("text-primary", iconClassName)}
        fill="currentColor"
        strokeWidth={1}
      />
      <span
        className={cn(
          "font-extrabold tracking-tight text-primary",
          textClassName
        )}
      >
        NutriLog
      </span>
    </div>
  );
}
