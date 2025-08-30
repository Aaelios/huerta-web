# DB & Migrations — Reglas del proyecto

## Convenciones de nombres

* snake\_case en minúsculas.
* Tablas en plural: `orders`, `entitlements`, `webhook_events`.
* PK: `id` (uuid, `gen_random_uuid()`).
* FK: `<tabla>_id` (ej. `user_id`, `stripe_customer_id`).
* Fechas: `created_at` (default now), `updated_at` (nullable).
* Booleanos: nombres directos (`active`, `confirmed`). Usa `is_` solo si aclara.
* JSON: `metadata` para miscelánea; `_json` si es específico.
* Índices: `idx_<tabla>_<col>[_<col>]`.
* Únicos: `ux_<tabla>_<col>[_<col>]`.
* Checks: `ck_<tabla>_<regla>`.
* Políticas RLS: `<tabla>_<acción>_<scope>`.
* Triggers: `trg_<tabla>_<acción>`.
* Funciones: `f_<área>_<verbo>`.
* Funciones orquestadoras: `f_orch_<área>_<acción>`.
* Vistas: `v_<tema>[_detalle]`.

## Diseño de esquema

* Evitar ENUM nativo. Usar `text` + `check` o catálogos.
* Campos Stripe explícitos para conciliación.
* `metadata` como extensibilidad sin migrar columnas.
* Índices solo para accesos reales; revisar con EXPLAIN si hay dudas.
* Claves foráneas lógicas; FK física opcional en MVP para velocidad de dev.

## RLS y seguridad

* RLS activado en todas las tablas con datos de usuario.
* `SELECT` solo dueño (`user_id = auth.uid()`).
* Escrituras desde servidor con `service_role` únicamente.
* `webhook_events`: sin lectura para clientes.
* Rotación de claves: usar API Keys nuevas (publishable/secret). No legacy en prod.
* Nunca exponer `service_role` al cliente.

## Migraciones

* Una migración por PR. Nombre: `YYYYMMDDHHMM_<cambio>.sql`.
* Solo additive: agregar columnas antes que mutar tipos.
* Cambios destructivos prohibidos; usar vistas o columnas nuevas y deprecación.
* Script reversible documentado: cómo deshacer si falla (drop de objetos nuevos).
* Revisar en staging antes de prod.

## Versionado y trazabilidad

* Tag Git al inicio y cierre de semana (`v0.2.0-start`, `v0.2.0`).
* Describir en el PR qué queries cambian y por qué.
* Mantener changelog de DB (sección por release).

## Entornos

* `.env.local` solo dev. Vercel: Production y Preview.
* `SUPABASE_SERVICE_ROLE_KEY` solo en server. Nunca `NEXT_PUBLIC_`.
* Webhooks de Stripe con secretos por entorno.

## Auditoría y observabilidad

* `updated_at` con trigger si necesitas auditoría básica.
* `webhook_events` para idempotencia y replays.
* Logs de errores en webhooks con request\_id y `stripe_event_id`.

## Pruebas

* Usuario de prueba para validar RLS.
* Casos: compra única, suscripción, reintentos de webhook, revocación.
* Consultas típicas: “mis compras”, “mis accesos” responden <100 ms en 1k registros.

## Rollback

* Mantener copia de seguridad automática de Supabase.
* Estrategia de rollback: revertir migración, restaurar desde backup si hay corrupción.
* Nunca borrar datos en caliente; usar `active=false` o `revoked_at`.