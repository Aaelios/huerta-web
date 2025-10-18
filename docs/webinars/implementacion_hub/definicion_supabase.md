-- PROD — Webinars Hub v1 · DDL tabla + RLS + page_slug (products)
-- Requiere: public.f_audit_set_updated_at() existente

-- 1) Tabla base
create table if not exists public.live_class_instances (
  id               uuid primary key default gen_random_uuid(),
  sku              text not null,
  instance_slug    text not null,
  status           text not null,
  title            text,
  start_at         timestamptz,
  end_at           timestamptz,
  timezone         text not null default 'America/Mexico_City',
  capacity         integer default 10,
  seats_sold       integer not null default 0,
  zoom_join_url    text,
  replay_url       text,
  metadata         jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
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

-- 2) Índices
create unique index if not exists ux_live_class_instances__sku_slug
  on public.live_class_instances (sku, instance_slug);

create index if not exists idx_live_class_instances__sku_start_at_desc
  on public.live_class_instances (sku, start_at desc);

create index if not exists idx_live_class_instances__status
  on public.live_class_instances (status);

-- 3) Trigger updated_at
drop trigger if exists trg_live_class_instances__updated_at on public.live_class_instances;
create trigger trg_live_class_instances__updated_at
before update on public.live_class_instances
for each row execute function public.f_audit_set_updated_at();

-- 4) RLS
alter table public.live_class_instances enable row level security;

drop policy if exists rls_live_class_instances__service_full on public.live_class_instances;
create policy rls_live_class_instances__service_full
on public.live_class_instances
as permissive
for all
to service_role
using (true)
with check (true);

-- 5) products.page_slug (necesario para Webinars Hub)
alter table public.products
  add column if not exists page_slug text;

-- formato slug o rutas tipo 'webinars/ingresos'
alter table public.products
  drop constraint if exists products_page_slug_format_chk;

alter table public.products
  add constraint products_page_slug_format_chk
  check (
    page_slug is null
    or page_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$'
  )
  not valid;

create unique index if not exists ux_products_page_slug
  on public.products (page_slug)
  where page_slug is not null;

comment on column public.products.page_slug is
  'Slug o ruta perenne de la landing del producto. Único cuando no es NULL.';
comment on constraint products_page_slug_format_chk on public.products is
  'Formato permitido: kebab-case y rutas con "/" en segmentos.';


-- PROD - Definicion de RPC

CREATE OR REPLACE FUNCTION public.f_webinars_resumen(p_sku text, p_max integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$




-- PROD — Webinars Hub v1 · Master data products (paridad con PREVIEW)
begin;

-- Programa / bundle
update public.products
set metadata = '{
  "sku":"course-lobra-rhd-fin-finanzas-v001",
  "cover":"/images/modulos/finanzas.jpg",
  "bundle_id":"finanzas-v1",
  "fulfillment_type":"bundle"
}'::jsonb,
    page_slug = 'programas/tranquilidad-financiera'
where sku = 'course-lobra-rhd-fin-finanzas-v001';

-- Live class · Ingresos
update public.products
set metadata = '{
  "sku":"liveclass-lobra-rhd-fin-ingresos-v001",
  "cover":"/images/webinars/fin/ingresos-v001/hub.jpg",
  "level":"basico",
  "topics":["finanzas"],
  "module_sku":"course-lobra-rhd-fin-finanzas-v001",
  "instructors":["roberto-huerta"],
  "is_featured":false,
  "purchasable":true,
  "duration_min":90,
  "fulfillment_type":"live_class"
}'::jsonb,
    page_slug = 'webinars/ingresos'
where sku = 'liveclass-lobra-rhd-fin-ingresos-v001';

-- Live class · Egresos
update public.products
set metadata = '{
  "sku":"liveclass-lobra-rhd-fin-egresos-v001",
  "cover":"/images/webinars/fin/egresos-v001/hub.jpg",
  "level":"basico",
  "topics":["finanzas"],
  "module_sku":"course-lobra-rhd-fin-finanzas-v001",
  "instructors":["roberto-huerta"],
  "is_featured":false,
  "purchasable":true,
  "duration_min":90,
  "fulfillment_type":"live_class"
}'::jsonb,
    page_slug = 'webinars/egresos'
