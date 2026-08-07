# Database

## Objetivo

El modelo de datos de NutriLog está diseñado para ser simple, flexible y fácil de extender.

El objetivo es soportar el MVP sin limitar futuras funcionalidades como:

- calorías
- macronutrientes completos
- recetas
- código de barras
- IA
- estadísticas
- seguimiento corporal

---

# Principios

- UUID como clave primaria.
- Sin enums en la base de datos.
- Catálogos mediante tablas.
- UUID generados desde la aplicación.
- Todas las fechas almacenadas en UTC.
- Todas las entidades poseen created_at y updated_at.
- Soft Delete únicamente en entidades sincronizables.
- Sincronización: last-write-wins basada en updated_at (Epic 5).

---

# Autenticación

La autenticación es gestionada por Supabase Auth.

Todas las entidades pertenecen a un usuario mediante user_id.

No existe un sistema propio de autenticación.

Todas las tablas aplican RLS con políticas por user_id (implementadas en la migración inicial).

---

# Entidades

## Categories

Agrupa productos similares.

Ejemplos:

- Huevos
- Carnes
- Lácteos
- Frutas
- Verduras
- Panificados
- Cereales
- Legumbres
- Bebidas
- Suplementos
- Snacks
- Otros

Las categorías son administradas por el usuario.

Cada categoría tiene un `icon` (nombre del ícono de lucide) que viaja con el sync; la UI lo renderiza como avatar del producto (fallback: `package`). Productos sin categoría muestran `UtensilsCrossed`.

---

## Brands

Representa la marca comercial de un producto.

Ejemplos:

- Bimbo
- Fargo
- La Serenísima
- Ilolay
- Star Nutrition

Puede ser NULL cuando el alimento no posee marca.

Ejemplos:

- Banana
- Tomate
- Pollo
- Arroz

---

## Units

Representa la unidad utilizada para registrar la porción nutricional.

Ejemplos:

- Unit
- Gram
- Milliliter
- Slice
- Scoop
- Tablespoon
- Teaspoon
- Cup
- Glass
- Can
- Pack

Las unidades son tablas para evitar enums y facilitar futuras ampliaciones.

---

## Products

Representa un alimento.

Cada producto posee una única información nutricional.

Campos principales:

- user_id
- name
- brand_id
- category_id
- serving_amount
- serving_unit_id
- serving_weight_grams
- protein
- carbs
- fat
- fiber
- calories
- sugars
- sodium

### serving_amount

Cantidad utilizada por la etiqueta nutricional.

Ejemplos:

- 1
- 2
- 100
- 200

### serving_unit_id

Unidad correspondiente a serving_amount.

Ejemplos:

- Unit
- Gram
- Milliliter
- Slice
- Scoop
- Tablespoon
- Teaspoon

### serving_weight_grams

Peso real de la porción expresado en gramos.

Ejemplos:

- 1 huevo = 60 g
- 2 slices = 50 g
- 1 scoop = 35 g

Este campo permitirá realizar conversiones automáticas entre unidades y gramos en futuras versiones.

---

# Templates

Representa una comida frecuente.

Ejemplos:

- Mi desayuno
- Almuerzo habitual
- Cena post entrenamiento

Una plantilla no representa un consumo real.

Únicamente sirve para agilizar el registro diario.

---

# Template Items

Relaciona productos con una plantilla.

Ejemplo:

Mi desayuno

- 3 huevos
- 2 rebanadas de pan integral
- 15 g de mantequilla de maní

---

# Daily Logs

Representa un día de consumo.

Existe un único registro por día y por usuario.

Constraint único: (user_id, date).

`date` es la fecha **local del usuario** (YYYY-MM-DD, calculada en el navegador): el límite del día es del usuario, no UTC. `created_at`/`updated_at` siguen siendo UTC.

Ejemplo:

2026-08-01

---

# Daily Log Items

Representa un alimento realmente consumido.

Cada registro almacena:

- producto
- cantidad consumida
- snapshot nutricional

`meal_id` (uuid, nullable) agrupa los items de una misma comida: todos los items guardados juntos comparten el mismo id. La comida en sí no tiene tabla propia ni nombre persistido — el nombre (Desayuno/Almuerzo/Merienda/Cena) se deriva de la hora local del primer item (SDD 08).

Cambiar la fecha/hora de una comida (desde el detalle en `/meals/[id]`) re-apunta sus items al `daily_logs` del día destino (creado si no existe) y actualiza su `created_at` al nuevo timestamp local; el `meal_id` nunca cambia. Un log del que se movieron todas las comidas puede quedar vacío (inofensivo: la UI solo lista días con items).

Los snapshots solo existen en Daily Log Items.

Los Template Items no los usan: las plantillas deben reflejar el producto actual.

---

# Snapshots

Al registrar un alimento también se almacenan los valores nutricionales calculados.

Ejemplo:

Hoy:

Pan Integral Bimbo

7.7 g proteína

Mañana el producto cambia a:

8.1 g proteína

El historial de ayer debe mantenerse exactamente igual.

Por este motivo Daily Log Items almacena snapshots de los valores nutricionales.

---

# Relaciones

User

↓

Products

↓

Category

↓

Brand

↓

Unit

User

↓

Templates

↓

Template Items

↓

Products

User

↓

Daily Logs

↓

Daily Log Items

↓

Products

---

# Seeds iniciales

Los seeds se insertan POR USUARIO desde la aplicación (no en la migración SQL): la primera vez que se abre la app, `ensureUserCatalog` (`src/lib/seeder.ts`) crea categorías y unidades si faltan y luego los productos (marcas incluidas, vía `getOrCreateByName`); el sync los sube a Supabase. Los productos se matchean por nombre contra todas las filas (soft-deletes incluidos): un producto que el usuario borró no vuelve a aparecer. Además, si el usuario todavía no tiene plantillas, se siembra una de arranque — **Desayuno** (3 huevos + 1 manzana) — solo con productos existentes (lo borrado se omite).

## Categories

- Huevos (`egg`)
- Carnes (`drumstick`)
- Lácteos (`milk`)
- Frutas (`apple`)
- Verduras (`carrot`)
- Panificados (`croissant`)
- Cereales (`wheat`)
- Legumbres (`bean`)
- Bebidas (`cup-soda`)
- Suplementos (`pill`)
- Snacks (`candy`)
- Otros (`package`)

---

## Units

- Unit
- Gram
- Milliliter
- Slice
- Scoop
- Tablespoon
- Teaspoon
- Cup
- Glass
- Can
- Pack

> Cup/Glass/Can/Pack se agregaron en el rework del formulario de producto (SDD 09). Los usuarios que ya tenían unidades las reciben vía backfill en `unitsRepository.ensureSeeds` (match por nombre; las unidades propias nunca se tocan). `save` es getOrCreate por nombre (case-insensitive): las unidades son únicas por usuario y nombre, y `ensureSeeds` además **deduplica** filas legadas duplicadas (fusiona en la primera no borrada y re-apunta los productos que referenciaban las borradas) y descarta valores de prueba ("test", "prueba", …).

---

## Brands

- Bimbo
- Star Nutrition

---

## Productos

- Huevo entero
- Banana
- Manzana
- Arroz blanco cocido
- Avena
- Pan integral (Bimbo)
- Pechuga de pollo
- Atún en lata
- Shake de proteína (Star Nutrition)
- Leche descremada
- Papa

---

# Futuras ampliaciones

El modelo está preparado para incorporar:

- recetas
- código de barras
- OpenFoodFacts
- OCR
- IA
- calorías
- micronutrientes
- seguimiento de peso
- medidas corporales
- fotografías de progreso
- estadísticas
