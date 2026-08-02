# SDD 04 — Navegación principal y pantalla de Productos

Estado: ✅ Aprobado

---

## Proposal

### Contexto

- SDD 03 aprobado e implementado: capa offline-first (Dexie + repositorios + sesión offline) probada con el catálogo Units; el patrón de repositorio queda documentado y listo para extender.
- Diseños de referencia leídos completos y ajustados: `docs/stitch/products/code.html` y `docs/stitch/new-product/code.html`.
- Roadmap Epic 1 (Productos): se ataca la parte de mayor valor primero — navegación + listar y crear productos.
- Decisiones del usuario:
  - Arrancar por la pantalla de **Productos** (no por el Dashboard).
  - Al loguear → `/products` (hoy redirige a `/dashboard`).
  - Footer tabs: **Inicio, Histórico, Modelos, Productos**; header con menú hamburguesa.
  - En Productos **no** se muestra el mes en el header (eso es del Inicio).
  - Sin botón de escáner de código de barras (futuro, Epic 9) y sin hero visual en la creación.
  - Íconos con **lucide-react** (ya instalado, lo usa shadcn) en lugar de Material Symbols de Stitch.
  - La tabla **brands ya existe** (database.md + esquema Dexie): no se crea nada; solo se agrega la UX de alta inline.
- Un solo SDD para navegación + lista + creación (aprobado): el `productsRepository` y los patrones de UI se definen una vez.

### Objetivo

1. **App shell** (layout de pantallas autenticadas): header + bottom nav + FAB contextual + drawer del menú hamburguesa — la base que usarán todas las pantallas futuras.
2. **`/products`**: búsqueda, chips de categoría autogenerados, lista densa con proteína por porción (contexto de la etiqueta), FAB y estado vacío.
3. **`productsRepository`** + `categoriesRepository` + `brandsRepository` (getOrCreate) + sync extendido a `products`, `categories` y `brands` + seeds de categorías.
4. **`/products/new`**: formulario de creación (identificación, porción, nutrición bento) pensado para copiar los valores de la etiqueta o de Google.
5. Login → `/products`; rutas protegidas actualizadas; Dashboard queda como placeholder "Inicio" con shell.

### Fuera de alcance (posterior)

- Editar / ver detalle de producto (solo crear + listar; el CRUD completo se completa en el Epic 1).
- Administración de marcas (pantalla/modal dedicados): acá solo alta inline ("Nueva marca…") → Epic 1.
- Ordenamiento por ranking nutricional (más proteína, más calóricos, etc.) → Epic 7 (Estadísticas).
- Pantallas reales de Histórico, Modelos y Dashboard: los tabs quedan como placeholders navegables; el contenido real es Epic 2/3/4.
- Escáner de código de barras, OpenFoodFacts, OCR, IA → Epic 9.
- `sugars` y `sodium`: se persisten en 0 (los campos existen en el esquema; el formulario los expondrá en una iteración futura).
- Tests automatizados.

### Opciones consideradas

| Opción | Descripción | Veredicto |
| --- | --- | --- |
| **A. Un solo SDD (shell + lista + creación)** | Repositorio y patrones de UI una sola vez; flujo completo "crear → ver en lista" probable de una | ✅ **Elegida** (aprobada por el usuario) |
| B. SDD separados por pantalla | Dos ciclos para una feature chica; redefine patrones dos veces | ❌ |
| **C. Chips de categorías autogeneradas** | Filtro por las categorías del usuario (seeds + creadas), sin valores fijos | ✅ **Elegida** — las categorías son datos del usuario (database.md), cero lógica duplicada |
| D. Pills por ranking nutricional (proteína alta, calóricos…) | Filtrar/ordenar por perfil nutricional | ❌ Es *discovery*, no filtro; se evalúa como sort en Epic 7 |

Otras decisiones:

- **Drawer con shadcn Sheet** (Radix Dialog): patrón estándar y accesible, común en apps; el usuario aprobó agregar la dependencia. El drawer es el menú hamburguesa del header: agrupa lo que no entra en la bottom nav — **Perfil** (placeholder), **Unidades** (temporal) y **Cerrar sesión**.
- **Categorías desde la base, no hardcodeadas**: los chips y el select se alimentan de `categoriesRepository` con los seeds de `docs/database.md` (12 categorías).
- **Marcas sin seed ni pantalla**: `docs/database.md` no define seeds de marcas. El formulario usa un select de marcas existentes + opción "Nueva marca…" que revela un campo de texto → `getOrCreateByName` al guardar.
- **Proteína por porción, no por 100 g**: la lista muestra la proteína tal como figura en la etiqueta (ej. "7,7 g · por 2 rebanadas (59 g)"), porque es lo que el usuario copia y lo que consume. Sin conversión: el valor es el del producto tal cual se cargó. La comparación por 100 g se puede sumar como sort futuro (Epic 7).
- **Drawer sin librería extra de gestión**: Sheet viene del ecosistema shadcn (Radix); no se agrega una librería de navegación.

