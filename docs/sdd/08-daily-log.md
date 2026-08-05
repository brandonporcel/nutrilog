# SDD 08 — Registro diario: Home + Nueva comida

## Estado

✅ Aprobado

## Contexto

La app permite cargar productos y armar plantillas, pero no hay forma de registrar lo que se come. Este SDD entrega el flujo central de la app (Epic 2):

```
Home
  ↓ (+)
Nueva comida
  ↓ (buscar alimento o plantilla)
Agregar productos (cantidad por unidades o gramos)
  ↓ (editar / eliminar items del carrito)
Guardar comida
  ↓
Home (lista las comidas del día)
```

El modelo ya tiene `daily_logs` (un registro por día y usuario) y `daily_log_items` (producto + cantidad + **snapshot nutricional**: el historial no cambia aunque el producto cambie). Diseño de referencia: `docs/stitch/home/code.html`.

## Alcance

- **Home** (`/dashboard`, reescribir el stub): card de proteína diaria con meta **hardcodeada en 150 g** (`DAILY_PROTEIN_GOAL_GRAMS` en `src/lib/daily-goal.ts`, lista para reemplazar por settings en el futuro), cards "Media semanal" (promedio de los últimos 7 días + delta vs la semana previa) y "Meta restante", y el listado de **las comidas de hoy** (nombre, preview de alimentos, proteína).
- **Nueva comida** (`/meals/new`): pantalla carrito con card de resumen (meta / consumido / aporte de esta comida), listado de items con editar y eliminar, "+ Añadir alimento" (selector con tabs **Frecuentes** por default, **Alimentos** y **Plantillas**), totales al pie y botón "Guardar comida".
- Persistencia local-first + sync de `daily_logs` y `daily_log_items`.

### Fuera de alcance (SDDs futuros)

- Histórico (`/history` queda como está), editar/eliminar comidas ya guardadas, meta configurable, nombres de comida editables, grupos de días anteriores en Home, aplicar plantilla tocando directo en la lista de plantillas (el acceso es desde Nueva comida).

## Decisiones

### D1. Agrupación de comidas: `meal_id` en `daily_log_items` (sin tabla nueva)

Una "comida" es un conjunto de items del mismo día que comparten `meal_id` (uuid generado al guardar). No se crea tabla `daily_log_meals`: el agrupamiento es un atributo del item, la tabla intermedia no aporta nada hoy y el sync queda más simple. `daily_logs` sigue siendo el ancla del día (uno por `(user_id, date)`).

### D2. Nombre de comida derivado por franja horaria (no se persiste)

`meal_name` NO se guarda: se deriva al leer del `created_at` del primer item, convertido a **hora local del navegador**:

- < 11 h → Desayuno (`Coffee`)
- 11–15 h → Almuerzo (`UtensilsCrossed`)
- 15–19 h → Merienda (`Cookie`)
- ≥ 19 h → Cena (`CookingPot`)

El nombre es estable (created_at no cambia) y el día corre en la zona horaria del usuario. Los íconos son los avatares de cada comida en el listado (patrón `CategoryIcon`, avatares lucide).

### D3. `date` = fecha LOCAL del usuario

El principio del proyecto es "fechas en UTC", pero el **límite del día** es local: `daily_logs.date` (YYYY-MM-DD) se calcula con `new Date().getFullYear/Month/Date()` en el navegador (helper `todayLocal()`), no con `toISOString()` (que cortaría a UTC). `created_at` sigue siendo UTC. Se documenta en `docs/database.md`.

### D4. Guardar = upsert del log + insert de items con snapshot

`saveMeal(userId, items)`:
1. Busca/crea el `daily_log` de hoy (upsert `(user_id, date)`; al actualizar se bumpa `updated_at` para el sync).
2. Inserta un `daily_log_item` por item con el mismo `meal_id`, `quantity` y **snapshot calculado en ese momento** (protein/carbs/fat/fiber/calories/sugars/sodium = macros del producto × quantity, redondeados como en templates).
3. `scheduleSync()`.

### D5. Plantillas en Nueva comida: tab en el AddItemSheet

El "Buscar alimento o plantilla" del flujo se resuelve con **dos tabs en el sheet existente** (`Alimentos` / `Plantillas`). Elegir una plantilla agrega TODOS sus items al draft de una vez (producto + cantidad de la plantilla) y cierra el sheet. Las plantillas no son comidas cerradas: son punto de partida (el usuario sigue editando el carrito). Sin dedupe: agregar la misma plantilla dos veces duplica items (es un carrito; simple y predecible).

### D6. Home: solo hoy + media semanal

El listado muestra únicamente las comidas de hoy (el histórico tiene su propia pestaña). La card "Media semanal" se incluye porque es una agregación barata sobre el modelo actual: promedio de proteína de los últimos 7 días (ventana móvil), calculado **solo sobre días con registros** (un día vacío no arrastra el promedio a cero), con el % de cambio vs la ventana previa (sin baseline → sin delta). "Meta restante" deriva de la misma constante.

