# SDD 03 — Capa de datos offline-first (Dexie + repositorios + sesión offline)

Estado: ✅ Aprobado

---

## Proposal

### Contexto

- SDD 02 aprobado y verificado en el celu: el shell PWA funciona, pero la app es server-centric — sin red no hay sesión ni datos (offline cae al login).
- Decisión de arquitectura confirmada: **offline-first**. `docs/architecture.md` (sección "Capa de datos"): la lógica de negocio vive en repositorios; la UI nunca accede directo a Dexie ni a Supabase.
- `docs/database.md` define las entidades, campos en snake_case, RLS por `user_id` (Epic 1) y last-write-wins con `updated_at`.
- Roadmap Epic 0: "Configurar Dexie" ⬜ pendiente.

### Objetivo

1. Instalar y configurar Dexie con el esquema de las entidades sincronizables.
2. Establecer el patrón de repositorios y probarlo con un caso vertical mínimo (**Units**) que recorra todo el flujo.
3. Persistir la sesión en el cliente para que el modo offline no saque al usuario al login.
4. Loop de sync por timestamps (push + pull) con last-write-wins: **local siempre, remoto cuando se pueda**.
5. Pantalla mínima de verificación (`/units`) para probar en el celu: alta offline → reconexión → la fila aparece en Supabase y en la PC.

### Fuera de alcance (posterior)

- Merge fino de conflictos, outbox con reintento/idempotencia, sync de fondo periódico, Realtime de Supabase → **Epic 5**.
- Vinculación multi-dispositivo → **Epic 6**.
- CRUD completo de productos/diario/plantillas (Epic 1+): acá solo Units como prueba de patrón.
- Push notifications.

### Opciones consideradas

| Opción | Descripción | Veredicto |
| --- | --- | --- |
| **A. Sync por timestamps (changes-since)** | Push/pull de filas con `updated_at > lastSyncedAt`, upserts idempotentes | ✅ **Elegida** — simple, alineada a `database.md` (last-write-wins); el outbox se evalúa en Epic 5 si hace falta |
| B. Outbox (cola de cambios) desde el arranque | Más robusta (orden, reintento por ítem) | ❌ Más maquinaria sin necesidad aún |
| C. Solo local, sin sync remoto | No agrega riesgo al SDD | ❌ No prueba la parte más riesgosa del diseño (el push/pull) |

Otras decisiones:

- **snake_case en local y remoto**: los campos locales usan la misma forma que Supabase/`database.md` (`user_id`, `updated_at`) → no hay capa de mapeo.
- **Sin librería de conectividad**: `navigator.onLine` + eventos `online`/`visibilitychange` son solo **disparadores**; la verdad es el intento de `fetch` en el loop de sync.
- **Sin outbox**: `lastSyncedAt` por entidad en la tabla `meta`. Si un request falla, no se avanza el timestamp y se reintenta en el próximo disparador.

---

## Spec

### Requisitos funcionales

- **RF1** Dexie `src/lib/db/database.ts`, esquema v1 con tablas: `units`, `categories`, `brands`, `products`, `templates`, `template_items`, `daily_logs`, `daily_log_items`, `meta`. Toda entidad sincronizable: `id` (UUID generado en la app), `user_id`, `created_at`, `updated_at`, `deleted_at`.
- **RF2** Repositorios: `unitsRepository` con `getAll` (excluye borrados), `save` (escribe local primero y agenda sync debounced) y `softDelete`. El patrón queda documentado para las demás entidades (Epic 1).
- **RF3** Seeds: si la tabla local de `units` está vacía, insertar los seeds de `docs/database.md`; el sync los sube.
- **RF4** Sesión offline: `src/lib/supabase/browser.ts` (`createBrowserClient`, persiste sesión en localStorage) + `OfflineAuthGuard` en rutas protegidas: offline y sin sesión local → `/login`; offline con sesión local → adelante. Online → flujo SSR existente intacto.
- **RF5** Sync: `sync()` hace push (unidades locales con `updated_at > lastSyncedAt` → upsert remoto) y pull (remoto con `updated_at >= lastSyncedAt` → upsert local, merge last-write-wins). Disparadores: carga de la app, evento `online`, tras cada escritura (debounced), `visibilitychange`.
- **RF6** Migración SQL `supabase/migrations/0001_initial.sql`: tablas MVP (`units`, `categories`, `brands`, `products`, `templates`, `template_items`, `daily_logs`, `daily_log_items`) con `user_id`, `created_at`/`updated_at`, `deleted_at` + **RLS por `user_id`**. El usuario la ejecuta en Supabase.
- **RF7** `/units` agregada a las rutas protegidas del proxy, con pantalla mínima (lista + alta) que usa `unitsRepository`.
- **RF8** `src/proxy.ts`: generalizar el guard de rutas protegidas (hoy solo `/dashboard`).

