# NutriLog

NutriLog es una aplicación web progresiva (PWA) para registrar alimentos consumidos y realizar el seguimiento diario de macronutrientes.

Actualmente el objetivo principal es ayudar a responder una pregunta de forma rápida:

> ¿Estoy llegando a mi objetivo diario de proteínas?

La aplicación está diseñada para ser rápida, simple y funcionar incluso sin conexión a Internet.

---

## Características

- Registro de productos personalizados.
- Seguimiento diario de alimentos consumidos.
- Plantillas para comidas frecuentes.
- Funcionamiento offline.
- Sincronización automática entre dispositivos.
- Autenticación mediante Supabase Auth.

---

## Stack

### Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Persistencia local

- IndexedDB
- Dexie

### Backend

- Supabase
- PostgreSQL

---

## Documentación

La documentación del proyecto se encuentra en la carpeta `docs`.

- `docs/architecture.md` → Arquitectura y convenciones.
- `docs/database.md` → Modelo de datos.
- `docs/roadmap.md` → Roadmap del proyecto.

---

## Desarrollo

Instalar dependencias

```bash
npm install
```

Iniciar servidor de desarrollo

```bash
npm run dev
```

Abrir

```
http://localhost:3000
```

---

## Estado del proyecto

🚧 En desarrollo.

La primera versión estará enfocada en:

- Gestión de productos.
- Registro diario de alimentos.
- Seguimiento de proteínas.
- Funcionamiento offline.
- Sincronización con Supabase.

---

## Licencia

Proyecto personal desarrollado con fines de aprendizaje y uso propio.
