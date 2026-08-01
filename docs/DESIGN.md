---
name: NutriLog Clinical High-Density
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4a3d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7b6c'
  outline-variant: '#bccbb9'
  surface-tint: '#006e2f'
  primary: '#006e2f'
  on-primary: '#ffffff'
  primary-container: '#22c55e'
  on-primary-container: '#004b1e'
  inverse-primary: '#4ae176'
  secondary: '#1f6c3a'
  on-secondary: '#ffffff'
  secondary-container: '#a4f1b2'
  on-secondary-container: '#24703e'
  tertiary: '#855300'
  on-tertiary: '#ffffff'
  tertiary-container: '#ef9900'
  on-tertiary-container: '#5c3800'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6bff8f'
  primary-fixed-dim: '#4ae176'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005321'
  secondary-fixed: '#a6f4b5'
  secondary-fixed-dim: '#8bd79b'
  on-secondary-fixed: '#00210b'
  on-secondary-fixed-variant: '#005226'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-protein:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm-dense:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  numeric-data:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  margin-mobile: 16px
  margin-desktop: 24px
  gutter: 12px
  list-item-gap: 8px
  touch-target-min: 48px
---

## Brand & Style

The design system is engineered for **NutriLog**, a utility-first PWA designed for high-frequency data entry and monitoring. The brand personality is clinical, efficient, and results-oriented. It prioritizes information density and speed over decorative elements, adopting a **Modern Corporate** aesthetic with **Material Design 3** structural logic.

The goal is to evoke a sense of discipline and clarity. By utilizing a "hero metric" approach, the interface directs all cognitive focus toward protein intake. The visual style uses generous touch targets (for mobile-first utility) but minimizes whitespace within list items to allow for maximum data visibility without scrolling.

## Colors

This design system utilizes a high-contrast Light Mode palette to ensure legibility in various lighting conditions. 

- **Primary Green (#22C55E):** Used for "Success" states, primary progress bars, and the main Floating Action Button (FAB). It symbolizes health and vitality.
- **Secondary Green (#166534):** Used for text on light green backgrounds to maintain AA accessibility.
- **Tertiary Amber (#F59E0B):** Reserved for "Warning" states or secondary metrics (e.g., calories/fats) to keep them visually distinct from protein.
- **Neutral Grays:** A cool-toned slate palette provides a professional, stable foundation. Surfaces use #F8FAFC to subtly differentiate from the pure white #FFFFFF background.

## Typography

The typography system relies exclusively on **Inter** to maximize legibility and maintain a neutral, systematic feel. 

- **The Hero Metric:** Use `display-protein` for the daily total. 
- **Tabular Numerics:** All protein values in lists must use `numeric-data` with `tabular-nums` enabled to ensure that decimals and digits align vertically for easy scanning.
- **High-Density Scaling:** `body-sm-dense` is used for secondary information (e.g., timestamps, serving sizes) to keep list items compact.

## Layout & Spacing

This design system uses a **Fluid Grid** model with a focus on vertical density. 

- **Density:** We utilize a 4px baseline grid. List items are "high-density," meaning vertical padding is reduced to 8px or 12px, while horizontal padding remains at 16px to accommodate thumb-driven navigation.
- **Breakpoints:** On mobile, the layout is a single column with a fixed bottom navigation bar or FAB. On desktop, the content is centered in a 768px container (Tablet width) to prevent excessive line lengths, maintaining the "app-like" feel of the PWA.
- **Rhythm:** Use `list-item-gap` for spacing between log entries. Large margins are avoided to maximize the "at-a-glance" data capacity of the screen.

## Elevation & Depth

To maintain the Material 3 influence without the weight of heavy shadows, this design system uses **Tonal Layers** and **Low-Contrast Outlines**.

1.  **Level 0 (Background):** Pure White (#FFFFFF).
2.  **Level 1 (Cards/Containers):** Light Slate (#F8FAFC) with a 1px border (#E2E8F0). No shadow.
3.  **Level 2 (Active Elements/FAB):** Primary Green with a soft, 12% opacity ambient shadow (4px blur, 2px offset) to indicate interactivity.
4.  **Dividers:** Hairline 1px borders are used to separate list items rather than whitespace, reinforcing the high-density utility look.

## Shapes

The shape language is "Rounded," utilizing an 8px (0.5rem) base radius for standard containers and inputs. 

- **Standard Elements:** 8px radius.
- **Large Containers/FAB:** 16px (rounded-xl) for a friendlier, tactile feel that matches the reference images.
- **Inputs:** Softened with 8px corners to balance the "clinical" nature of the data with a modern PWA feel.

## Components

### Floating Action Button (FAB)
The primary entry point for adding protein. It should be a large circle (56px x 56px) positioned in the bottom-right. It uses the Primary Green background with a White icon.

### High-Density Lists
Modeled after financial management apps. Each row contains:
- **Left:** Icon/Category (small 32px circle).
- **Center:** Food Name and Timestamp (stacked).
- **Right:** Protein Value (bold, using `numeric-data`).
- **Separator:** 1px horizontal rule between entries.

### Protein Progress Header
A "Sticky" top component showing the daily progress bar. The bar height is 12px with a 6px radius. The background is a 20% opacity version of the primary green.

### Input Fields & Keypad
Inputs are full-width with 1px slate borders. When adding data, a custom numeric keypad (as seen in the reference) should be utilized for speed, featuring large 64px-height touch targets.

### Chips
Used for quick-add categories (e.g., "Whey," "Chicken," "Eggs"). These are small, pill-shaped buttons with `body-sm-dense` typography and a 1px border.