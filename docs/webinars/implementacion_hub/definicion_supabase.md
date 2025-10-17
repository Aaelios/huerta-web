-- =====================================================================
-- MIGRACIÓN PREVIEW · live_class_instances (DDL + RLS + RPC WRAPPER)
-- Proyecto: Huerta Consulting / LOBRÁ
-- Objetivo: Soportar listado dinámico de webinars sin romper UI actual.
-- NOTA DE EJECUCIÓN: puedes correr TODO en un solo run. Si prefieres por pasos:
--   (1) Tabla  (2) Índices  (3) Trigger  (4) RLS  (5) RPC wrapper  (6) Grants.
-- Requisitos previos:
--   - Función de auditoría existente: public.f_audit_set_updated_at()
--   - SITE_TZ = 'America/Mexico_City' (usado como default en timezone)
-- Estados válidos: scheduled | open | sold_out | ended | canceled
-- Sensible: NO exponer zoom_join_url ni replay_url en APIs públicas.
-- =====================================================================

-- 1) Tabla base
create table if not exists public.live_class_instances (
  id               uuid primary key default gen_random_uuid(),
  sku              text not null,                                -- SKU lógico (alineado a products/Stripe)
  instance_slug    text not null,                                -- p.ej. '2025-11-07-1900' (alineado a /webinars/[slug])
  status           text not null,                                -- scheduled | open | sold_out | ended | canceled
  title            text,                                         -- opcional: variante visible en UI
  start_at         timestamptz,                                  -- inicio UTC real
  end_at           timestamptz,                                  -- fin UTC real
  timezone         text not null default 'America/Mexico_City',  -- SITE_TZ v1
  capacity         integer default 10,                           -- default operativo v1; null = ilimitado si se quisiera en el futuro
  seats_sold       integer not null default 0,                   -- contador operativo; verdad absoluta en Stripe + orders
  zoom_join_url    text,                                         -- sensible: no se expone por RPC pública
  replay_url       text,                                         -- sensible: no se expone por RPC pública
  metadata         jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,                                  -- coherente con tus tablas (nullable)

  constraint ck_live_class_instances_status
    check (status in ('scheduled','open','sold_out','ended','canceled')),

  constraint ck_live_class_instances_slug_pattern
    check (instance_slug ~ '^\d{4}-\d{2}-\d{2}-\d{4}$'),

  constraint ck_live_class_instances_capacity_nonneg
    check (capacity is null or capacity >= 0),

  constraint ck_live_class_instances_seats_nonneg
    check (seats_sold >= 0),

  constraint ck_live_class_instances_seats_vs_capacity
    check (capacity is null or seats_sold <= capacity)
);

-- 2) Unicidad y performance de lectura
create unique index if not exists ux_live_class_instances__sku_slug
  on public.live_class_instances (sku, instance_slug);

create index if not exists idx_live_class_instances__sku_start_at_desc
  on public.live_class_instances (sku, start_at desc);

create index if not exists idx_live_class_instances__status
  on public.live_class_instances (status);

-- 3) Auditoría updated_at (usa tu función estándar)
drop trigger if exists trg_live_class_instances__updated_at on public.live_class_instances;
create trigger trg_live_class_instances__updated_at
before update on public.live_class_instances
for each row
execute function public.f_audit_set_updated_at();

-- 4) RLS: acceso directo SOLO service_role. Público vía RPC.
alter table public.live_class_instances enable row level security;

drop policy if exists rls_live_class_instances__service_full on public.live_class_instances;
create policy rls_live_class_instances__service_full
on public.live_class_instances
as permissive
for all
to service_role
using (true)
with check (true);

-- 5) RPC WRAPPER ÚNICO (público) — SECURITY DEFINER para leer sin exponer columnas sensibles
--    Lógica “próxima fecha”: start_at >= now() y status ∈ (scheduled, open).
--    Respuesta estable y extensible en un sobre JSONB.
create or replace function public.f_webinars_resumen(p_sku text, p_max int default 5)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_tz text := 'America/Mexico_City';
  v_next record;
  v_future jsonb := '[]'::jsonb;
