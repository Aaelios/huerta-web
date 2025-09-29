
````markdown
# Paso 3 — Supabase: Esquema y Seguridad

## Objetivo
Diseñar e implementar las tablas base (`contacts`, `messages`, `subscription_events`) con constraints, índices, triggers, funciones auxiliares y RLS, asegurando que solo `service_role` tenga acceso de escritura.

## Extensiones
- `pgcrypto` → `gen_random_uuid()`
- `citext` → emails case-insensitive
- `pgcrypto` también habilita `digest()` (para hashes SHA-256).

## Funciones utilitarias creadas
- `f_audit_updated_at_only_update()` → actualiza `updated_at` solo en `UPDATE`.
- `f_block_update_delete()` → bloquea `UPDATE/DELETE` en tablas append-only.
- `f_is_uuid_v4_v1(text)` → valida que un texto sea UUID v4.
- `f_sizeof_json_v1(jsonb)` → devuelve tamaño en bytes del JSON.
- `f_json_merge_shallow_v1(base, patch)` → merge superficial de dos JSON.
- `f_input_redact_v1(jsonb)` → redacción de inputs sensibles para guardar en metadata.
- `f_sha256_json_v1(jsonb)` → genera hash SHA-256 de un JSON.
- Funciones de negocio:
  - `f_contact_validate_v1(jsonb)`
  - `f_contact_normalize_v1(jsonb)`
  - `f_contacts_upsert_v1(jsonb)`
  - `f_contacts_apply_consent_v1(uuid, jsonb)`
  - `f_messages_idempotent_v1(uuid, jsonb)`
  - `f_subscription_events_log_v1(uuid, jsonb)`
  - **Orquestadora**: `f_orch_contact_write_v1(jsonb)` con alias estable `f_orch_contact_write(jsonb)`.

## Tablas

### `contacts`
- `id uuid PK`
- `email citext unique not null`
- `user_id uuid null` → FK a `auth.users(id) on delete set null`
- `full_name text null` *(agregado para leads y saludos en email)*
- `status` (`active|unsubscribed|bounced|blocked`)
- `consent_status` (`none|single_opt_in|double_opt_in`)
- `consent_source` (`web_form|checkout|import|api`)
- `consent_at`, `double_opt_in_at`
- `segment text`
- `utm jsonb`
- `tech_metrics jsonb`
- `metadata jsonb`
- `created_at timestamptz default now()`
- `updated_at timestamptz null` (solo en UPDATE)

Índices: email unique, `idx_contacts__user_id`, `idx_contacts__status`, `idx_contacts__consent_status`, `idx_contacts__created_at`

### `messages`
- `id uuid PK`
- `contact_id uuid not null` → FK a `contacts(id) on delete restrict`
- `source` (`web_form|checkout|import|api`)
- `payload jsonb`
- `utm jsonb`
- `context jsonb`
- `processing_status` (`received|queued|sent_to_crm|discarded`)
- `metadata jsonb` *(incluye `request_id`, `original_input`, `original_hash`, `size_bytes`)*
- `created_at timestamptz default now()`
- `updated_at timestamptz null`

Índices: `idx_messages__contact_id`, `idx_messages__source`, `idx_messages__created_at`, `idx_messages__processing_status`

### `subscription_events` (append-only)
- `id uuid PK`
- `contact_id uuid not null` → FK a `contacts(id) on delete restrict`
- `event_type` (`opt_in|double_opt_in|unsubscribe|bounce|complaint`)
- `source` (`web_form|checkout|import|api|provider_webhook`)
- `reason text`, `campaign_id text`
- `idempotency_key text unique`
- `metadata jsonb`
- `occurred_at timestamptz default now()`
- `created_at timestamptz default now()`
- `updated_at timestamptz null`

Índices: `idx_subscription_events__contact_id`, `idx_subscription_events__event_type`, `idx_subscription_events__occurred_at`

Triggers:
- `touch_updated_at` (solo en UPDATE)
- `block_update_delete` (impide UPDATE/DELETE)

## RLS
- Activado en todas las tablas.
- Solo `service_role` con política `for all using (true)` (o `for insert/select` en `subscription_events`).
- `anon` y `authenticated` bloqueados.
- **Funciones orquestadoras** (`f_orch_contact_write*`): permisos ajustados → solo `service_role` y `postgres` pueden ejecutar.

## Pruebas ejecutadas
1. Insert contacto con service_role ✔️  
2. Insert mensaje ligado ✔️  
3. Email duplicado falla ✔️  
4. Insert en subscription_events ✔️  
5. Update/Delete en subscription_events fallan ✔️  
6. Update en contacts cambia `updated_at` ✔️  
7. Orquestadora probada con casos A–E (opt-in, duplicado, soporte, payload demasiado grande, normalización de source) ✔️  

## Limpieza
```sql
truncate table public.subscription_events, public.messages, public.contacts restart identity;
````

## Rollback documentado

Ver script en `rollback_supabase_step3.sql`.

## Estado final

* Esquema seguro, extensible y probado.
* Funciones auxiliares y orquestadora validadas.
* Permisos cerrados a `service_role`.
* Base lista para integrar endpoints en Next.js en el siguiente paso.

```