### Requisitos no funcionales

- La UI de guardado nunca espera a la red: escritura local inmediata, sync en background.
- TypeScript estricto, sin `any`.
- Verificación manual en el celu: alta offline → reconexión → la fila aparece en Supabase y en la PC.

---

## Design

### Paquetes

```
npm i dexie
```

### Estructura de archivos

```
src/
  lib/db/
    database.ts                        # Dexie + esquema v1
  lib/repositories/
    units.ts                           # unitsRepository (prueba del patrón)
  lib/sync/
    sync.ts                            # push + pull por timestamps
    use-sync-triggers.ts               # hook: arranque, online, visibilitychange
  lib/supabase/
    browser.ts                         # createBrowserClient (sesión en localStorage)
  components/auth/
    offline-auth-guard.tsx             # gate cliente para modo offline
  app/units/
    page.tsx                           # pantalla mínima de verificación
supabase/
  migrations/
    0001_initial.sql                   # tablas MVP + RLS
```

### Esquema Dexie (borrador)

```ts
db.version(1).stores({
  units: "id, user_id, updated_at",
  categories: "id, user_id, updated_at",
  brands: "id, user_id, updated_at",
  products: "id, user_id, updated_at",
  templates: "id, user_id, updated_at",
  template_items: "id, updated_at",
  daily_logs: "id, user_id, updated_at",
  daily_log_items: "id, updated_at",
  meta: "key",
});
```

### Sync (borrador)

- `lastSyncedAt` por entidad en `meta` (key: `units:lastSyncedAt`, etc.).
- Push: `units.where("updated_at").above(lastSyncedAt)` → `supabase.from("units").upsert(...)` (idempotente por `id`).
- Pull: `select(*) .gte("updated_at", lastSyncedAt)` → `db.units.bulkPut(...)`. Merge: si `incoming.updated_at > local.updated_at` gana el entrante (last-write-wins).
- Si cualquier request falla → no se avanza `lastSyncedAt`; se reintenta en el próximo disparador.
- Los borrados viajan como soft delete (`deleted_at`) y se filtran en las lecturas.

### Sesión offline

- supabase-js en modo browser persiste la sesión en localStorage automáticamente.
- `OfflineAuthGuard` (cliente) se monta en las rutas protegidas: si `navigator.onLine === false` y no hay sesión local → redirect `/login`. Online: no interviene (el proxy/SSR ya validó).
- Caveat documentado: offline no se valida la expiración del JWT (se puede sumar refresh/revalidación en Epic 5).

### Docs

- `docs/architecture.md`: actualizar "Capa de datos" con el estado implementado (Dexie, repositorios, sync por timestamps).
- `docs/roadmap.md`: "Configurar Dexie" → ✅.

---

## Tasks

1. `npm i dexie`.
2. `src/lib/db/database.ts` (esquema v1).
3. `src/lib/repositories/units.ts` (+ seeds de database.md).
4. `src/lib/sync/sync.ts` + `src/lib/sync/use-sync-triggers.ts`.
5. `src/lib/supabase/browser.ts` + `src/components/auth/offline-auth-guard.tsx`.
6. `src/app/units/page.tsx` (lista + alta) y `src/proxy.ts` (rutas protegidas generalizadas).
7. `supabase/migrations/0001_initial.sql` (tablas MVP + RLS) — ejecutar en Supabase.
8. Actualizar `docs/architecture.md` y `docs/roadmap.md`.
9. Verificar: `npm run build`, `npm run lint`, flujo manual en el celu (alta offline → reconexión → fila en Supabase/PC).
