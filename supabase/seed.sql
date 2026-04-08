-- =========================================
-- RESET (IDEMPOTENTE)
-- =========================================

TRUNCATE TABLE
bundle_items,
bundles,
live_class_instances,
product_prices,
products
CASCADE;

-- =========================================
-- PRODUCTS
-- =========================================

INSERT INTO public.products (
sku, name, description, status, visibility,
product_type, fulfillment_type, is_subscription,
stripe_product_id, allow_discounts, commissionable,
metadata, created_at, updated_at, page_slug
)
VALUES
('course-lobra-rhd-fin-finanzas-v001','Tranquilidad Financiera','Bundle financiero','active','public','digital','bundle',false,'prod_TCofkc2XPAkMbh',true,false,'{}',now(),now(),'webinars/ms-tranquilidad-financiera'),

('liveclass-lobra-rhd-fin-egresos-v001','Egresos','Clase egresos','active','public','digital','live_class',false,'prod_TCoVKJyjCmGw1C',true,false,'{}',now(),now(),'webinars/w-gastos'),

('liveclass-lobra-rhd-fin-ingresos-v001','Ingresos','Clase ingresos','active','public','digital','live_class',false,'prod_TCoI05wHivveWv',true,false,'{}',now(),now(),'webinars/w-ingresos'),

('liveclass-lobra-rhd-fin-planeacion-v001','Planeación','Clase planeación','active','public','digital','live_class',false,'prod_TCocVuS7NjkQ6p',true,false,'{}',now(),now(),'webinars/w-planeacion'),

('liveclass-lobra-rhd-fin-reportes-v001','Reportes','Clase reportes','active','public','digital','live_class',false,'prod_TCoZfevgJpTIoh',true,false,'{}',now(),now(),'webinars/w-reportes'),

('liveclass-lobra-rhd-ia-comunicacion-v001','IA Comunicación','Clase IA','active','public','digital','live_class',false,'prod_TSGMNq8l0FPjQf',true,false,'{}',now(),now(),'webinars/w-comunicacion-que-vende'),

('one2one-lobra-rhd-030m-v001','1a1 30','Sesión 30','active','public','service','one_to_one',false,'prod_TCojyw1YiET2QK',true,false,'{}',now(),now(),'servicios/1a1-rhd-30'),

('one2one-lobra-rhd-090m-v001','1a1 90','Sesión 90','active','public','service','one_to_one',false,'prod_TR5oVBGGj5tHVp',true,false,'{}',now(),now(),'servicios/1a1-rhd'),

('liveclass-lobra-rhd-fin-freeintro-v001','Clase gratuita','Intro gratuita','active','public','digital','free_class',false,NULL,true,false,'{}',now(),now(),'clases-gratuitas/fin-freeintro');

-- =========================================
-- PRODUCT PRICES
-- =========================================

INSERT INTO public.product_prices (
sku, amount_cents, currency, price_list,
interval, active, stripe_price_id,
metadata, created_at, updated_at
)
VALUES
('course-lobra-rhd-fin-finanzas-v001',319900,'MXN','default','one_time',true,'price_1SVDHpQ8dpmAG0o2DspTWeyt','{}',now(),now()),
('liveclass-lobra-rhd-fin-egresos-v001',69000,'MXN','default','one_time',true,'price_1SGOsrQ8dpmAG0o2YrvR2LV3','{}',now(),now()),
('liveclass-lobra-rhd-fin-ingresos-v001',69000,'MXN','default','one_time',true,'price_1SGOfTQ8dpmAG0o2DWCS0Wdk','{}',now(),now()),
('liveclass-lobra-rhd-fin-planeacion-v001',99000,'MXN','default','one_time',true,'price_1SGOzfQ8dpmAG0o2Y0r2jdBw','{}',now(),now()),
('liveclass-lobra-rhd-fin-reportes-v001',79000,'MXN','default','one_time',true,'price_1SGOvtQ8dpmAG0o2mzvcK5WM','{}',now(),now()),
('liveclass-lobra-rhd-ia-comunicacion-v001',79000,'MXN','default','one_time',true,'price_1SVLpMQ8dpmAG0o2wRoaVv1P','{}',now(),now()),
('one2one-lobra-rhd-030m-v001',149000,'MXN','default','one_time',true,'price_1SGP5lQ8dpmAG0o2ejefOvPG','{}',now(),now()),
('one2one-lobra-rhd-090m-v001',149000,'MXN','default','one_time',true,'price_1SUDcwQ8dpmAG0o2nsVfovBj','{}',now(),now());

-- =========================================
-- BUNDLES
-- =========================================

INSERT INTO public.bundles (bundle_sku)
VALUES
('course-lobra-rhd-fin-finanzas-v001');

-- =========================================
-- BUNDLE ITEMS
-- =========================================

INSERT INTO public.bundle_items (bundle_sku, child_sku)
VALUES
('course-lobra-rhd-fin-finanzas-v001','liveclass-lobra-rhd-fin-ingresos-v001'),
('course-lobra-rhd-fin-finanzas-v001','liveclass-lobra-rhd-fin-egresos-v001'),
('course-lobra-rhd-fin-finanzas-v001','liveclass-lobra-rhd-fin-reportes-v001'),
('course-lobra-rhd-fin-finanzas-v001','liveclass-lobra-rhd-fin-planeacion-v001');

-- =========================================
-- LIVE CLASS INSTANCES (FECHAS DINÁMICAS)
-- =========================================

INSERT INTO public.live_class_instances (
sku, instance_slug, status, start_at, timezone,
capacity, seats_sold, metadata, created_at
)
VALUES
('liveclass-lobra-rhd-fin-egresos-v001','2026-04-15-1930','scheduled',now() + interval '7 days','America/Mexico_City',10,0,'{}',now()),
('liveclass-lobra-rhd-fin-ingresos-v001','2026-04-22-1930','scheduled',now() + interval '14 days','America/Mexico_City',10,0,'{}',now()),
('liveclass-lobra-rhd-fin-reportes-v001','2026-04-29-1930','scheduled',now() + interval '21 days','America/Mexico_City',10,0,'{}',now()),
('liveclass-lobra-rhd-fin-planeacion-v001','2026-05-06-1930','scheduled',now() + interval '28 days','America/Mexico_City',10,0,'{}',now()),
('liveclass-lobra-rhd-ia-comunicacion-v001','2026-05-13-1930','scheduled',now() + interval '35 days','America/Mexico_City',10,0,'{}',now()),
('liveclass-lobra-rhd-fin-freeintro-v001','2026-04-13-1900','open',now() + interval '5 days','America/Mexico_City',50,0,'{}',now());

