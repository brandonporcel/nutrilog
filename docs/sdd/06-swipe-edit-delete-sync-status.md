# SDD 06 — Editar/eliminar con swipe + indicador de estado de sync

Estado: ✅ Aprobado

---

## Proposal

### Contexto

- SDD 04 y 05 implementados: crear, listar y ver detalle de productos. Editar/eliminar quedó pendiente del Epic 1.
- El usuario pidió editar/eliminar con **swipe del item hacia la izquierda** (opción elegida sobre botones dentro de la pantalla de detalle).
- Bug de sync corregido aparte (orden FK + retry 60 s + logging). Ahora falta **avisar al usuario** cuando el sync falla de verdad: hoy el fracaso es silencioso y el usuario cree que su data está en la nube cuando no lo está. El usuario pidió toasts para estos casos.
- La app usa toasts caseros (div con estado en `products/new`), sin librería de toasts.

### Objetivo

1. Swipe a la izquierda en las filas de la lista → revelar acciones **Editar** y **Eliminar**.
2. Pantalla de edición en `/products/[id]/edit` reutilizando el formulario de creación.
3. Eliminar con confirmación → `softDelete` → sync.
4. Indicador de estado de sync (chip sutil en el header) + toast solo cuando el sync falla por un error real estando online.

### Decisiones

- **`react-swipeable`** (~6 KB, sin dependencias, hooks, axis-locking). Los touch events crudos son un pozo sin fondo (conflicto scroll vertical vs swipe horizontal); la librería resuelve el axis-locking y los umbrales. Framer-motion sería overkill.
- **Toast de error de sync: solo ante errores reales online.** Fallos por falta de red = ruido (el retry los resuelve solo); el chip de estado cubre ese caso. Un toast por cada reintento de 60 s sería spam.
- **Chip de estado en el header** (patrón Material): *Sincronizando…* / *Sincronizado ✓* / *Sin conexión — cambios pendientes* / error. Compacto y discreto.
- **Toast utilitario compartido**: mini pub-sub (~30 líneas) + host montado en el root layout; sin librería nueva.
- Eliminar/editar categorías, marcas y unidades queda fuera (Epic 1).

### Fuera de alcance (posterior)

- Swipe en otras listas (histórico, templates).
- CRUD de categorías/marcas/unidades.
- Realtime de Supabase (Epic 5).
- `sugars`/`sodium` en el formulario (siguen en 0; `update` los preserva).

---

## Spec

- **RF1** Dependencia: `react-swipeable` (solo client).
- **RF2** `src/components/products/swipeable-row.tsx`: envuelve la fila de la lista. Swipe izquierda revela dos botones de 88 px detrás (Editar, Eliminar). Una sola fila abierta a la vez (estado `openRowId` en la lista); tap fuera o scroll cierra. `trackMouse` habilitado para desktop. Overswipe → snap a 0 o −176 px con transición CSS (sin animación mientras arrastra).
- **RF3** `productsRepository.update(userId, id, input)`: modifica la fila existente (preserva `created_at`, `sugars`, `sodium`), setea `updated_at = now()` y agenda sync. Devuelve el producto actualizado; `null` si no existe.
- **RF4** `src/app/(app)/products/[id]/edit/page.tsx` (pantalla de tarea): título "Editar", back a `/products/[id]`, sin bottom nav. Carga el detalle (`getDetail`) y lo pasa como `initial` al form; submit → `update` → toast "Producto actualizado" → back al detalle. Producto inexistente → mismo estado "no encontrado" que el detalle.
- **RF5** Refactor: extraer el formulario de `products/new` a `src/components/products/product-form.tsx` compartido por crear y editar (props `initial`, `onSubmit`, `submitLabel`). Sin cambio visual.
- **RF6** Eliminar: botón Eliminar del swipe → `AlertDialog` (shadcn base-ui) "¿Eliminar producto?" con copy "Se quita de tu lista de productos" + acciones Cancelar / Eliminar (destructive) → `softDelete` → fila fuera del estado local → toast "Producto eliminado" → sync ya agenda `softDelete`.
- **RF7** `src/lib/sync/sync-status.ts`: pub-sub mínimo (`subscribeSyncStatus`, `getSyncStatus`, emisor interno) con estados `syncing | synced | offline | error`. `sync.ts` emite: `syncing` al empezar, `synced` al pasar todas las tablas, `error` ante un push/pull fallido por error real (no por `navigator.onLine === false`).
- **RF8** `src/components/shell/sync-status-indicator.tsx`: chip en el header (derecha, junto a la hamburguesa). Solo visible cuando el estado es `syncing`, `offline` o `error` (cuando está `synced` no hay ruido visual).
- **RF9** Toast compartido: `src/lib/ui/toast-store.ts` (pub-sub `toast(message, tone)`) + `src/components/ui/toast-host.tsx` montado en el root layout. Toasts: éxito de edición/eliminación y **error de sync online** ("No se pudo sincronizar — mirá la consola").
- **RF10** `app-shell`: `getScreen(pathname)` con regex para rutas dinámicas: `/products/[id]` → "Detalle"; `/products/[id]/edit` → "Editar" (back al detalle). Reemplaza el matcheo actual `startsWith`.