### D7. Frecuentes: derivado del consumo real, sin tabla nueva

El selector de "Nueva comida" abre en la tab **Frecuentes** (default): los productos más usados salen de contar `daily_log_items` (empate → más reciente), top 10. Si no hay frecuentes todavía, el selector cae a la tab Alimentos. No hay tabla de "frecuentes": es una proyección del log, como la media semanal.

## Modelo de datos

```sql
-- idempotente, mismo patrón que categories.icon
alter table public.daily_log_items add column if not exists meal_id uuid;
```

Índices Dexie v3 (las tablas ya existen en v2):

```ts
db.version(3).stores({
  daily_logs: "id, user_id, date, updated_at, [id+user_id]",
  daily_log_items:
    "id, user_id, updated_at, daily_log_id, meal_id, [user_id+created_at]",
});
```

## UI

### Home (`src/app/(app)/dashboard/page.tsx`, client component)

- **Hero card**: label "PROTEÍNA DIARIA", consumido (display grande) `/ 150g`, % a la derecha, barra de progreso (patrón del diseño).
- **Card "META RESTANTE"**: 150 − consumido (clamp ≥ 0).
- **Listado "Hoy"**: cada comida = avatar (ícono por franja, `bg-secondary-container`), nombre derivado, preview (primeros 3 alimentos), proteína a la derecha (mismo layout que templates/products).
- **Empty state** (sin comidas hoy): mensaje + CTA al `+`.
- **FAB** "+" → `/meals/new` (vía `app-shell`).

### Nueva comida (`src/app/(app)/meals/new/page.tsx`)

Reusa el patrón de `TemplateForm` sin nombre:

- **Card de resumen** arriba: meta diaria, proteína consumida hoy (sin esta comida) y aporte de esta comida.
- **Draft items** con `SwipeableRow`: tap → editar cantidad (sheet precargado), trash → quitar del draft.
- **"+ Añadir alimento"** (borde punteado, como templates) → `AddItemSheet` con tabs Alimentos/Plantillas.
- **Totales** al pie (proteína + calorías) y botón "Guardar comida" → `saveMeal` → toast → back a Home.

### AddItemSheet (refactor)

Tres tabs: **Frecuentes** (default; top 10 por consumo real), **Alimentos** (búsqueda actual) y **Plantillas** (lista de `TemplateSummary`, sin búsqueda en esta iteración; tap → `onTemplatePick(template)`). La tab Plantillas solo aparece cuando el editor la usa (MealForm); TemplateForm mantiene Frecuentes + Alimentos.

## Sync y navegación

- `TABLES` += `daily_logs`, `daily_log_items` (orden FK: después de `template_items`; `daily_log_items` referencia logs y products). Se actualiza el comentario de cabecera.
- `proxy.ts`: proteger `/meals/*` (`pathname.startsWith("/meals/")`).
- `app-shell`: `SCREENS["/dashboard"]` gana `fab: "/meals/new"`; `SCREENS["/meals/new"]` = { title: "Nueva comida", back: "/dashboard" }.

## Repositorio

`src/lib/repositories/daily-log.ts` (patrón templates.ts):

- `getToday(userId)` → `{ meals: Meal[], protein_total, calories_total, meal_count }`; `Meal = { meal_id, name, icon, items: MealItem[] }` con producto resuelto (nombre, icono de categoría, unit label) y totales.
- `saveMeal(userId, items: TemplateItemInput[])` → upsert log + items con snapshot + `scheduleSync()`.
- `DAILY_PROTEIN_GOAL_GRAMS = 150` exportado desde `src/lib/daily-goal.ts`.

## Docs

- `docs/database.md`: sección Daily Log Items + nota de `meal_id` y `date` local.
- `docs/architecture.md`: repositorio + sync + flujo.
- `docs/roadmap.md`: Epic 2 en progreso.
- El anexo "Caso 4" de `docs/sdd/07-templates.md` se actualiza: aplicar plantilla vive dentro de Nueva comida (tab Plantillas), no como entrada separada.

## Verificación

- `npx tsc --noEmit`, `npx eslint .`, `npm run build`.
- Smoke: rutas sin sesión → 307; flujo completo en navegador (agregar producto por unidades y por gramos, editar cantidad, eliminar, agregar plantilla, guardar → aparece en Home con totales correctos).
- Verificar índices Dexie (lección del SDD 07: query multi-key sin índice = SchemaError en runtime).

## Riesgos

- **Índices Dexie**: mitigado con la lección del SDD 07 (chequear cada query del repositorio contra el schema y probar en navegador).
- `date` local vs UTC: si un usuario guarda cerca de medianoche, el día local manda; el histórico futuro debe agrupar por `date`, no por `created_at`.
