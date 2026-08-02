# SDD 02 — PWA instalable

Estado: ✅ Aprobado

---

## Proposal

### Contexto

- Autenticación funcional (SDD 01): `/login`, `/register`, `/dashboard` protegido con guardias en `src/proxy.ts`.
- Next.js **16.2.12** (App Router, proxy.ts, Turbopack por defecto).
- Roadmap Epic 0 incluye "Configurar PWA" (pendiente). El offline completo con datos locales (Dexie + cola de sincronización) es el **Epic 5**, posterior.
- `docs/architecture.md` establece Offline First: la app debe funcionar sin conexión.
- `src/app/layout.tsx` ya tiene metadata básica (title, description, `appleWebApp`, `themeColor`).

### Objetivo

1. App instalable (PWA): manifest + íconos + service worker.
2. Shell offline básico: la app abre y navega las rutas principales sin conexión.
3. Registro automático del service worker en producción.
4. Poder instalarla y probarla en el celular vía HTTPS.

### Fuera de alcance (Epic 5)

- Dexie/IndexedDB, cola de sincronización, sync con Supabase.
- Push notifications, background sync.
- Sincronización de la sesión offline.

### Opciones consideradas

| Opción | Descripción | Veredicto |
| --- | --- | --- |
| **A. Service worker manual** (`public/sw.js`) | `manifest.ts` nativo de Next + SW propio + registro desde un componente cliente | ✅ **Elegida** — cero dependencias nuevas, sin riesgo de compatibilidad con Next 16/Turbopack, control total del precache |
| B. `@serwist/next` | Precache automático del build, fork de Workbox | ❌ Dependencia nueva y compatibilidad no confirmada con Next 16 |
| C. `next-pwa` | Deprecado, mal soporte de App Router | ❌ Descartado |

---

## Spec

### Requisitos funcionales

- **RF1** `/manifest.webmanifest` generado por `src/app/manifest.ts` con: `name` "NutriLog", `short_name`, `description`, `lang: "es"`, `start_url: "/"`, `display: "standalone"`, `background_color` y `theme_color` `#f8f9ff` (coincide con `viewport` actual), íconos PNG 192/512 (`purpose: "any"`) y maskable.
- **RF2** Íconos en `public/icons/`: `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180×180 para iOS).
- **RF3** Service worker `public/sw.js`: precache del shell, estrategias de caché, `skipWaiting` + `clientsClaim`.
- **RF4** Shell precacheado: `/`, `/login`, `/register`, `/dashboard`, `/manifest.webmanifest` e íconos.
- **RF5** Estrategias:
  - navegaciones (navigations): network-first con fallback a caché;
  - estáticos (`/_next/static`, íconos, manifest): cache-first.
- **RF6** Registro del SW desde un componente cliente que lo registra **solo en producción** (evita cachés molestas en `next dev`).
- **RF7** `src/proxy.ts`: el matcher excluye `/sw.js` y `/manifest.webmanifest`.
- **RF8** El ícono/favicon emoji 🥗 actual se mantiene.

### Requisitos no funcionales

- HTTPS obligatorio para instalar en Android Chrome / iOS Safari.
- Verificación con Lighthouse (criterios de instalabilidad: manifest válido + SW con fetch handler) y prueba real de instalación en Android.
- La caché del SW no debe romper `next dev`: en desarrollo el SW no se registra.

---

## Design

### Paquetes

```
npm i -D sharp        # solo para generar los PNG a partir de un SVG (scripts/generate-icons.mjs)
```

### Estructura de archivos

```
src/
  app/
    manifest.ts                         # Web App Manifest (convención Next)
    layout.tsx                          # + formatDetection; appleWebApp ya existe
  components/pwa/
    service-worker-register.tsx         # componente cliente: registra /sw.js en producción
public/
  sw.js                                 # service worker manual
  icons/
    icon-192.png
    icon-512.png
    icon-maskable-192.png
    icon-maskable-512.png
    apple-touch-icon.png
scripts/
  generate-icons.mjs                    # sharp: SVG (🥗 sobre fondo) → PNGs
```

### Service worker

- `CACHE_VERSION` + `PRECACHE_URLS` explícitos (lista versionada, el cambio de versión invalida el caché viejo).
- `install`: precache del shell (RF4).
- `fetch`:
  - `navigation` → network-first, fallback a la copia cacheada (y si no hay, respuesta mínima).
  - `/_next/static` e íconos → cache-first.
- `activate`: borrar caches con versión distinta + `clientsClaim`.
- `skipWaiting` en `install`.

### Manifest (borrador)

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NutriLog",
    short_name: "NutriLog",
    description:
      "Registra los alimentos consumidos y realiza el seguimiento diario de macronutrientes, incluso sin conexión.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9ff",
    theme_color: "#f8f9ff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

### Prueba en el celular (HTTPS)

> El SW solo se registra en producción (`NODE_ENV === "production"`), así que la prueba usa `next start`, no `next dev`.

- **Opción recomendada**: tunnel HTTPS local sin cuenta con cloudflared.
  1. Instalar cloudflared (Windows: `winget install cloudflared` o el binario de https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
  2. `npm run build && npm run start` (el celular y la PC en la misma red).
  3. `cloudflared tunnel --url http://localhost:3000` → URL HTTPS pública.
  4. En Android Chrome abrir la URL → menú ⋮ → "Instalar app".
- Alternativa: deploy a Vercel (HTTPS real, producción; requiere cuenta).

### Docs

- `docs/architecture.md`: nueva sección "PWA" (manifest + SW + estrategias de caché; aclarar que el offline de datos es Epic 5).
- `docs/roadmap.md`: marcar "Configurar PWA" como ✅ en Epic 0.

---

## Tasks

1. `npm i -D sharp`.
2. Crear `scripts/generate-icons.mjs` y generar los PNG en `public/icons/`.
3. Crear `src/app/manifest.ts` (RF1).
4. Actualizar `src/app/layout.tsx` (`formatDetection`; el link al manifest lo agrega Next solo).
5. Crear `public/sw.js` (precache + estrategias, RF3–RF5).
6. Crear `src/components/pwa/service-worker-register.tsx` e incluirlo en el layout (RF6).
7. Actualizar el matcher de `src/proxy.ts` (RF7).
8. Actualizar `docs/architecture.md` y `docs/roadmap.md`.
9. Verificar: `npm run build`, `npm run lint`, Lighthouse (instalabilidad), instalación real en Android vía HTTPS.
