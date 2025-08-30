-- Vista auxiliar: precios activos y vigentes
create or replace view public.v_prices_vigente as
select *
from public.product_prices pp
where pp.active = true
  and (pp.valid_from is null or pp.valid_from <= now())
  and (pp.valid_until is null or now() < pp.valid_until);

-- 1) SKUs inválidos vs regex estándar
select sku from public.products
where sku !~ '^[a-z0-9-]+-v[0-9]{3}$';

-- 2) Productos activos SIN precio vigente
select p.sku
from public.products p
left join public.v_prices_vigente v on v.sku = p.sku
where p.status = 'active'
group by p.sku
having count(v.sku) = 0;

-- 3a) Duplicados exactos en precios (clave lógica)
select sku, currency, price_list, interval, count(*) c
from public.product_prices
group by 1,2,3,4
having count(*) > 1;

-- 3b) Solapamiento de vigencias en la misma clave lógica
select a.sku, a.currency, a.price_list, a.interval, a.id as id_a, b.id as id_b
from public.product_prices a
join public.product_prices b
  on a.sku=b.sku and a.currency=b.currency and a.price_list=b.price_list and a.interval=b.interval
 and a.id < b.id
 and coalesce(a.valid_from, '-infinity'::timestamptz) < coalesce(b.valid_until, 'infinity'::timestamptz)
 and coalesce(b.valid_from, '-infinity'::timestamptz) < coalesce(a.valid_until, 'infinity'::timestamptz);

-- 3c) Vigencias mal formadas
select * from public.product_prices
where valid_from is not null and valid_until is not null and valid_until < valid_from;

-- 4) Valores inválidos en precios
select * from public.product_prices where currency not in ('MXN','USD');
select * from public.product_prices where amount_cents <= 0;
select * from public.product_prices where interval not in ('one_time','month','year');

-- 4b) Cobertura por moneda faltante (productos activos)
with mx as (select distinct sku from public.v_prices_vigente where currency='MXN'),
     us as (select distinct sku from public.v_prices_vigente where currency='USD')
select p.sku,
       case when mx.sku is null then 'MISSING_MXN' end as mxn_missing,
       case when us.sku is null then 'MISSING_USD' end as usd_missing
from public.products p
left join mx on mx.sku=p.sku
left join us on us.sku=p.sku
where p.status='active' and (mx.sku is null or us.sku is null);

-- 5) Bundles sin items / items con hijo inexistente o inactivo
select b.bundle_sku
from public.bundles b
left join public.bundle_items bi on bi.bundle_sku=b.bundle_sku
group by b.bundle_sku having count(bi.child_sku)=0;

select bi.*
from public.bundle_items bi
left join public.products p on p.sku=bi.child_sku
where p.sku is null or p.status <> 'active';

-- 6) Consistencia bundle (producto ↔ tabla bundles)
select p.sku
from public.products p
where p.fulfillment_type='bundle'
  and not exists (select 1 from public.bundles b where b.bundle_sku=p.sku);

select b.bundle_sku
from public.bundles b
where not exists (select 1 from public.products p where p.sku=b.bundle_sku and p.fulfillment_type='bundle');

-- 7a) Órdenes sin items
select oh.id, oh.order_number
from public.order_headers oh
left join public.order_items oi on oi.order_id=oh.id
group by oh.id, oh.order_number
having count(oi.order_id)=0;

-- 7b) Totales que no cuadran
select oh.id, oh.order_number, oh.total_cents,
       sum(oi.amount_cents * oi.quantity) as items_total
from public.order_headers oh
join public.order_items oi on oi.order_id=oh.id
group by oh.id, oh.order_number, oh.total_cents
having oh.total_cents <> sum(oi.amount_cents * oi.quantity);

-- 8) Items con SKU desconocido
select oi.*
from public.order_items oi
left join public.products p on p.sku=oi.sku
where p.sku is null;

-- 9a) Eventos mínimos por orden (created y paid)
select oh.id, oh.order_number
from public.order_headers oh
where not exists (select 1 from public.order_events e where e.order_id=oh.id and e.type='created')
   or not exists (select 1 from public.order_events e where e.order_id=oh.id and e.type='paid');

-- 9b) Tipos de eventos inválidos
select * from public.order_events
where type not in ('created','paid','fulfilled','scheduled','refunded','canceled');

-- 10a) Entitlements duplicados activos
select user_id, sku, count(*) c
from public.entitlements
where active = true and revoked_at is null
group by user_id, sku
having count(*) > 1;

-- 10b) Entitlements con SKU inexistente
select e.*
from public.entitlements e
left join public.products p on p.sku=e.sku
where p.sku is null;

-- 11) Entitlements vencidos pero activos
select *
from public.entitlements
where active = true and revoked_at is null
  and valid_until is not null and valid_until < now();

-- 12) Gating: valores inválidos en tiers
select sku, metadata->>'min_tier' as min_tier
from public.products
where fulfillment_type in ('course','template','live_class')
  and metadata ? 'min_tier'
  and (metadata->>'min_tier') not in ('base','plus','premium');

select sku, metadata->>'tier' as tier
from public.products
where fulfillment_type='subscription_grant'
  and (metadata->>'tier') not in ('base','plus','premium');

-- 13) Consistencia interval vs fulfillment_type
select pp.*
from public.product_prices pp
join public.products p on p.sku=pp.sku
where p.fulfillment_type='subscription_grant' and pp.interval <> 'month';

select pp.*
from public.product_prices pp
join public.products p on p.sku=pp.sku
where p.fulfillment_type <> 'subscription_grant' and pp.interval <> 'one_time';

-- 14) Claves Stripe únicas (no nulas)
select stripe_session_id, count(*) c
from public.order_headers
where stripe_session_id is not null
group by 1 having count(*)>1;

select stripe_invoice_id, count(*) c
from public.order_headers
where stripe_invoice_id is not null
group by 1 having count(*)>1;

select stripe_payment_intent_id, count(*) c
from public.order_headers
where stripe_payment_intent_id is not null
group by 1 having count(*)>1;
