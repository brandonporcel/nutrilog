import { createElement } from "react";
import {
  Apple,
  Bean,
  Candy,
  Carrot,
  Croissant,
  CupSoda,
  Drumstick,
  Egg,
  Milk,
  Package,
  Pill,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps the category `icon` field (lucide icon name, stored/synced as data)
 * to its component. Products without a category use UtensilsCrossed;
 * unknown names fall back to Package so the UI never renders a broken icon.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  egg: Egg,
  drumstick: Drumstick,
  milk: Milk,
  apple: Apple,
  carrot: Carrot,
  croissant: Croissant,
  wheat: Wheat,
  bean: Bean,
  "cup-soda": CupSoda,
  pill: Pill,
  candy: Candy,
  package: Package,
};

export const NO_CATEGORY_ICON: LucideIcon = UtensilsCrossed;

export function getCategoryIcon(iconName: string | null | undefined): LucideIcon {
  return (iconName && CATEGORY_ICONS[iconName]) || Package;
}

/** Renders the category icon with a safe fallback. */
export function CategoryIcon({
  icon,
  className,
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  return createElement(getCategoryIcon(icon), { className, "aria-hidden": true });
}
