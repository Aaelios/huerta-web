-- migration_prod.sql — RPCs Bundles & Entitlements v1.0.0
-- Objetivo: crear/actualizar RPCs en PRODUCCIÓN con seguridad y contratos estables.
-- Notas:
--  - Owner: rol técnico sin login (p.ej. postgres/svc_owner).
--  - SECURITY DEFINER + STABLE + search_path fijo.
--  - Grants de EXECUTE a anon|authenticated|service_role.
--  - Estados válidos en instancias: scheduled|open. Hijos no-live_class → next_start_at:null.
--  - Índices recomendados: bundle_items(bundle_sku, child_sku), live_class_instances(sku, start_at), entitlements(user_id, sku).

-------------------------------
-- CORE: f_bundle_schedule
-------------------------------
create or replace function public.f_bundle_schedule(bundle_sku text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
with
  children as (
    select bi.child_sku
    from public.bundle_items bi
    where bi.bundle_sku = f_bundle_schedule.bundle_sku
  ),
  nexts as (
    select
      c.child_sku,
      min(lci.start_at) filter (
        where lci.status in ('scheduled','open')
          and lci.start_at > now()
      ) as next_start_at
    from children c
    left join public.live_class_instances lci
      on lci.sku = c.child_sku
    group by c.child_sku
  ),
  agg as (
    select min(n.next_start_at) as next_start_at
    from nexts n
    where n.next_start_at is not null
  ),
  children_json as (
    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'child_sku', n.child_sku,
            'next_start_at', to_jsonb(n.next_start_at)
          )
          order by n.child_sku
        ),
        '[]'::jsonb
      ) as data
    from nexts n
  )
select jsonb_build_object(
  'bundle_sku', f_bundle_schedule.bundle_sku,
  'next_start_at', to_jsonb(a.next_start_at),
  'children', c.data
)
from agg a, children_json c;
$$;

comment on function public.f_bundle_schedule(text) is
'Returns {"bundle_sku","next_start_at","children":[{"child_sku","next_start_at"}]}. next_start_at = min future start among live_class children (status scheduled|open; start_at>now()). Non-live_class children return next_start_at=null.';

grant execute on function public.f_bundle_schedule(text) to anon, authenticated, service_role;

-----------------------------------------
-- WRAPPER: f_bundle_next_start_at
-----------------------------------------
create or replace function public.f_bundle_next_start_at(bundle_sku text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
select jsonb_build_object(
  'bundle_sku', f_bundle_next_start_at.bundle_sku,
  'next_start_at', f_bundle_schedule(f_bundle_next_start_at.bundle_sku)->'next_start_at'
);
$$;

comment on function public.f_bundle_next_start_at(text) is
'Wrapper over f_bundle_schedule: returns {"bundle_sku","next_start_at"} only.';

grant execute on function public.f_bundle_next_start_at(text) to anon, authenticated, service_role;

-----------------------------------------------
-- WRAPPER: f_bundle_children_next_start
-----------------------------------------------
create or replace function public.f_bundle_children_next_start(bundle_sku text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
select coalesce(
  f_bundle_schedule(f_bundle_children_next_start.bundle_sku)->'children',
  '[]'::jsonb
);
$$;

comment on function public.f_bundle_children_next_start(text) is
'Wrapper over f_bundle_schedule: returns only the children array [{"child_sku","next_start_at"}].';

grant execute on function public.f_bundle_children_next_start(text) to anon, authenticated, service_role;

---------------------------------------------------
-- ACCESS: f_entitlement_has_email (boolean JSON)
---------------------------------------------------
create or replace function public.f_entitlement_has_email(p_email text, p_sku text)
returns jsonb
language sql
security definer
set search_path = public, auth
stable
as $$
with u as (
  select id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1
)
select jsonb_build_object(
  'has',
  exists (
    select 1
    from u
    join public.v_entitlements_active vea
      on vea.user_id = u.id
    where vea.sku = p_sku
      and coalesce(vea.active, true) = true
  )
);
$$;

comment on function public.f_entitlement_has_email(text, text) is
'Returns {"has":true|false} if the email has an active entitlement for the sku via v_entitlements_active. Case-insensitive email match.';

grant execute on function public.f_entitlement_has_email(text, text) to anon, authenticated, service_role;

---------------------------------------------------
-- (Opcional) Verificación rápida post-deploy
---------------------------------------------------
-- SELECT public.f_bundle_schedule('course-lobra-rhd-fin-finanzas-v001');
-- SELECT public.f_bundle_next_start_at('course-lobra-rhd-fin-finanzas-v001');
-- SELECT public.f_bundle_children_next_start('course-lobra-rhd-fin-finanzas-v001');
-- SELECT public.f_entitlement_has_email('rhuerta@gmail.com','liveclass-lobra-rhd-fin-ingresos-v001');

---------------------------------------------------
-- (Opcional) Fingerprint + permisos en PROD
---------------------------------------------------
-- with funcs as (
--   select p.oid, n.nspname as schema, p.proname as name, pg_get_functiondef(p.oid) as src
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname='public' and p.proname in
--   ('f_bundle_schedule','f_bundle_next_start_at','f_bundle_children_next_start','f_entitlement_has_email')
-- )
-- select schema,name,encode(digest(src,'sha256'),'hex') as sha256_fingerprint,
--        has_function_privilege('anon',oid,'EXECUTE')  as exec_anon,
--        has_function_privilege('authenticated',oid,'EXECUTE') as exec_auth,
--        has_function_privilege('service_role',oid,'EXECUTE')  as exec_service
-- from funcs order by name;
