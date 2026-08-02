# SDD 01 — Autenticación con Supabase Auth

Estado: Propuesta — pendiente de aprobación

---

## Proposal

### Contexto

- Las pantallas de login/register ya existen (UI-only) siguiendo `docs/DESIGN.md`.
- `.env.local` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- En Supabase: Auth Provider email habilitado, **confirm email desactivado** (el signUp devuelve sesión inmediata).
- `docs/database.md` ya establece: "La autenticación es gestionada por Supabase Auth" y entidades con `user_id`.
- Next.js **16.2.12**: el middleware clásico quedó deprecado, el archivo de intercepción ahora es `src/proxy.ts` con export `proxy`.

### Objetivo

1. Login y register funcionales con email + contraseña contra Supabase Auth.
2. Una ruta protegida (`/dashboard`) que redirige usuarios no autenticados a `/login`.
3. Redirección inversa: usuario autenticado en `/login` o `/register` → `/dashboard`.
4. Mantener `/` → `/login`.

### Fuera de alcance (posterior)

- OAuth Google (el botón queda disabled).
- Reset/recuperación de contraseña.
- Perfil de usuario, RLS, triggers.
- Sincronización offline con la sesión (Epic 5).
- Tipos generados de Supabase (`supabase gen types` — no hay tablas propias todavía).

### Opciones consideradas

| Opción | Descripción | Veredicto |
| --- | --- | --- |
| **A. Server Actions + @supabase/ssr** | `signIn`/`signUp`/`signOut` como server actions usando `createServerClient(cookies)`; guardias en `proxy.ts` | ✅ **Elegida** — lógica de auth en servidor, sesión en cookies httpOnly, patrón canónico de Supabase para App Router |
| B. Cliente (createBrowserClient) | Forms mutan desde el cliente con estado local | ❌ Menos seguro (lógica expuesta), sin refresco centralizado de sesión |
| C. @supabase/auth-helpers-nextjs | Paquete deprecado | ❌ Descartado |

---

## Spec

### Requisitos funcionales

- **RF1** `/login`: valida email + contraseña. Error visible (español neutro) en caso de credenciales inválidas. Éxito → `/dashboard`.
- **RF2** `/register`: crea la cuenta. Con confirm email off la sesión se crea sola. Éxito → `/dashboard`. Error visible si el email ya existe.
- **RF3** `/dashboard`: ruta protegida. Muestra el email del usuario y botón "Cerrar sesión".
- **RF4** Guardias en `proxy.ts`:
  - sin sesión en `/dashboard` → redirect `/login`
  - con sesión en `/login` o `/register` → redirect `/dashboard`
- **RF5** `/` → `/login` (ya existe).
- **RF6** El botón "Continuar con Google" permanece disabled.

### Requisitos no funcionales

- Sesión SSR en cookies (`@supabase/ssr`), refresco de token en cada request vía proxy.
- Mensajes de error de Supabase mapeados a español neutro (tabla en Design).
- Estados de loading (`pending`) y `aria-live` en los formularios.
- `setAll` del proxy debe aplicar también los headers anti-caché que pasa la librería.

---

## Design

### Paquetes

```
npm i @supabase/ssr @supabase/supabase-js
```

### Estructura de archivos

```
src/
  proxy.ts                          # guardias de rutas (Next 16, export `proxy`)
  lib/supabase/
    client.ts                       # createBrowserClient (uso futuro)
    server.ts                       # createServerClient con cookies() async
    session.ts                      # createProxyClient(request, response) — refresco + headers
  app/
    (auth)/
      layout.tsx                    # fondo surface + texto, envuelve login/register
      login/page.tsx                # movido de app/login
      register/page.tsx             # movido de app/register
      actions.ts                    # server actions: signIn, signUp, signOut
    dashboard/
      page.tsx                      # ruta protegida (server component)
  components/auth/
    login-form.tsx                  # useActionState(signIn)
    register-form.tsx               # useActionState(signUp)
    brand-panel.tsx                 # usa /auth/hero.jpg con next/image
public/auth/hero.jpg                # copiado desde origin/authh
```

### Flujo de sesión

1. `signUp`/`signIn` (server action) → `createClient()` (server) → cookies seteadas por la librería.
2. Cada request pasa por `src/proxy.ts`:
   - `createProxyClient(request, response)` (getAll desde request, setAll hacia response incluyendo headers `Cache-Control`/`Expires`/`Pragma`).
   - `supabase.auth.getUser()` valida y refresca la sesión.
   - Aplica guardias RF4.
3. `dashboard/page.tsx` lee el usuario con `createClient()` para render (doble verificación defensiva).

### Matcher del proxy

```ts
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
```

### Mapeo de errores

| Error Supabase | Mensaje (español) |
| --- | --- |
| `Invalid login credentials` | Email o contraseña incorrectos. |
| `User already registered` | Ya existe una cuenta con este email. |
| `Email not confirmed` | Confirmá tu email antes de ingresar. |
| otro | `error.message` (técnico, temporal) |

### Docs

- `docs/architecture.md`: nueva sección "Autenticación" (flujo SSR + proxy + guardias).

---

## Tasks

1. `npm i @supabase/ssr @supabase/supabase-js`.
2. Mover `src/app/login` y `src/app/register` a `src/app/(auth)/` + crear `(auth)/layout.tsx`.
3. Copiar `public/auth/hero.jpg` desde `origin/authh`; actualizar `brand-panel.tsx` con `next/image`.
4. Crear `src/lib/supabase/{client,server,session}.ts`.
5. Crear `src/proxy.ts` con guardias + matcher.
6. Crear `src/app/(auth)/actions.ts` (signIn/signUp/signOut).
7. Convertir `login-form.tsx` y `register-form.tsx` a `useActionState` (pending + errores).
8. Crear `src/app/dashboard/page.tsx` (protegida, con signOut).
9. Actualizar `docs/architecture.md` (sección Autenticación).
10. Verificar: `npm run build`, `npm run lint`, flujo manual en `npm run dev`.
