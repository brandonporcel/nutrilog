# NutriLog

NutriLog es una aplicación personal para registrar alimentos consumidos y realizar el seguimiento diario de macronutrientes de forma rápida, simple y offline-first.

El objetivo principal no es reemplazar aplicaciones como Fitia o MyFitnessPal, sino ofrecer una experiencia mucho más sencilla para responder una única pregunta:

> ¿Estoy llegando a mi objetivo diario de proteínas?

Con el tiempo la aplicación podrá crecer para soportar calorías, carbohidratos, grasas, fibra, agua, peso corporal, recetas, escaneo de códigos de barras e importación automática de información nutricional mediante IA.

---

# Objetivos

## MVP

- Registrar productos personalizados.
- Registrar alimentos consumidos cada día.
- Calcular automáticamente las proteínas consumidas.
- Funcionar completamente offline.
- Sincronizar datos cuando vuelva la conexión.
- No requerir login.

## Futuro

- Seguimiento de calorías.
- Seguimiento de macronutrientes completos.
- Seguimiento de peso corporal.
- Seguimiento de medidas.
- Estadísticas.
- Plantillas de comidas.
- Escaneo de código de barras.
- OCR de etiquetas nutricionales.
- IA para importar productos automáticamente.

---

# Filosofía

La aplicación sigue algunas reglas importantes.

## Offline First

Toda acción ocurre primero en la base de datos local.

Nunca se espera una respuesta del servidor para que el usuario pueda seguir utilizando la aplicación.

Cuando exista conexión, los cambios serán sincronizados automáticamente.

---

## Personal First

La aplicación está pensada inicialmente para un único usuario.

No habrá sistema de cuentas ni autenticación tradicional durante las primeras versiones.

---

## Simple First

Antes que agregar funcionalidades nuevas se prioriza:

- velocidad
- simplicidad
- facilidad de uso

Registrar una comida debería tomar menos de 10 segundos.

---

# Stack tecnológico

Frontend

- Next.js
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

Sincronización

- Offline Queue
- Sync Engine

---

# Arquitectura

La aplicación utilizará una arquitectura offline-first.

            UI
             │
             ▼
        IndexedDB
             │
             ▼
       Sync Engine
             │
             ▼
        PostgreSQL

Toda escritura ocurre primero en IndexedDB.

La sincronización con Supabase ocurre en segundo plano.

---

# Estructura inicial del proyecto

/docs
architecture/
database/
decisions/
roadmap/

/skills

/commands

/src

---

# Roadmap

## Epic 0

Infraestructura

- Proyecto Next
- Tailwind
- PWA
- shadcn/ui
- Dexie
- ESLint
- Prettier

---

## Epic 1

Productos

- CRUD productos
- Categorías
- Marcas
- Unidades

---

## Epic 2

Registro diario

- Agregar alimento
- Editar
- Eliminar
- Historial diario

---

## Epic 3

Plantillas

- Crear comidas frecuentes
- Editar plantillas
- Agregar plantilla al día

---

## Epic 4

Dashboard

- Proteínas del día
- Meta diaria
- Barra de progreso
- Estadísticas básicas

---

## Epic 5

Sincronización

- Cola offline
- Sincronización
- Resolución de conflictos

---

## Epic 6

Automatización

- Código de barras
- OCR
- IA
- OpenFoodFacts

---

# Modelo de datos (MVP)

- Categories
- Brands
- Units
- Products
- Templates
- TemplateItems
- DailyLogs
- DailyLogItems
- Installations
- Devices

---

# Convenciones

## UUID

Todas las tablas utilizarán UUID como clave primaria.

---

## Soft Delete

Las entidades sincronizables utilizarán deleted_at.

Nunca se eliminarán físicamente.

---

## Timestamps

Todas las tablas tendrán:

- created_at
- updated_at

---

## IDs

Los UUID serán generados desde la aplicación para facilitar el trabajo offline.

---

# Objetivo de UX

El flujo más frecuente debe verse así:

Abrir aplicación

↓

Botón +

↓

Buscar producto

↓

Ingresar cantidad

↓

Guardar

↓

Listo

Todo el proceso debería demorar menos de 10 segundos.

---

# Principios de desarrollo

Antes de agregar una funcionalidad preguntarse:

- ¿Hace la aplicación más rápida?
- ¿Reduce la cantidad de toques?
- ¿Mantiene la simplicidad?
- ¿Aporta valor al objetivo principal?

Si la respuesta es no, probablemente esa funcionalidad pueda esperar.

---

# Estado actual

En desarrollo.

Primera etapa:

☑ Crear proyecto
☑ Definir arquitectura
☑ Definir stack
☐ Configurar PWA
☐ Configurar Dexie
☐ Diseñar base de datos
☐ CRUD de productos
☐ Registro diario

---

# Licencia

Proyecto personal desarrollado con fines de aprendizaje y uso propio.
