# SDD 05 — Detalle de producto (solo lectura)

Estado: ✅ Aprobado

---

## Proposal

### Contexto

- SDD 04 implementado y probado por el usuario: creación y listado de productos funcionando; el sync remoto ya verifica con la migración `0001_initial.sql` ejecutada.
- Feedback del usuario: falta poder tocar un producto de la lista y ver el detalle de los datos cargados.
- El detalle queda **solo lectura**; editar/eliminar se completa en el Epic 1.

### Objetivo

1. Pantalla de detalle en `/products/[id]` que muestra todo lo cargado: identificación (nombre, marca, categoría), porción y macros.
2. Las filas de la lista se vuelven clickeables → detalle.

### Fuera de alcance (posterior)

- Editar y eliminar producto → Epic 1.
- Mostrar `sugars`/`sodium` (siempre 0 hoy; el formulario los expondrá en una iteración futura).
- Historial de consumo del producto.

---

## Spec

- **RF1** Ruta `src/app/(app)/products/[id]/page.tsx` (cliente). Pantalla de tarea: título "Detalle", back a `/products`, **sin bottom nav** (misma regla que la creación).
- **RF2** `productsRepository.getDetail(userId, id)`: devuelve el producto con `brand_name`, `category_name` y `serving_unit_name` resueltos; `null` si no existe o no pertenece al usuario.
- **RF3** Filas de la lista en `/products` → `<Link href={/products/[id]}>` con el mismo layout visual.
- **RF4** UI del detalle:
  - Card de identificación: nombre (headline), marca y categoría (chip).
  - Card hero de proteína por porción (mismo lenguaje visual que la creación).
  - Grid de macros: calorías, carbos, grasas y fibras.
  - Porción: `2 rebanadas (59 g)` con el peso si existe.
  - Producto inexistente → "Producto no encontrado" + link a `/products`.

### No funcionales

- Sin escrituras: solo lectura local (sin `scheduleSync`).
- TS estricto.

---

## Design

### Archivos

```
src/
  app/(app)/products/[id]/page.tsx   # detalle (cliente)
  lib/repositories/products.ts       # + getDetail
  components/shell/app-shell.tsx     # config dinámica para rutas /products/[id]
```

### app-shell (borrador)

```ts
const screen =
  SCREENS[pathname] ??
  (pathname.startsWith("/products/") && pathname !== "/products/new"
    ? { title: "Detalle", back: "/products" }
    : undefined);
```

### getDetail (borrador)

```ts
async getDetail(userId, id): Promise<ProductDetail | null> {
  const product = await db.products.get({ id, user_id: userId });
  if (!product || product.deleted_at) return null;
  // resuelve brand_name / category_name / serving_unit_name con bulkGet
}
```

### Tasks

1. `getDetail` en `productsRepository`.
2. `src/app/(app)/products/[id]/page.tsx`.
3. Filas de la lista → `Link`.
4. `app-shell`: config dinámica para el detalle.
5. Verificar: `npm run build`, `npm run lint`, smoke (`/products/[id]` → 307 sin sesión; navegación lista → detalle → back).
