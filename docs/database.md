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
- Sincronización inicial: last-write-wins basada en updated_at (Epic 5).

---

# Autenticación

La autenticación es gestionada por Supabase Auth.

Todas las entidades pertenecen a un usuario mediante user_id.

No existe un sistema propio de autenticación.

Todas las tablas aplican RLS con políticas por user_id (se implementa junto con el Epic 1).

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

Ejemplo:

2026-08-01

---

# Daily Log Items

Representa un alimento realmente consumido.

Cada registro almacena:

- producto
- cantidad consumida
- snapshot nutricional

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

---

## Productos

- Huevo entero
- Clara
- Yema
- Arroz cocido
- Arroz crudo
- Papa
- Batata
- Banana
- Avena
- Pollo
- Atún
- Leche
- Pan Integral Bimbo
- Pan Integral Fargo

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