---

## Spec

### Requisitos funcionales

- **RF1** Route group `src/app/(app)/` con `layout.tsx` cliente: `OfflineAuthGuard` + `AppShell` alrededor de `children`. Agrupa `dashboard`, `units`, `products` y `products/new` (movidos desde sus rutas actuales; las URLs no cambian).
- **RF2** `AppShell`: header fijo (hamburguesa + título), bottom nav fija con las 4 tabs (**Inicio** → `/dashboard`, **Histórico** → placeholder, **Modelos** → placeholder, **Productos** → `/products`), tab activo por `usePathname`, y FAB contextual (configurable por página; solo Productos lo usa → `/products/new`).
- **RF3** Drawer del hamburguesa con **shadcn Sheet**: ítems **Perfil** (placeholder "Próximamente"), **Unidades** (link a `/units`, temporal hasta que Modelos la reemplace) y **Cerrar sesión** (reutiliza `SignOutButton`).
- **RF4** `/products` (cliente): búsqueda por texto (nombre/marca), chips de categoría autogenerados ("Todas" + categorías del repositorio), lista densa (avatar con inicial + nombre + marca + proteína por porción con contexto), FAB "+", estado vacío con CTA a crear, y `ensureSeeds` de categorías y unidades al cargar.
- **RF5** `productsRepository`: `getAll(userId)` (excluye borrados, ordenado por nombre) y `getListItems(userId)` (resuelve `brand_name` desde `brands` y `serving_unit_name` desde `units` para mostrar el contexto de porción), `save(userId, input)` (escribe local primero y agenda sync, patrón SDD 03) y `softDelete`.
- **RF6** `categoriesRepository`: `getAll(userId)` y `ensureSeeds(userId)` con las 12 categorías de `docs/database.md`.
- **RF7** `brandsRepository`: `getAll(userId)` y `getOrCreateByName(userId, name)` (busca por nombre exacto; si no existe, crea la fila y agenda sync).
- **RF8** `/products/new` (cliente): formulario con secciones **Identificación** (nombre requerido; marca en select de existentes + opción "Nueva marca…" que revela un input; categoría en select desde `categoriesRepository`, opción "Sin categoría"), **Porción** (cantidad default 1, unidad en select desde `unitsRepository`, peso opcional en g/ml + presets "100 g" / "1 unidad") y **Nutrición bento** (card hero de proteína + calorías, carbos, grasas, fibras). Hint en la sección nutrición: "Copiá los valores de la etiqueta o de Google (ej. manzana: 1 unidad (182 g))". Botón "Guardar" fijo abajo (pill primario) → guarda, muestra toast de éxito y vuelve a `/products`.
- **RF9** Sync extendido: `TABLES` incluye `products`, `categories` y `brands`; `sync()` itera todas las tablas del mapa (hoy solo `units`).
- **RF10** `src/proxy.ts`: rutas protegidas incluyen `/products` y `/products/new` (o prefijo `/products`); el redirect de usuario autenticado en `/login` o `/register` pasa de `/dashboard` a `/products`.
- **RF11** Dashboard movido a `(app)/dashboard` con contenido placeholder de "Inicio" (se quita `SignOutButton`, que pasa al drawer).

### Requisitos no funcionales

- La UI de guardado nunca espera la red: escritura local inmediata, sync en background (patrón SDD 03).
- TypeScript estricto, sin `any`.
- Estados de carga y vacío en la lista; la búsqueda filtra en cliente sin bloquear.
- Verificación manual en el celu: crear producto offline → reconexión → aparece en Supabase y en la PC; login → `/products`.

---

## Design

### Dependencias

```
npx shadcn@latest add sheet   # agrega @radix-ui/react-dialog
```

### Estructura de archivos

```
src/
  app/(app)/
    layout.tsx                    # cliente: OfflineAuthGuard + AppShell
    dashboard/page.tsx            # movido desde app/dashboard (placeholder Inicio)
    products/
      page.tsx                    # lista + búsqueda + chips + FAB + estado vacío
      new/page.tsx                # formulario de creación
    units/page.tsx                # movido desde app/units (conserva su UI)
  components/shell/
    app-shell.tsx                 # composición: header + bottom nav + FAB + drawer
    bottom-nav.tsx                # 4 tabs, activo por usePathname
    header.tsx                    # hamburguesa (Sheet trigger) + título
    fab.tsx                       # botón flotante contextual (href por página)
  components/ui/sheet.tsx         # componente shadcn (generado por el CLI)
  lib/repositories/
    products.ts                   # productsRepository (getListItems resuelve marca/unidad)
    categories.ts                 # categoriesRepository (+ seeds)
    brands.ts                     # brandsRepository (getOrCreateByName)
```

Nota: el route group `(app)` no cambia URLs; `dashboard` pasa de `src/app/dashboard` a `src/app/(app)/dashboard`, igual `units`.

