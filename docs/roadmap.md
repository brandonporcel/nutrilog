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

✅ En progreso

Objetivos

- Configurar Next.js
- Configurar TypeScript
- Configurar Tailwind CSS
- Configurar PWA ✅
- Configurar shadcn/ui
- Configurar Dexie
- Definir arquitectura
- Diseñar base de datos
- Documentar el proyecto

---

## Epic 1 - Productos

Estado

⬜ Pendiente

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

⬜ Pendiente

Objetivos

- Crear registro diario
- Agregar alimento
- Editar alimento
- Eliminar alimento
- Historial por día

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

⬜ Pendiente

Objetivos

- Crear comidas frecuentes
- Editar plantillas
- Duplicar plantillas
- Agregar plantilla al día

Resultado esperado

Registrar comidas habituales requiere sólo unos pocos toques.

---

## Epic 5 - Offline

Estado

⬜ Pendiente

Objetivos

- Persistencia local
- Cola de sincronización
- Detección de cambios
- Sincronización automática
- Resolución básica de conflictos

Resultado esperado

La aplicación funciona correctamente incluso sin Internet.

---

## Epic 6 - Sincronización entre dispositivos

Estado

⬜ Pendiente

Objetivos

- Installations
- Devices
- Vincular nuevo dispositivo
- Código de vinculación
- Código QR
- Sincronización entre PC y teléfono

Resultado esperado

El usuario puede utilizar la misma información desde múltiples dispositivos.

---

## Epic 7 - Estadísticas

Estado

⬜ Pendiente

Objetivos

- Promedio semanal
- Promedio mensual
- Días con meta cumplida
- Evolución de proteínas

---

## Epic 8 - Seguimiento corporal

Estado

⬜ Pendiente

Objetivos

- Peso corporal
- Medidas
- Fotos de progreso

---

## Epic 9 - Automatización

Estado

⬜ Pendiente

Objetivos

- Escáner de código de barras
- OpenFoodFacts
- OCR
- IA para importar etiquetas nutricionales

---

## Epic 10 - Futuras mejoras

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
