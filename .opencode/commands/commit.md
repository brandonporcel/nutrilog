---
description: Agrega y analiza los cambios, genera y ejecuta un Conventional Commit
---

Agrega todos los cambios del working tree:

```sh
git add .
```

Analiza los cambios preparados para el commit:

```sh
git diff --cached
```

Genera un único mensaje de Conventional Commit que represente de la mejor manera el propósito general de los cambios.

Reglas:

- Usa Conventional Commits.
- Escribe el mensaje en inglés.
- Usa el modo imperativo.
- Prefiere mensajes concisos pero informativos.
- El asunto debe reflejar el objetivo principal de los cambios, no solo los archivos o modificaciones más evidentes.
- Analiza el alcance completo de los cambios preparados, no solo los nombres de los archivos.
- Si el commit incluye configuración inicial, infraestructura, configuración del proyecto o herramientas, refléjalo en el mensaje.
- Evita mensajes demasiado genéricos como "update files", "add screens" o "fix stuff".
- Si varios cambios forman parte de una misma funcionalidad, resúmelos en un único mensaje significativo.
- Si los cambios introducen un nuevo módulo, framework, sistema de diseño o la base de una funcionalidad, prioriza verbos como:
  - bootstrap
  - initialize
  - set up
  - scaffold
    en lugar de simplemente "add".
- No incluyas un cuerpo en el commit salvo que los cambios abarquen múltiples aspectos o una configuración importante del proyecto.
- Si incluyes un cuerpo, que sea breve (2–5 viñetas) resumiendo los cambios principales.
- No expliques el mensaje generado.

Tipos disponibles:

- feat
- fix
- refactor
- docs
- style
- test
- chore
- build
- ci
- perf

Scopes preferidos:

- auth
- products
- categories
- brands
- units
- templates
- daily-log
- dashboard
- sync
- database
- ui
- pwa
- docs

Después de generar el mensaje:

1. Ejecuta:

   ```sh
   git commit -m "<generated_commit_message>"
   ```

2. Si el commit se realiza correctamente, devuelve únicamente la salida de `git commit`.

3. Si no hay cambios para commitear, devuelve:

   ```
   No changes to commit.
   ```

4. Si el commit falla, devuelve únicamente el error producido por Git.

5. No solicites confirmación antes de ejecutar los comandos.

6. No muestres el mensaje de commit por separado, salvo que el commit falle antes de ejecutarse.
