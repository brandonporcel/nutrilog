# SDD 07 — Plantillas (crear, listar, editar, eliminar)

Estado: ✅ Aprobado

---

## Proposal

### Contexto

- El usuario reordenó prioridades: CRUD de categorías/marcas/unidades/indicadores se posterga. Ahora va el **Epic 4 — Plantillas**.
- Diseños de referencia de Stitch: `docs/stitch/templates/code.html` (listado), `docs/stitch/template-edit/code.html` (editor) y `docs/stitch/add-product/code.html` (selector de cantidad full-screen, pensado por Stitch para el registro diario).
- El esquema ya existe: `templates` (name) y `template_items` (template_id, product_id, quantity) en Dexie (SDD 03) y en `0001_initial.sql`. El sync NO los sincroniza todavía.
- El usuario describió el **flujo de aplicación de una plantilla** (Caso 4: tocar la plantilla → abrir "Nueva comida" con productos precargados, editar cantidades, agregar/quitar, guardar). Ese flujo es la pantalla de registro diario → **Epic 2** (fuera de alcance; se documenta para no perderlo).

### Objetivo

1. Listar plantillas (nombre, resumen de alimentos, proteína total) con FAB de creación.
2. Crear/editar plantilla: nombre + agregar productos con cantidad + editar/eliminar items + guardar.
3. Eliminar plantillas.
4. Sincronizar `templates` y `template_items`.

### Decisiones

- **Sacar la card decorativa** "Organize suas refeições frequentes para poupar tempo" del listado (pedido explícito del usuario: no suma). El empty state —solo cuando no hay plantillas— es texto simple + CTA, sin foto.
- **Chips de filtro (Refeições/Suplementos/Favoritos) fuera**: el esquema de `templates` solo tiene `name`; sin dato que los alimente serían decorativos. Agregar un campo `tags` sin uso real viola el principio del roadmap ("si aumenta complejidad sin beneficio claro, se posterga").
- **Selector de producto: Sheet (drawer) de dos pasos** — paso 1: búsqueda + lista de productos; paso 2: cantidad con stepper + chips ½/1/2/3 + personalizado + hero estimado (proteína/calorías). El draft de la plantilla vive en el estado local del editor → el drawer nunca pierde contexto y no hay estado global ni query params. La **pantalla full-screen con numpad de `add-product/code.html` se implementa en el Epic 2** (registro diario), donde el numpad full-screen tiene sentido; hoy sería un doble trabajo sin uso real (los templates se editan con pocos items).
- **Editar cantidad: tap en el item** → mismo paso 2 pre-cargado (la pantalla de cantidad es la misma, sea agregar o editar).
- **Eliminar item: `SwipeableRow`** (Editar/Eliminar), consistente con productos (el SDD 06 ya anotó "swipe en otras listas (templates)" como siguiente paso). El diseño Stitch muestra un delete directo; se prioriza la consistencia de la app y el patrón ya existente.
- **Tap en una plantilla del listado → navega a su edición por ahora.** Cuando llegue el Epic 2, el tap pasa a "aplicar al log" (Caso 4) y la edición se mueve a una acción secundaria.
- **Micro-hero del editor: proteína total + calorías, sin barra de progreso** — la meta diaria no existe aún; una barra sin referencia sería decorativa.
- **Avatar de plantilla: icono fijo** (`restaurant_menu`) — `templates` no tiene campo `icon`; el diseño usa iconos decorativos distintos por template. Cuando exista el CRUD de plantillas/categorías se puede agregar.
- **Guardado sin diffs**: `save`/`update` reciben el template con la lista **completa** de items y reemplazan (transacción Dexie). Simple, last-write-wins, coherente con el sync.
- **Eliminar plantilla → softDelete en cascada** de sus items (transacción, local; el sync propaga).

### Fuera de alcance (posterior)

- Aplicar plantilla al log diario (Caso 4 → Epic 2, documentado abajo).
- Pantalla full de cantidad con numpad (Epic 2).
- Categorías/tags/favoritos de plantillas, duplicar plantilla (Epic 4 completo).
- CRUD de categorías/marcas/unidades/indicadores (postergado por el usuario).

---

## Spec

- **RF1** `src/lib/repositories/templates.ts` (nuevo):
  - `getAll(userId)` → `TemplateSummary[]`: template + `item_count`, `protein_total` y `preview` (primeros 2–3 nombres de productos).
  - `getDetail(userId, id)` → `TemplateDetail`: template + items con producto resuelto (`product_name`, `category_icon`, `serving_amount`/`serving_unit_name`, `protein`/`calories` por cantidad y por item).
  - `save(userId, { name, items: { product_id, quantity }[] })` y `update(userId, id, { name, items })`: transacción Dexie que reemplaza los items (borra + inserta), `updated_at = now()`, agenda sync. `update` devuelve `null` si el template no existe o pertenece a otro usuario.
  - `softDelete(userId, id)`: softDelete del template + de sus items en transacción, agenda sync.