begin
  if p_sku is null or length(trim(p_sku)) = 0 then
    raise exception 'invalid_sku' using detail = 'p_sku is required';
  end if;

  -- Próxima instancia
  select lci.*
  into v_next
  from public.live_class_instances lci
  where lci.sku = p_sku
    and lci.status in ('scheduled','open')
    and lci.start_at is not null
    and lci.start_at >= now()
  order by lci.start_at asc
  limit 1;

  -- Futura(s) instancias (hasta p_max)
  with q as (
    select
      lci.id, lci.sku, lci.instance_slug, lci.status, lci.title,
      lci.start_at, lci.end_at, lci.timezone,
      lci.capacity, lci.seats_sold, lci.metadata,
      lci.created_at, lci.updated_at
    from public.live_class_instances lci
    where lci.sku = p_sku
      and lci.status in ('scheduled','open')
      and lci.start_at is not null
      and lci.start_at >= now()
    order by lci.start_at asc
    limit coalesce(p_max, 5)
  )
  select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) into v_future
  from q;

  return jsonb_build_object(
    'sku', p_sku,
    'generated_at', now(),
    'timezone', v_tz,
    'next_instance',
      case when v_next is null then null else
        jsonb_build_object(
          'id',            v_next.id,
          'sku',           v_next.sku,
          'instance_slug', v_next.instance_slug,
          'status',        v_next.status,
          'title',         v_next.title,
          'start_at',      v_next.start_at,
          'end_at',        v_next.end_at,
          'timezone',      v_next.timezone,
          'capacity',      v_next.capacity,
          'seats_sold',    v_next.seats_sold,
          'metadata',      v_next.metadata,
          'created_at',    v_next.created_at,
          'updated_at',    v_next.updated_at
        )
      end,
    'future_instances', v_future
  );
end;
$$;

-- Permisos de ejecución del wrapper para clientes públicos
grant execute on function public.f_webinars_resumen(text, int) to anon, authenticated;

-- NOTAS:
-- - El wrapper NUNCA expone zoom_join_url ni replay_url.
-- - No creamos RPCs adicionales para evitar complejidad en el cliente.
-- - Si en el futuro se requiere sold_out en el listado, se ajusta aquí sin romper UI.
-- - Los tiempos se devuelven en UTC; 'timezone' informa SITE_TZ para formateo en UI.
-- - Esta migración no altera vistas/JSONC existentes. Control de activación vía FEATURE_WEBINARS_HUB.
-- =====================================================================


-- Update Products table:
-- - Incluir columna page_slug 

-- 1) Columna nullable (no rompe selects actuales)
alter table public.products
  add column if not exists page_slug text;

-- 2) Constraint opcional (slug kebab-case). Se puede relajar quitando NOT VALID.
alter table public.products
  add constraint products_page_slug_format_chk
  check (page_slug is null or page_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
  not valid;

-- 3) Índice único parcial (solo cuando no es null)
create unique index if not exists ux_products_page_slug
  on public.products (page_slug)
  where page_slug is not null;

-- 4) Comentarios (documentación en esquema)
comment on column public.products.page_slug is
  'Slug perenne de la landing del producto. Kebab-case. Único cuando no es NULL.';
comment on constraint products_page_slug_format_chk on public.products is
  'Formato de slug: ^[a-z0-9]+(?:-[a-z0-9]+)*$';

alter table public.products
  drop constraint if exists products_page_slug_format_chk;

alter table public.products
  add constraint products_page_slug_format_chk
  check (
    page_slug is null
    or page_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$'
  )
  not valid;


-- Nota: NO tocamos la vista v_products_public en este paso.
-- El backend leerá page_slug directo de products mientras actualizamos la vista en un paso posterior.




-- SEED PREVIEW:

insert into public.live_class_instances
(sku, instance_slug, status, start_at)
values
('liveclass-lobra-rhd-fin-ingresos-v001', '2025-10-21-2030', 'scheduled', '2025-10-21 20:30:00+00');

