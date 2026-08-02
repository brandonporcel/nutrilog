# Architecture

## Objetivo

NutriLog sigue una arquitectura simple, escalable y orientada a funcionalidades.

La prioridad del proyecto es mantener una base de código fácil de entender, mantener y extender.

Antes de incorporar nuevas capas, patrones o librerías se evaluará si realmente aportan valor.

---

# Principios

## Offline First

Toda modificación se realiza primero en la base de datos local.

La sincronización con Supabase ocurre posteriormente y nunca debe bloquear la interacción del usuario.

La aplicación debe funcionar correctamente incluso sin conexión a Internet.

---

## Componentes pequeños

Los componentes deben tener una única responsabilidad.

Cuando un componente comienza a crecer demasiado deberá dividirse.

---

## Lógica fuera de la UI

La interfaz únicamente representa información.

La lógica de negocio no debe vivir dentro del JSX.

---

## TypeScript

El proyecto utiliza TypeScript estricto.

Evitar:

- any
- type assertions innecesarias
- código que desactive el sistema de tipos

---

# Stack

Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Persistencia local

- IndexedDB
- Dexie

Backend

- Supabase
- PostgreSQL
- Supabase Auth

---

# Flujo de datos

Estado: implementado para los catálogos Units, Products, Categories y Brands (SDD 03 + SDD 04); las demás entidades siguen el mismo flujo desde su Epic.

Usuario

↓

UI

↓

Repositorios (capa de datos)

↓

Persistencia local (IndexedDB + Dexie)

↓

Sincronización (Epic 5)

↓

Supabase

La aplicación nunca debería depender de la conexión para registrar información.

---

# Capa de datos

La lógica de negocio vive en una capa de repositorios entre la UI y el almacenamiento (decisión: offline-first).

- La UI **nunca** accede directamente a IndexedDB/Dexie ni a Supabase.
- Los repositorios escriben primero en la base local (Dexie) y encolan la sincronización (Epic 5).
- La sincronización nunca bloquea la interacción del usuario.
- Esto evita duplicar lógica de negocio entre cliente y servidor: se escribe una sola vez, contra la capa local.

Implementado (SDD 03 a SDD 06):

- `src/lib/db/database.ts`: esquema Dexie v1 con todas las entidades sincronizables (snake_case, mismas que el esquema remoto → sin capa de mapeo).
- Repositorios: `src/lib/repositories/units.ts` (patrón base), `products.ts` (`getListItems`/`getDetail` resuelven marca, categoría (incluye su `icon`) y unidad; `save`/`update`/`softDelete`), `categories.ts` (+ seeds con `icon`) y `brands.ts` (`getOrCreateByName`); el Epic 1 extiende el patrón al resto de las entidades.
- Avatar del producto: el ícono es **dato de la categoría** (`categories.icon`, nombre de lucide) que viaja con el sync y se renderiza con `src/lib/icons/category-icon.tsx` (`CategoryIcon`, fallback `package`; sin categoría → `UtensilsCrossed`).
- `src/lib/sync/sync.ts`: sync por timestamps (changes-since) — push de filas con `updated_at > lastSyncedAt` y pull con merge last-write-wins; `meta` guarda `lastSyncedAt` por entidad. Hoy sincroniza `units`, `categories`, `brands` y `products` **en ese orden** (dependencias FK: los productos referencian marcas, categorías y unidades, así el push nunca viola foreign keys en la primera pasada). **Auto-reparación**: si un push falla con violación de foreign key (la remota perdió filas, p.ej. un dev reset borró tablas mientras el watermark local sobrevivió — el sync changes-since nunca vuelve a subir filas viejas), se limpian todos los watermarks y corre una segunda pasada que re-subió todo (idempotente). Los errores de push/pull se loguean con `console.error` — un sync silencioso es un sync roto.
- Disparadores de sync: carga de la app, evento `online`, retorno a la app, tras escrituras (debounced) y **retry periódico cada 60 s** (solo con la pestaña visible y online) para converger sin acción del usuario — `src/lib/sync/`.
- Estado de sync visible: `src/lib/sync/sync-status.ts` (pub-sub) alimenta el chip del header (`SyncStatusIndicator`: sincronizando / sin conexión / error) y un toast de error solo cuando el sync falla estando online (`toast-store` + `ToastHost`, sin librería).
- Formulario compartido: `src/components/products/product-form.tsx` usado por creación (`/products/new`) y edición (`/products/[id]/edit`).
- Swipe actions: `src/components/products/swipeable-row.tsx` (react-swipeable ~6 KB) — **touch**: swipe revela Editar/Eliminar; **desktop (hover)**: acciones en hover, sin swipe. Eliminar confirma con AlertDialog y hace `softDelete`. El detalle (`/products/[id]`) tiene botones Editar/Eliminar en un footer fijo. Patrón compartido para futuros listados.
- Sesión offline: `createBrowserClient` persiste la sesión en localStorage; `OfflineAuthGuard` respalda las rutas protegidas sin conexión.
- Esquema remoto: `supabase/migrations/0001_initial.sql` (tablas MVP + RLS por `user_id`, **idempotente** y con **GRANTs a `anon`/`authenticated`** — sin los grants, PostgREST devuelve "permission denied for table" aunque la RLS exista; el RLS igual mantiene cada fila scoped a su dueño) + `supabase/migrations/dev_reset.sql` (SOLO desarrollo: dropea todas las tablas).

