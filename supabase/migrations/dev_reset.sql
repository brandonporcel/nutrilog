-- NutriLog — DEV RESET (SOLO DESARROLLO. NUNCA correr en un proyecto con datos reales)
-- Dropea todas las tablas para re-ejecutar 0001_initial.sql desde cero.
--
-- Flujo completo de reset:
--   1. Correr este archivo en el SQL editor.
--   2. Correr supabase/migrations/0001_initial.sql.
--   3. En el navegador (cada dispositivo): abrir la consola y ejecutar
--      indexedDB.deleteDatabase('nutrilog')  →  recargar la app.
--      (Si no se limpia el IndexedDB, el último lastSyncedAt local impide
--      que el sync vuelva a subir filas viejas a las tablas recién creadas.)

drop table if exists public.daily_log_items cascade;
drop table if exists public.daily_logs cascade;
drop table if exists public.template_items cascade;
drop table if exists public.templates cascade;
drop table if exists public.products cascade;
drop table if exists public.brands cascade;
drop table if exists public.categories cascade;
drop table if exists public.units cascade;