- **RF2** `/templates` (listado): cards tipo `templates/code.html` — avatar circular con icono fijo, nombre, preview truncado de alimentos, proteína total (`≈ Xg`). FAB "+" → `/templates/new`. Empty state simple (texto + botón "Crear plantilla"). Estados loading/error. El tap → `/templates/[id]/edit`.
- **RF3** `/templates/new` y `/templates/[id]/edit` (pantallas de tarea, sin bottom nav): comparten `TemplateForm`.
- **RF4** `src/components/templates/template-form.tsx` (nuevo): header (back, título "Nueva plantilla"/"Editar plantilla", botón Cancelar), input de nombre (label "NOMBRE DEL TEMPLATE"), micro-hero (proteína total destacada + calorías), lista de items con `SwipeableRow` (Editar/Eliminar; cada fila: avatar con `CategoryIcon` del producto, nombre, "cantidad + unidad · Xg prot"), botón "+ Agregar alimento" (borde punteado) → abre `AddItemSheet`. Botón "Guardar plantilla" fijo abajo (pill primario). Validación: nombre requerido; si no hay items, se permite guardar (plantilla vacía válida) — se muestra aviso si quiere.
- **RF5** `src/components/templates/add-item-sheet.tsx` (nuevo): `Sheet` (shadcn base-ui, ya instalado) con dos pasos internos:
  - Paso 1: búsqueda de productos (nombre/marca, mismo patrón que `products/page.tsx`) + lista densa (icono + nombre + proteína por porción). Tap → paso 2.
  - Paso 2: hero estimado (proteína/calorías para la cantidad elegida), stepper − / cantidad / +, chips ½/1/2/3, opción "Personalizado" (input numérico), botón "Agregar" (o "Actualizar" al editar un item existente). Tap en el item de la lista del editor abre este paso 2 pre-cargado.
- **RF6** Guardar: `save`/`update` → toast "Plantilla creada/actualizada" → back a `/templates`. Eliminar (desde el listado, vía `SwipeableRow` del SDD 06) → AlertDialog → `softDelete` → toast → fila fuera.
- **RF7** Sync: `TABLES` en `src/lib/sync/sync.ts` += `templates` y `template_items` (orden: `units → categories → brands → products → templates → template_items`; template_items depende de templates y products).
- **RF8** `app-shell.getScreen`: `/templates/new` → "Nueva plantilla" (back `/templates`); `/templates/[id]/edit` → "Editar plantilla" (back `/templates`). Regex antes del matcheo exacto.

### No funcionales

- TS estricto; **cero dependencias nuevas** (Sheet/SwipeableRow/AlertDialog/toasts ya existen).
- Accesibilidad: filas y botones reales `<button>`; Sheet con focus trap de base-ui.
- El draft del editor se pierde si se navega fuera (sin estado global ni persistencia) — comportamiento esperado, coherente con el editor de productos.

---

## Design

### Archivos

```
src/
  lib/repositories/templates.ts          # templatesRepository (nuevo)
  lib/sync/sync.ts                      # TABLES += templates, template_items
  components/templates/template-form.tsx # editor compartido crear/editar (nuevo)
  components/templates/add-item-sheet.tsx# Sheet 2 pasos: buscar → cantidad (nuevo)
  components/shell/app-shell.tsx        # getScreen para rutas de templates
  app/(app)/templates/page.tsx          # listado (reescritura)
  app/(app)/templates/new/page.tsx      # crear (nuevo)
  app/(app)/templates/[id]/edit/page.tsx # editar (nuevo)
docs/
  architecture.md                       # + repositorio, sync, flujo
  roadmap.md                            # Epic 4: estado en progreso
  sdd/07-templates.md                   # este documento
```

### templatesRepository (borrador)

```ts
type TemplateItemInput = { product_id: string; quantity: number };

async save(userId, { name, items }: { name: string; items: TemplateItemInput[] }) {
  // template id uuid, timestamps; bulkAdd items; scheduleSync()
}

async update(userId, id, { name, items }) {
  // transacción: actualiza template, bulkDelete items viejos, bulkAdd nuevos
}

async softDelete(userId, id) {
  // transacción: softDelete template + softDelete items; scheduleSync()
}
```

### AddItemSheet (flujo)

```
Sheet abierto
  → [Paso 1] búsqueda + lista de productos (tap selecciona)
  → [Paso 2] hero estimado + stepper + chips ½/1/2/3 + personalizado
  → "Agregar" / "Actualizar" → onItemChange(item) → cierra
```

### Tasks

1. `templatesRepository` (getAll/getDetail/save/update/softDelete) + sync `TABLES`.
2. `AddItemSheet` (paso 1 búsqueda + paso 2 cantidad).
3. `TemplateForm` + `/templates/new` + `/templates/[id]/edit`.
4. Listado `/templates` (cards + FAB + empty state + eliminar con AlertDialog).
5. `app-shell.getScreen` para las rutas nuevas.
6. Docs: `architecture.md`, `roadmap.md`.
7. Verificar: `npm run build`, `npm run lint`, smoke (307 sin sesión en `/templates/*`; crear plantilla → aparece en listado → editar cantidad → guardar → totales correctos; eliminar → confirmación → fuera; sync sube templates + template_items).

---

## Anexo — Caso 4: aplicar plantilla al log (Epic 2, referencia)

El usuario definió el flujo futuro (para no perderlo):

- Tocar una plantilla NO guarda nada automáticamente: abre **"Nueva comida"** con los productos precargados (icono, nombre, cantidad, proteínas, calorías, editar, eliminar).
- Desde allí: editar cantidades, eliminar, agregar o reemplazar productos — todo antes de guardar la comida.
- Pantalla "Nueva comida": header (Cancelar / título), card de resumen (meta diaria, proteína consumida, proteína que aportará la comida), listado de alimentos, "+ Añadir alimento" (vuelve a la misma comida, nunca pierde contexto), resumen final (proteína total, calorías totales), botón "Guardar comida".
- Implicación de diseño: el listado de templates hoy navega al editor; en el Epic 2 el tap pasará a abrir "Nueva comida" con el template precargado.
