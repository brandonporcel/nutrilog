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

El flujo esperado será:

Usuario

↓

UI

↓

Persistencia local (IndexedDB)

↓

Sincronización

↓

Supabase

La aplicación nunca debería depender de la conexión para registrar información.

---

# Autenticación

La autenticación es gestionada por Supabase Auth (email + contraseña).

- La sesión se almacena en cookies mediante `@supabase/ssr`.
- Las mutaciones de autenticación (`signIn`, `signUp`, `signOut`) son Server Actions que usan el cliente de servidor (`src/lib/supabase/server.ts`).
- `src/proxy.ts` (convención `proxy` de Next.js 16, reemplaza a `middleware.ts`) refresca la sesión en cada request y aplica los guardias de ruta:
  - Usuario autenticado en `/login` o `/register` → redirect a `/dashboard`.
  - Usuario no autenticado en rutas protegidas (ej. `/dashboard`) → redirect a `/login`.
- Las rutas protegidas verifican el usuario nuevamente en el Server Component como defensa adicional.

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
