"use client";

import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthInputProps = {
  id: string;
  label: string;
  icon: LucideIcon;
  type?: "text" | "email" | "password";
  placeholder?: string;
  autoComplete?: string;
  showToggle?: boolean;
  labelAction?: ReactNode;
};

export function AuthInput({
  id,
  label,
  icon: Icon,
  type = "text",
  placeholder,
  autoComplete,
  showToggle = false,
  labelAction,
}: AuthInputProps) {
  const [visible, setVisible] = useState(false);
  const resolvedType = type === "password" && visible ? "text" : type;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-label-caps text-on-surface-variant"
        >
          {label}
        </label>
        {labelAction}
      </div>
      <div className="group relative">
        <Icon
          aria-hidden
          className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-outline transition-colors group-focus-within:text-primary"
        />
        <input
          id={id}
          name={id}
          type={resolvedType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className={cn(
            "h-touch-target-min w-full rounded-lg border border-outline-variant bg-white pl-10 text-body-lg text-on-surface outline-none transition-all placeholder:text-outline",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            showToggle ? "pr-12" : "pr-4"
          )}
        />
        {showToggle && type === "password" && (
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-on-surface"
          >
            {visible ? (
              <EyeOff aria-hidden className="size-5" />
            ) : (
              <Eye aria-hidden className="size-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
