Documentación final de RPCs. Consumibles y explícitas.

# f_bundle_schedule

* Firma: `public.f_bundle_schedule(bundle_sku text) returns jsonb`
* Función: Calcula el primer inicio futuro por hijo (`live_class`) y el mínimo global del bundle.
* Seguridad: `SECURITY DEFINER`, `STABLE`, `SET search_path=public`. `GRANT EXECUTE` a `anon|authenticated|service_role`.
* RLS esperado: sin `SELECT` directo; lectura interna a tablas con RLS restringida. Exposición solo vía esta RPC.
* Retorno (JSON):

  * `bundle_sku: string`
  * `next_start_at: string|null` ISO-8601 UTC
  * `children: [{child_sku:string, next_start_at:string|null}]`
* Reglas:

  * Fuentes: `bundle_items`, `live_class_instances`.
  * Filtro instancias: `status in ('scheduled','open') and start_at > now()`.
  * Hijos no-`live_class`: aparecen con `next_start_at:null`.

# f_bundle_next_start_at (wrapper)

* Firma: `public.f_bundle_next_start_at(bundle_sku text) returns jsonb`
* Función: Proyecta `{bundle_sku, next_start_at}` desde `f_bundle_schedule`.
* Seguridad/RLS: igual que core.
* Retorno (JSON): `{bundle_sku:string, next_start_at:string|null}`.

# f_bundle_children_next_start (wrapper)

* Firma: `public.f_bundle_children_next_start(bundle_sku text) returns jsonb`
* Función: Proyecta `children[]` desde `f_bundle_schedule`.
* Seguridad/RLS: igual que core.
* Retorno (JSON): `[{child_sku:string, next_start_at:string|null}]`.

# f_entitlement_has_email

* Firma: `public.f_entitlement_has_email(email text, sku text) returns jsonb`
* Función: Valida acceso activo para `email` y `sku` usando `auth.users` → `user_id` y `v_entitlements_active`.
* Seguridad: `SECURITY DEFINER`, `STABLE`, `SET search_path=public,auth`. `GRANT EXECUTE` a `anon|authenticated|service_role`.
* RLS esperado: no expone PII; solo booleano. Lectura a `auth.users` y vista pública controlada.
* Retorno (JSON): `{has:boolean}`.
* Reglas:

  * Email case-insensitive.
  * Acceso verdadero si existe fila activa en `v_entitlements_active` para `(user_id, sku)`.

# Errores y HTTP en /rest

* Tipos válidos → `200 OK` con JSON.
* Parámetro faltante o tipo inválido → `400 Bad Request` (PostgREST).
* Error interno no esperado → `500 Internal Server Error`.
* No se lanza excepción por “no encontrado”; se retorna JSON con `null` o `false`.

# Performance

* Índices usados/recomendados:

  * `bundle_items(bundle_sku, child_sku)`.
  * `live_class_instances(sku, start_at)`.
  * `entitlements(user_id, sku)` ya presente.
* Objetivo: p95 <100 ms. Medido ≈2 ms en PREVIEW para dataset actual.
* Todas las funciones son `STABLE` → cacheables por PostgREST.

```bash
# =========================
# EJEMPLOS DE CONSUMO
# =========================

# SQL — Core
select public.f_bundle_schedule('course-lobra-rhd-fin-finanzas-v001');

# SQL — Wrappers
select public.f_bundle_next_start_at('course-lobra-rhd-fin-finanzas-v001');
select public.f_bundle_children_next_start('course-lobra-rhd-fin-finanzas-v001');

# SQL — Entitlements
select public.f_entitlement_has_email('rhuerta@gmail.com','liveclass-lobra-rhd-fin-ingresos-v001');

# REST (PostgREST) — Core
curl -s -X POST \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  https://<PROJECT>.supabase.co/rest/v1/rpc/f_bundle_schedule \
  -d '{"bundle_sku":"course-lobra-rhd-fin-finanzas-v001"}'
# → {
#   "bundle_sku":"course-lobra-rhd-fin-finanzas-v001",
#   "next_start_at":"2025-10-29T02:30:00+00:00",
#   "children":[{"child_sku":"...-ingresos-v001","next_start_at":"2025-10-29T02:30:00+00:00"}, ... ]
# }

# REST — Wrappers
curl -s -X POST -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  https://<PROJECT>.supabase.co/rest/v1/rpc/f_bundle_next_start_at \
  -d '{"bundle_sku":"course-lobra-rhd-fin-finanzas-v001"}'
# → {"bundle_sku":"...","next_start_at":"2025-10-29T02:30:00+00:00"}

curl -s -X POST -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  https://<PROJECT>.supabase.co/rest/v1/rpc/f_bundle_children_next_start \
  -d '{"bundle_sku":"course-lobra-rhd-fin-finanzas-v001"}'
# → [{"child_sku":"...","next_start_at":"..."}, ...]

# REST — Entitlements
curl -s -X POST -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  https://<PROJECT>.supabase.co/rest/v1/rpc/f_entitlement_has_email \
  -d '{"email":"rhuerta@gmail.com","sku":"liveclass-lobra-rhd-fin-ingresos-v001"}'
# → {"has":true}

## RPCs Bundles & Entitlements v1.0.0
| name | fingerprint | date | commit |
|------|-------------|------|---------|
| f_bundle_schedule | cf541970e062b9656a33c51ae0f7cfee61eb7adf92167c11e178193a56d66b2bd | 2025-10-20 | <commit> |
| f_bundle_next_start_at | ace3ccdc47fcc5f25842010e231a84426a60d49178e73aec1f85d91e295adf53 | 2025-10-20 | <commit> |
| f_bundle_children_next_start | 1828b441cc142fd71e5054717db91e94257ad5f4b05ce15cad379a3abe3ae64a | 2025-10-20 | <commit> |
| f_entitlement_has_email | 1b8d971b95c834b6cfc...6cd06fc3 | 2025-10-20 | <commit> |

```
