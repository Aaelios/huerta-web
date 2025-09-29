-- BLOQUE 12 — ROLLBACK SEGURO (ejecutar por secciones según necesites)

-- A) Quitar RLS policies (en orden tablas dependientes → base)
drop policy if exists subscription_events_insert_sr on public.subscription_events;
drop policy if exists subscription_events_select_sr on public.subscription_events;
drop policy if exists messages_all_service_role      on public.messages;
drop policy if exists contacts_all_service_role      on public.contacts;

-- B) Desactivar RLS (opcional)
alter table public.subscription_events disable row level security;
alter table public.messages            disable row level security;
alter table public.contacts            disable row level security;

-- C) Triggers (touch + bloqueo append-only)
drop trigger if exists trg_subscription_events__block_ud      on public.subscription_events;
drop trigger if exists trg_subscription_events__touch_updated_at on public.subscription_events;
drop trigger if exists trg_messages__touch_updated_at          on public.messages;
drop trigger if exists trg_contacts__touch_updated_at          on public.contacts;

-- D) Constraints adicionales (opcionales si quieres conservar tablas)
-- messages
alter table public.messages drop constraint if exists ck_messages__processing_status;
alter table public.messages drop constraint if exists ck_messages__source;
alter table public.messages drop constraint if exists fk_messages__contact;
-- contacts
alter table public.contacts drop constraint if exists ck_contacts__consent_source;
alter table public.contacts drop constraint if exists ck_contacts__consent_status;
alter table public.contacts drop constraint if exists ck_contacts__status;
alter table public.contacts drop constraint if exists ux_contacts__email;
alter table public.contacts drop constraint if exists fk_contacts__user;
-- subscription_events
alter table public.subscription_events drop constraint if exists ck_subscription_events__source;
alter table public.subscription_events drop constraint if exists ck_subscription_events__event_type;
alter table public.subscription_events drop constraint if exists fk_subscription_events__contact;

-- E) Índices (si vas a dropear tablas, este paso es opcional; el DROP TABLE los elimina)
drop index if exists idx_subscription_events__occurred_at;
drop index if exists idx_subscription_events__event_type;
drop index if exists idx_subscription_events__contact_id;
drop index if exists idx_messages__processing_status;
drop index if exists idx_messages__created_at;
drop index if exists idx_messages__source;
drop index if exists idx_messages__contact_id;
drop index if exists idx_contacts__created_at;
drop index if exists idx_contacts__consent_status;
drop index if exists idx_contacts__status;
drop index if exists idx_contacts__user_id;

-- F) Tablas (hijas → padres)
drop table if exists public.subscription_events;
drop table if exists public.messages;
drop table if exists public.contacts;

-- G) Funciones utilitarias (solo si quieres limpiar)
drop function if exists public.f_block_update_delete;
drop function if exists public.f_audit_updated_at_only_update;

-- H) Extensiones (no recomendado en Supabase; dejar instaladas normalmente)
-- drop extension if exists citext;
-- drop extension if exists pgcrypto;
