import { createElement } from "react";
import {
  Coffee,
  Cookie,
  CookingPot,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps the meal `icon` field (lucide icon name derived by mealKind, SDD 08)
 * to its component. Unknown names fall back to UtensilsCrossed so the UI
 * never renders a broken icon.
 */
const MEAL_ICONS: Record<string, LucideIcon> = {
  Coffee,
  Cookie,
  CookingPot,
};

export function getMealIcon(iconName: string | null | undefined): LucideIcon {
  return (iconName && MEAL_ICONS[iconName]) || UtensilsCrossed;
}

/** Renders the meal icon with a safe fallback. */
export function MealIcon({
  icon,
  className,
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  return createElement(getMealIcon(icon), { className, "aria-hidden": true });
}