insert into public.live_class_instances
(sku, instance_slug, status, start_at)
values
('liveclass-lobra-rhd-fin-egresos-v001', '2025-10-28-2030', 'scheduled', '2025-10-28 20:30:00+00');

insert into public.live_class_instances
(sku, instance_slug, status, start_at)
values
('liveclass-lobra-rhd-fin-reportes-v001', '2025-11-04-2030', 'scheduled', '2025-11-04 20:30:00+00');

insert into public.live_class_instances
(sku, instance_slug, status, start_at)
values
('liveclass-lobra-rhd-fin-planeacion-v001', '2025-11-11-2030', 'scheduled', '2025-11-11 20:30:00+00');


-- Update products. 

-- Actualización de metadata para los 4 webinars financieros
-- Entorno: PREVIEW
-- Archivo sugerido: /supabase/migrations/20251013_update_liveclass_metadata.sql

update public.products
set metadata = jsonb_build_object(
  'sku', sku,
  'fulfillment_type', 'live_class',
  'level', 'basico',
  'topics', array['finanzas'],
  'instructors', array['roberto-huerta'],
  'duration_min', 90,
  'purchasable', true,
  'module_sku', 'course-lobra-rhd-fin-finanzas-v001',
  'is_featured', true,
  'cover', '/images/webinars/2025-10-21-2030/hero.jpg'
)
where sku = 'liveclass-lobra-rhd-fin-ingresos-v001';

update public.products
set metadata = jsonb_build_object(
  'sku', sku,
  'fulfillment_type', 'live_class',
  'level', 'basico',
  'topics', array['finanzas'],
  'instructors', array['roberto-huerta'],
  'duration_min', 90,
  'purchasable', true,
  'module_sku', 'course-lobra-rhd-fin-finanzas-v001',
  'is_featured', false,
  'cover', '/images/webinars/2025-10-28-2030/hero.jpg'
)
where sku = 'liveclass-lobra-rhd-fin-egresos-v001';

update public.products
set metadata = jsonb_build_object(
  'sku', sku,
  'fulfillment_type', 'live_class',
  'level', 'intermedio',
  'topics', array['finanzas'],
  'instructors', array['roberto-huerta'],
  'duration_min', 90,
  'purchasable', true,
  'module_sku', 'course-lobra-rhd-fin-finanzas-v001',
  'is_featured', false,
  'cover', '/images/webinars/2025-11-04-2030/hero.jpg'
)
where sku = 'liveclass-lobra-rhd-fin-reportes-v001';

update public.products
set metadata = jsonb_build_object(
  'sku', sku,
  'fulfillment_type', 'live_class',
  'level', 'avanzado',
  'topics', array['finanzas'],
  'instructors', array['roberto-huerta'],
  'duration_min', 90,
  'purchasable', false,
  'module_sku', 'course-lobra-rhd-fin-finanzas-v001',
  'is_featured', false,
  'cover', '/images/webinars/2025-11-11-2030/hero.jpg'
)
where sku = 'liveclass-lobra-rhd-fin-planeacion-v001';


-- insertar page_slug
-- Reaplicar updates
update public.products
set page_slug = case sku
  when 'liveclass-lobra-rhd-fin-ingresos-v001'   then 'webinars/ingresos'
  when 'liveclass-lobra-rhd-fin-egresos-v001'    then 'webinars/egresos'
  when 'liveclass-lobra-rhd-fin-reportes-v001'   then 'webinars/reportes'
  when 'liveclass-lobra-rhd-fin-planeacion-v001' then 'webinars/planeacion'
  when 'course-lobra-rhd-fin-finanzas-v001'      then 'programas/tranquilidad-financiera'
  when 'one2one-lobra-rhd-030m-v001'             then 'servicios/1a1-rhd'
  else page_slug
end
where sku in (
  'liveclass-lobra-rhd-fin-ingresos-v001',
  'liveclass-lobra-rhd-fin-egresos-v001',
  'liveclass-lobra-rhd-fin-reportes-v001',
  'liveclass-lobra-rhd-fin-planeacion-v001',
  'course-lobra-rhd-fin-finanzas-v001',
  'one2one-lobra-rhd-030m-v001'
);