where sku = 'liveclass-lobra-rhd-fin-egresos-v001';

-- Live class · Reportes/KPIs
update public.products
set metadata = '{
  "sku":"liveclass-lobra-rhd-fin-reportes-v001",
  "cover":"/images/webinars/fin/reportes-v001/hub.jpg",
  "level":"intermedio",
  "topics":["finanzas"],
  "module_sku":"course-lobra-rhd-fin-finanzas-v001",
  "instructors":["roberto-huerta"],
  "is_featured":false,
  "purchasable":true,
  "duration_min":90,
  "fulfillment_type":"live_class"
}'::jsonb,
    page_slug = 'webinars/reportes'
where sku = 'liveclass-lobra-rhd-fin-reportes-v001';

-- Live class · Planeación
update public.products
set metadata = '{
  "sku":"liveclass-lobra-rhd-fin-planeacion-v001",
  "cover":"/images/webinars/fin/planeacion-v001/hub.jpg",
  "level":"avanzado",
  "topics":["finanzas"],
  "module_sku":"course-lobra-rhd-fin-finanzas-v001",
  "instructors":["roberto-huerta"],
  "is_featured":true,
  "purchasable":true,
  "duration_min":90,
  "fulfillment_type":"live_class"
}'::jsonb,
    page_slug = 'webinars/planeacion'
where sku = 'liveclass-lobra-rhd-fin-planeacion-v001';

-- One-to-one 30m
update public.products
set metadata = '{
  "sku":"one2one-lobra-rhd-030m-v001",
  "fulfillment_type":"one_to_one"
}'::jsonb,
    page_slug = 'servicios/1a1-rhd'
where sku = 'one2one-lobra-rhd-030m-v001';

commit;

-- Verificación
select sku, page_slug,
       metadata->>'fulfillment_type' as fulfillment_type,
       metadata->>'level' as level,
       metadata->>'module_sku' as module_sku,
       metadata->>'cover' as cover,
       (metadata->'topics')::text as topics,
       (metadata->>'purchasable')::boolean as purchasable,
       (metadata->>'is_featured')::boolean as is_featured
from public.products
where sku in (
  'course-lobra-rhd-fin-finanzas-v001',
  'liveclass-lobra-rhd-fin-ingresos-v001',
  'liveclass-lobra-rhd-fin-egresos-v001',
  'liveclass-lobra-rhd-fin-reportes-v001',
  'liveclass-lobra-rhd-fin-planeacion-v001',
  'one2one-lobra-rhd-030m-v001'
)
order by sku;

-- PROD — Webinars Hub v1 · Seeds live_class_instances (UPSERT)
begin;

insert into public.live_class_instances
  (sku, instance_slug, status, start_at, timezone)
values
  ('liveclass-lobra-rhd-fin-ingresos-v001',   '2025-10-28-2030', 'scheduled', '2025-10-29 02:30:00+00', 'America/Mexico_City'),
  ('liveclass-lobra-rhd-fin-egresos-v001',    '2025-11-04-2030', 'scheduled', '2025-11-05 02:30:00+00', 'America/Mexico_City'),
  ('liveclass-lobra-rhd-fin-reportes-v001',   '2025-11-11-2030', 'scheduled', '2025-11-12 02:30:00+00', 'America/Mexico_City'),
  ('liveclass-lobra-rhd-fin-planeacion-v001', '2025-11-18-2030', 'scheduled', '2025-11-19 02:30:00+00', 'America/Mexico_City')
on conflict (sku, instance_slug) do update
set status   = excluded.status,
    start_at = excluded.start_at,
    timezone = excluded.timezone;

commit;

-- Verificación
select sku, instance_slug, status, start_at, timezone
from public.live_class_instances
order by sku, start_at;

