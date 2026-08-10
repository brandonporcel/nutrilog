# Roadmap

## Objetivo

El desarrollo de NutriLog se divide en pequeñas etapas funcionales.

Cada versión debe aportar valor real al usuario y dejar la aplicación en un estado utilizable.

Se prioriza terminar funcionalidades completas antes de comenzar nuevas.

---

# MVP

Objetivo

Contar proteínas de forma rápida y sencilla.

El usuario debe poder:

- crear productos
- registrar alimentos consumidos
- consultar proteínas del día
- utilizar la aplicación sin conexión

---

## Epic 0 - Fundación

Estado

✅ Completado (pendiente: Configurar Dexie)

Objetivos

- Configurar Next.js ✅
- Configurar TypeScript ✅
- Configurar Tailwind CSS ✅
- Configurar PWA ✅
- Configurar shadcn/ui ✅
- Configurar autenticación (Supabase Auth) ✅
- Configurar Dexie ✅
- Definir arquitectura ✅
- Diseñar base de datos ✅
- Documentar el proyecto ✅

---

## Epic 1 - Productos

Estado

🚧 En progreso (crear, listar, ver detalle, **editar y eliminar** productos con swipe, SDD 04/05/06 ✅; pendiente: CRUD completo de categorías, marcas y unidades, indicadores nutricionales)

Objetivos

- CRUD de productos
- CRUD de categorías
- CRUD de marcas
- CRUD de unidades
- Seeds iniciales

Resultado esperado

El usuario puede registrar cualquier alimento personalizado.

---

## Epic 2 - Registro diario

Estado

🚧 En progreso (Home con meta de proteína y listado de comidas del día + flujo "Nueva comida" con agregar por producto o plantilla, SDD 08 ✅; detalle de comida con edición de fecha y hora ✅; pendiente: editar/eliminar items de una comida guardada)

Objetivos

- Crear registro diario ✅ (guardar comida → snapshot + agrupación por meal_id)
- Agregar alimento ✅ (por unidades o gramos, con edición de cantidad)
- Editar alimento ✅ (en el carrito de "Nueva comida")
- Eliminar alimento ✅ (en el carrito de "Nueva comida")
- Mover una comida a otra fecha/hora ✅ (desde el detalle de la comida)

Resultado esperado

El usuario puede registrar todo lo que consume durante el día.

---

## Epic 3 - Dashboard

Estado

⬜ Pendiente

Objetivos

- Proteínas consumidas hoy
- Meta diaria
- Barra de progreso
- Resumen diario

Resultado esperado

El usuario puede saber rápidamente si alcanzó su objetivo.

---

## Epic 4 - Plantillas

Estado

🚧 En progreso (crear, listar, editar y eliminar plantillas, SDD 07 ✅; pendiente: duplicar plantillas)

Objetivos

- Crear comidas frecuentes ✅
- Editar plantillas ✅
- Duplicar plantillas
- Agregar plantilla al día ✅ (desde "Nueva comida", tab Plantillas — SDD 08; las plantillas son un punto de partida, no comidas cerradas)

Resultado esperado

Registrar comidas habituales requiere sólo unos pocos toques.

---

## Epic 5 - Offline

Estado

✅ Completado (persistencia local en Dexie, cola y detección de cambios por `updated_at`, push/pull automático con last-write-wins y self-heal ante FK violations — `src/lib/sync/sync.ts`)

Objetivos

- Persistencia local ✅
- Cola de sincronización ✅
- Detección de cambios ✅
- Sincronización automática ✅
- Resolución básica de conflictos ✅

Resultado esperado

La aplicación funciona correctamente incluso sin Internet.

---

## Epic 6 - Estadísticas

Estado

⬜ Pendiente

Objetivos

- Promedio 30 días ✅ (en Home, ventana móvil con delta vs el período previo)
- Promedio mensual
- Días con meta cumplida
- Evolución de proteínas

---

## Epic 7 - Seguimiento corporal

Estado

⬜ Pendiente

Objetivos

- Peso corporal
- Medidas
- Fotos de progreso

---

## Epic 8 - Automatización

Estado

⬜ Pendiente

Objetivos

- Escáner de código de barras
- OpenFoodFacts
- OCR
- IA para importar etiquetas nutricionales

---

## Epic 9 - Futuras mejoras

Ideas

- Calorías
- Grasas
- Carbohidratos
- Fibra
- Agua
- Micronutrientes
- Recordatorios
- Widgets
- Exportación de datos
- Compartir recetas
- Compartir plantillas

---

# Principios

Cada nueva funcionalidad debe cumplir al menos uno de los siguientes objetivos:

- Reducir la cantidad de toques.
- Mejorar la velocidad de registro.
- Facilitar el seguimiento nutricional.
- Mantener la simplicidad de la aplicación.

Si una funcionalidad aumenta la complejidad sin aportar un beneficio claro, deberá postergarse para una versión futura.