---

# Autenticación

La autenticación es gestionada por Supabase Auth (email + contraseña).

- La sesión se almacena en cookies mediante `@supabase/ssr`.
- Las mutaciones de autenticación (`signIn`, `signUp`, `signOut`) son Server Actions que usan el cliente de servidor (`src/lib/supabase/server.ts`).
- `src/proxy.ts` (convención `proxy` de Next.js 16, reemplaza a `middleware.ts`) refresca la sesión en cada request y aplica los guardias de ruta:
  - Usuario autenticado en `/login` o `/register` → redirect a `/products`.
  - Usuario no autenticado en rutas protegidas (dashboard, units, history, templates, products) → redirect a `/login`.
- Las rutas protegidas verifican el usuario nuevamente en el Server Component como defensa adicional.

Sesión offline (pendiente, Epic 5):

- Para el modo offline la sesión también se persiste en el cliente (localStorage) y las rutas protegidas verifican el usuario en el cliente como respaldo.
- Mientras tanto, la validación de sesión es únicamente SSR.

---

# Sincronización

Objetivo (Epic 5):

- Cola de cambios (outbox) con reintento e idempotencia.
- Detección de cambios mediante `updated_at`.
- Resolución de conflictos inicial: last-write-wins.
- Borrado mediante `deleted_at` (ver Convenciones).

---

# PWA

NutriLog es una PWA instalable (manifest + service worker manual, sin integración de build).

- El manifest se genera con `src/app/manifest.ts` (convención de Next.js): nombre, descripción, `start_url`, `display: standalone` e íconos PNG 192/512 (`any` y `maskable`).
- Los íconos viven en `public/icons/` y se generan con `scripts/generate-icons.mjs` (sharp sobre un SVG; comando `node scripts/generate-icons.mjs`).
- El service worker (`public/sw.js`) es manual:
  - precachea el shell en `install` (`/`, `/login`, `/register`, `/dashboard`, `/products`, manifest e íconos);
  - navegaciones: network-first con fallback a caché;
  - estáticos (`/_next/static`, íconos, manifest): cache-first;
  - `CACHE_VERSION` versiona el caché: subirla en cada deploy invalida la versión anterior.
- El registro del SW ocurre solo en producción (`src/components/pwa/service-worker-register.tsx`), para no cachear assets de desarrollo.
- `src/proxy.ts` excluye `/sw.js` y `/manifest.webmanifest` del matcher.
- El offline de datos (Dexie/IndexedDB, cola de sincronización) es el **Epic 5** y todavía no existe.

# Navegación (SDD 04)

Las pantallas autenticadas viven en el route group `src/app/(app)/` (no cambia las URLs) y heredan el shell desde su layout:

- `AppShell` (`src/components/shell/`): header fijo (hamburguesa o back arrow en pantallas de tarea), bottom nav con 4 tabs (Inicio, Histórico, Modelos, Productos) y FAB contextual configurado por ruta.
- El drawer del hamburguesa usa shadcn **Sheet** (Base UI Dialog) y agrupa lo que no entra en la bottom nav: Perfil (pendiente), Unidades (temporal) y Cerrar sesión.
- La pantalla de Productos (`/products`) muestra la proteína **por porción** tal como figura en la etiqueta (ej. "7,7 g · por 2 rebanadas (59 g)"), sin conversión a 100 g.

---

# Convenciones

## Soft Delete

Las entidades sincronizables utilizan deleted_at.

---

# Diseño

La interfaz prioriza:

- rapidez
- simplicidad
- pocos toques
- buena legibilidad

---