### Sync (borrador)

```ts
const TABLES = {
  units: db.units,
  products: db.products,
  categories: db.categories,
  brands: db.brands,
} as const;

// sync() itera todas las tablas en vez de hardcodear "units":
for (const entity of Object.keys(TABLES)) {
  await syncTable(entity as SyncableTable);
}
```

- `syncTable` se generaliza para tipar la fila como `SyncEntity` (hoy castea a `Unit`).
- `lastSyncedAt` por entidad en `meta` ya está implementado (SDD 03): cada tabla mantiene su propio timestamp y falla sin avanzarlo.

### Pantalla lista `/products` (borrador)

- Búsqueda: `useState` + filtro case-insensitive sobre `name` y `brand_name` (igual que Stitch, sin useSearchParams).
- Chips: "Todas" + categorías desde `categoriesRepository`; la selección filtra por `category_id`.
- Fila: avatar circular 40 px (bg `secondary-container`, inicial del nombre), nombre semibold truncado, marca en `on-surface-variant`; a la derecha la **proteína por porción** en `primary` con caption del contexto de porción, construido como:
  - con peso: `por {serving_amount} {serving_unit_name} ({serving_weight_grams} g)` → ej. "por 2 rebanadas (59 g)"
  - sin peso: `por {serving_amount} {serving_unit_name}` → ej. "por 1 unidad"
- El valor mostrado es `product.protein` tal cual (porción de la etiqueta): sin conversión por 100 g.
- `ensureSeeds` de categorías y unidades al montar (idempotente, patrón Units).

### Pantalla creación `/products/new` (borrador)

- Header: back arrow (`ArrowLeft`) + título "Nuevo producto".
- Identificación: nombre (input, requerido); marca (select de `brandsRepository.getAll` + opción **"Nueva marca…"** que muestra un input texto → `getOrCreateByName` en el submit); categoría (select desde `categoriesRepository`, opción "Sin categoría").
- Porción: cantidad (number, min 1, default 1), unidad (select desde `unitsRepository`), peso en g/ml (number opcional) + presets: "100 g" (amount 100, unidad "Gram", peso 100) y "1 unidad" (amount 1, unidad "Unit", peso null).
- Nutrición bento (grid 2 cols): card hero proteína (col-span-2, `primary-container`, input grande `display-protein` en g) + cards de calorías (kcal), carbos (g), grasas (g) y fibras (g). Hint: "Copiá los valores de la etiqueta o de Google (ej. manzana: 1 unidad (182 g))". `sugars`/`sodium` → 0.
- Footer fijo: botón "Guardar" pill primario → valida nombre y cantidad, `productsRepository.save`, `router.push("/products")` y toast de éxito 3 s (estado local, sin librería).

### Proxy

- `protectedPaths = ["/dashboard", "/units", "/products", "/products/new"]` (o `pathname === "/products" || pathname.startsWith("/products/")`).
- Redirect autenticado en `/login`/`/register` → `new URL("/products", request.url)`.

### Service worker

- `PRECACHE_URLS` suma `"/products"` (para que el shell de productos exista offline en el primer arranque).
- `CACHE_VERSION` → `nutrilog-v2` (invalida el caché anterior al deployar).

### Docs

- `docs/architecture.md`: actualizar "Flujo de datos" y "Capa de datos" (products/categories/brands implementados), "Autenticación" (redirect a `/products`) y PWA (precache de `/products`).
- `docs/roadmap.md`: Epic 1 → "🚧 En progreso" con nota de crear+listar productos.
- `docs/database.md`: sin cambios (el esquema ya cubre todo lo usado, incluida la tabla brands).

---

## Tasks

1. `npx shadcn@latest add sheet`.
2. Mover `dashboard` y `units` a `src/app/(app)/`; crear `src/app/(app)/layout.tsx` (OfflineAuthGuard + AppShell).
3. Shell: `app-shell.tsx`, `bottom-nav.tsx`, `header.tsx`, `fab.tsx` (+ Sheet en el drawer).
4. `productsRepository` (+ `getListItems` con marca/unidad) + `categoriesRepository` (+ seeds) + `brandsRepository` (getOrCreate).
5. `src/lib/sync/sync.ts`: TABLES extendidas + iteración genérica de tablas.
6. `src/app/(app)/products/page.tsx` (búsqueda, chips, lista con proteína por porción, FAB, empty).
7. `src/app/(app)/products/new/page.tsx` (form, select de marca + "Nueva marca…", presets, bento, toast).
8. `src/proxy.ts`: rutas protegidas + redirect `/products`.
9. `public/sw.js`: precache `/products` + bump `CACHE_VERSION`.
10. Actualizar `docs/architecture.md` y `docs/roadmap.md`.
11. Verificar: `npm run build`, `npm run lint`, smoke tests (307 sin sesión en `/products` y `/products/new`, login → `/products`), flujo manual en el celu (crear producto offline → reconexión → fila en Supabase/PC).