### No funcionales

- TS estricto; sin librerías pesadas nuevas (react-swipeable ≈ 6 KB).
- Accesibilidad: los botones revelados son `<button>` reales (focusables); la fila abierta se mantiene con `focus-within` para uso por teclado.
- El scroll vertical nunca queda secuestrado por el swipe (axis-locking + umbral `delta`).

---

## Design

### Archivos

```
src/
  lib/sync/sync-status.ts                  # pub-sub de estado (nuevo)
  lib/sync/sync.ts                         # emite estados al loop
  lib/ui/toast-store.ts                    # pub-sub de toasts (nuevo)
  components/ui/toast-host.tsx             # host global (nuevo)
  components/ui/alert-dialog.tsx           # shadcn: npx shadcn@latest add alert-dialog
  components/products/swipeable-row.tsx    # fila con swipe (nuevo)
  components/products/product-form.tsx     # form compartido (extraído de products/new)
  components/shell/sync-status-indicator.tsx # chip de estado (nuevo)
  components/shell/header.tsx              # + indicador
  components/shell/app-shell.tsx           # getScreen(pathname)
  app/(app)/products/page.tsx              # rows → SwipeableRow + openRowId
  app/(app)/products/[id]/edit/page.tsx    # edición (nuevo)
  app/(app)/products/new/page.tsx          # → usa ProductForm
  lib/repositories/products.ts             # + update
```

### swipeable-row (borrador)

```tsx
// props: open (bool), onOpenChange, onEdit, onDelete, children
// useSwipeable({ onSwipedLeft: (d) => ..., onSwipedRight: ..., delta: 10 })
// contenedor con overflow-hidden; acciones absolut en right; contenido con
// transform translateX(open ? -176 : drag) y transition solo cuando no arrastra
```

### getScreen (borrador)

```ts
function getScreen(pathname: string): Screen | undefined {
  const detail = pathname.match(/^\/products\/([^/]+)$/);
  if (detail) return { title: "Detalle", back: "/products" };
  const edit = pathname.match(/^\/products\/([^/]+)\/edit$/);
  if (edit) return { title: "Editar", back: `/products/${edit[1]}` };
  return SCREENS[pathname];
}
```

### sync-status (borrador)

```ts
type SyncStatus = "syncing" | "synced" | "offline" | "error";
// subscribeSyncStatus(cb): () => void | getSyncStatus(): SyncStatus
// sync.ts: emit("syncing") al entrar; por tabla, si error real → emit("error");
// si navigator.onLine === false → emit("offline"); pasada completa OK → emit("synced")
```

### Tasks

1. `npx shadcn@latest add alert-dialog` (base-ui, verificar componente).
2. `npm i react-swipeable`.
3. `sync-status.ts` + emisiones en `sync.ts`.
4. `toast-store.ts` + `toast-host.tsx` + montaje en el root layout.
5. Refactor `ProductForm` (extraer de `products/new`); `products/new` pasa a usarlo sin cambios visuales.
6. `update` en `productsRepository` (+ `ProductDetail` en `initial`).
7. `swipeable-row.tsx` + integración en la lista (`openRowId`, cerrar con tap/scroll).
8. `/products/[id]/edit/page.tsx`.
9. AlertDialog de eliminación en la lista.
10. `app-shell`: `getScreen` con regex (detalle + editar).
11. `sync-status-indicator` en el header + toast de error online.
12. Verificar: `npm run build`, `npm run lint`, smoke (307 sin sesión en `/products/[id]/edit`; flujo editar → guardar → detalle actualizado; eliminar → confirmación → lista sin el producto; sync OK con el chip).
