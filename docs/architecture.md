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

Estado: implementado para el catálogo Units (SDD 03); las demás entidades siguen el mismo flujo desde el Epic 1.

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

Implementado (SDD 03):

- `src/lib/db/database.ts`: esquema Dexie v1 con todas las entidades sincronizables (snake_case, mismas que el esquema remoto → sin capa de mapeo).
- `src/lib/repositories/units.ts`: patrón de repositorio (`getAll`/`save`/`softDelete` + seeds); el Epic 1 extiende el patrón al resto de las entidades.
- `src/lib/sync/sync.ts`: sync por timestamps (changes-since) — push de filas con `updated_at > lastSyncedAt` y pull con merge last-write-wins; `meta` guarda `lastSyncedAt` por entidad.
- Disparadores de sync: carga de la app, evento `online`, retorno a la app y tras escrituras (debounced) — `src/lib/sync/`.
- Sesión offline: `createBrowserClient` persiste la sesión en localStorage; `OfflineAuthGuard` respalda las rutas protegidas sin conexión.
- Esquema remoto: `supabase/migrations/0001_initial.sql` (tablas MVP + RLS por `user_id`).

---

# Autenticación

La autenticación es gestionada por Supabase Auth (email + contraseña).

- La sesión se almacena en cookies mediante `@supabase/ssr`.
- Las mutaciones de autenticación (`signIn`, `signUp`, `signOut`) son Server Actions que usan el cliente de servidor (`src/lib/supabase/server.ts`).
- `src/proxy.ts` (convención `proxy` de Next.js 16, reemplaza a `middleware.ts`) refresca la sesión en cada request y aplica los guardias de ruta:
  - Usuario autenticado en `/login` o `/register` → redirect a `/dashboard`.
  - Usuario no autenticado en rutas protegidas (ej. `/dashboard`) → redirect a `/login`.
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
  - precachea el shell en `install` (`/`, `/login`, `/register`, `/dashboard`, manifest e íconos);
  - navegaciones: network-first con fallback a caché;
  - estáticos (`/_next/static`, íconos, manifest): cache-first;
  - `CACHE_VERSION` versiona el caché: subirla en cada deploy invalida la versión anterior.
- El registro del SW ocurre solo en producción (`src/components/pwa/service-worker-register.tsx`), para no cachear assets de desarrollo.
- `src/proxy.ts` excluye `/sw.js` y `/manifest.webmanifest` del matcher.
- El offline de datos (Dexie/IndexedDB, cola de sincronización) es el **Epic 5** y todavía no existe.

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
