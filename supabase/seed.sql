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
  sku,
  name,
  description,
  status,
  visibility,
  product_type,
  fulfillment_type,
  is_subscription,
  stripe_product_id,
  allow_discounts,
  commissionable,
  metadata,
  created_at,
  updated_at,
  page_slug
)
VALUES
(
  'course-lobra-rhd-fin-finanzas-v001',
  '“Tranquilidad Financiera” · Tu reinicio financiero empieza hoy',
  'Este fin de año no hagas solo propósitos: haz cambios reales. Aprende a dominar tu dinero con cuatro workshops prácticos que te devolverán control, tranquilidad y orgullo por lo que logras.',
  'active',
  'public',
  'digital',
  'bundle',
  false,
  'prod_TCofkc2XPAkMbh',
  true,
  false,
  '{
    "sku": "course-lobra-rhd-fin-finanzas-v001",
    "cover": "/images/modulos/finanzas.jpg",
    "bundle_id": "finanzas-v1",
    "is_featured": true,
    "purchasable": true,
    "fulfillment_type": "bundle"
  }'::jsonb,
  now(),
  now(),
  'webinars/ms-tranquilidad-financiera'
),
(
  'liveclass-lobra-rhd-fin-egresos-v001',
  '“Mi dinero, mis reglas”  ·     Controla tus gastos y elimina fugas',
  'Aprende a identificar en qué se va tu dinero, separar lo necesario de lo prescindible y tomar decisiones con calma — sin culpa ni confusión',
  'active',
  'public',
  'digital',
  'live_class',
  false,
  'prod_TCoVKJyjCmGw1C',
  true,
  false,
  '{
    "sku": "liveclass-lobra-rhd-fin-egresos-v001",
    "cover": "/images/webinars/fin/egresos-v001/hub.jpg",
    "level": "Fundamentos",
    "topics": ["Finanzas"],
    "module_sku": "course-lobra-rhd-fin-finanzas-v001",
    "instructors": ["roberto-huerta"],
    "is_featured": false,
    "purchasable": true,
    "duration_min": 90,
    "fulfillment_type": "live_class"
  }'::jsonb,
  now(),
  now(),
  'webinars/w-gastos'
),
(
  'liveclass-lobra-rhd-fin-ingresos-v001',
  '“Mis ingresos, mi claridad”  ·  Ordena tus ventas y cobra con confianza',
  'Aprende a entender de dónde viene tu dinero, registrar tus ingresos con claridad y descubrir qué te deja más ganancia — sin fórmulas ni estrés.',
  'active',
  'public',
  'digital',
  'live_class',
  false,
  'prod_TCoI05wHivveWv',
  true,
  false,
  '{
    "sku": "liveclass-lobra-rhd-fin-ingresos-v001",
    "cover": "/images/webinars/fin/ingresos-v001/hub.jpg",
    "level": "Fundamentos",
    "topics": ["Finanzas"],
    "module_sku": "course-lobra-rhd-fin-finanzas-v001",
    "instructors": ["Roberto-Huerta"],
    "is_featured": false,
    "purchasable": true,
    "duration_min": 90,
    "fulfillment_type": "live_class"
  }'::jsonb,
  now(),
  now(),
  'webinars/w-ingresos'
),
(
  'liveclass-lobra-rhd-fin-planeacion-v001',
  '“Mi futuro, mi decisión”  ·  Diseña un plan semanal simple y efectivo',
  'Aprende a planear tus próximos meses con metas claras, prioridades realistas y estrategias simples para crecer sin perder equilibrio.',
  'active',
  'public',
  'digital',
  'live_class',
  false,
  'prod_TCocVuS7NjkQ6p',
  true,
  false,
  '{
    "sku": "liveclass-lobra-rhd-fin-planeacion-v001",
    "cover": "/images/webinars/fin/planeacion-v001/hub.jpg",
    "level": "Impacto",
    "topics": ["Finanzas"],
    "module_sku": "course-lobra-rhd-fin-finanzas-v001",
    "instructors": ["roberto-huerta"],
    "is_featured": false,
    "purchasable": false,
    "duration_min": 90,
    "fulfillment_type": "live_class"
  }'::jsonb,
  now(),
  now(),
  'webinars/w-planeacion'
),
(
  'liveclass-lobra-rhd-fin-reportes-v001',
  '“Mis números, mi poder”  ·  Convierte tus datos en decisiones claras',
  'Aprende a leer tus reportes, entender tus márgenes y medir el progreso real de tu negocio — claridad total para decidir con seguridad.',
  'active',
  'public',
  'digital',
  'live_class',
  false,
  'prod_TCoZfevgJpTIoh',
  true,
  false,
  '{
    "sku": "liveclass-lobra-rhd-fin-reportes-v001",
    "cover": "/images/webinars/fin/reportes-v001/hub.jpg",
    "level": "Profundización",
    "topics": ["Finanzas"],
    "module_sku": "course-lobra-rhd-fin-finanzas-v001",
    "instructors": ["roberto-huerta"],
    "is_featured": false,
    "purchasable": true,
    "duration_min": 90,
    "fulfillment_type": "live_class"
  }'::jsonb,
  now(),
  now(),
  'webinars/w-reportes'
),
(
  'liveclass-lobra-rhd-ia-comunicacion-v001',
  '“Comunicación que vende con IA” · Mensajes claros para convertir mejor en WhatsApp',
  'Webinar práctico de 90 minutos para responder mejor en WhatsApp, corregir un mensaje real y usar plantillas simples para convertir más sin complicarte.',
  'active',
  'public',
  'digital',
  'live_class',
  false,
  'prod_TSGMNq8l0FPjQf',
  true,
  false,
  '{
    "sku": "liveclass-lobra-rhd-ia-comunicacion-v001",
    "cover": "/images/webinars/ia/comunicacion-v001/hub.jpg",
    "level": "Fundamentos",
    "topics": ["Comunicación", "Ventas", "IA"],
    "module_sku": null,
    "instructors": ["roberto-huerta"],
    "is_featured": false,
    "purchasable": true,
    "duration_min": 90,
    "fulfillment_type": "live_class"
  }'::jsonb,
  now(),
  now(),
  'webinars/w-comunicacion-que-vende'
),
(
  'one2one-lobra-rhd-030m-v001',
  '“Sesión de claridad”  ·  Ajusta tu estrategia con guía personalizada',
  'Una sesión individual en la que resolverás tu duda principal y definirás un plan de acción inmediato.',
  'active',
  'public',
  'service',
  'one_to_one',
  false,
  'prod_TCojyw1YiET2QK',
  true,
  false,
  '{
    "sku": "one2one-lobra-rhd-030m-v001",
    "cover": "/images/asesorias/default-1a1.jpg",
    "fulfillment_type": "one_to_one"
  }'::jsonb,
  now(),
  now(),
  'servicios/1a1-rhd-30'
),
(
  'one2one-lobra-rhd-090m-v001',
  '“Sesión de claridad” · Ajusta tu estrategia con guía personalizada',
  'Una sesión individual en la que resolverás tu duda principal y definirás un plan de acción inmediato.',
  'active',
  'public',
  'service',
  'one_to_one',
  false,
  'prod_TR5oVBGGj5tHVp',
  true,
  false,
  '{
    "sku": "one2one-lobra-rhd-090m-v001",
    "cover": "/images/asesorias/default-1a1.jpg",
    "fulfillment_type": "one_to_one"
  }'::jsonb,
  now(),
  now(),
  'servicios/1a1-rhd'
),
(
  'liveclass-lobra-rhd-fin-freeintro-v001',
  'Clase gratuita · Mapa de claridad financiera',
  'Clase gratuita introductoria al módulo Tranquilidad Financiera de LOBRÁ; en 45 minutos ves el sistema en 4 pasos para ordenar ingresos, gastos, reportes y planeación.',
  'active',
  'public',
  'digital',
  'free_class',
  false,
  NULL,
  true,
  false,
  '{
    "sku": "liveclass-lobra-rhd-fin-freeintro-v001",
    "cover": "/images/webinars/fin/freeintro-v001/hub.jpg",
    "level": "Fundamentos",
    "topics": ["Finanzas"],
    "module_sku": "course-lobra-rhd-fin-finanzas-v001",
    "instructors": ["Roberto-Huerta"],
    "is_featured": false,
    "purchasable": false,
    "duration_min": 45,
    "fulfillment_type": "free_class"
  }'::jsonb,
  now(),
  now(),
  'clases-gratuitas/fin-freeintro'
);
-- =========================================
-- PRODUCT PRICES
-- =========================================

INSERT INTO public.product_prices (
  sku,
  amount_cents,
  currency,
  price_list,
  interval,
  valid_from,
  active,
  stripe_price_id,
  metadata,
  created_at,
  updated_at
)
VALUES
(
  'course-lobra-rhd-fin-finanzas-v001',
  319900,
  'MXN',
  'default',
  'one_time',
  '2026-04-01 00:00:00+00',
  true,
  'price_1SVDHpQ8dpmAG0o2DspTWeyt',
  '{
    "sku": "course-lobra-rhd-fin-finanzas-v001",
    "bundle_id": "finanzas-v1",
    "fulfillment_type": "bundle"
  }'::jsonb,
  now(),
  now()
),
(
  'liveclass-lobra-rhd-fin-egresos-v001',
  69000,
  'MXN',
  'default',
  'one_time',
  '2026-04-01 00:00:00+00',
  true,
  'price_1SGOsrQ8dpmAG0o2YrvR2LV3',
  '{
    "sku": "liveclass-lobra-rhd-fin-egresos-v001",
    "fulfillment_type": "live_class"
  }'::jsonb,
  now(),
  now()
),
(
  'liveclass-lobra-rhd-fin-ingresos-v001',
  69000,
  'MXN',
  'default',
  'one_time',
  '2026-04-01 00:00:00+00',
  true,
  'price_1SGOfTQ8dpmAG0o2DWCS0Wdk',
  '{
    "sku": "liveclass-lobra-rhd-fin-ingresos-v001",
    "fulfillment_type": "live_class"
  }'::jsonb,
  now(),
  now()
),
(
  'liveclass-lobra-rhd-fin-planeacion-v001',
  99000,
  'MXN',
  'default',
  'one_time',
  '2026-04-01 00:00:00+00',
  true,
  'price_1SGOzfQ8dpmAG0o2Y0r2jdBw',
  '{
    "sku": "liveclass-lobra-rhd-fin-planeacion-v001",
    "fulfillment_type": "live_class"
  }'::jsonb,
  now(),
  now()
),
(
  'liveclass-lobra-rhd-fin-reportes-v001',
  79000,
  'MXN',
  'default',
  'one_time',
  '2026-04-01 00:00:00+00',
  true,
  'price_1SGOvtQ8dpmAG0o2mzvcK5WM',
  '{
    "sku": "liveclass-lobra-rhd-fin-reportes-v001",
    "fulfillment_type": "live_class"
  }'::jsonb,
  now(),
  now()
),
(
  'liveclass-lobra-rhd-ia-comunicacion-v001',
  79000,
  'MXN',
  'default',
  'one_time',
  '2026-04-01 00:00:00+00',
  true,
  'price_1SVLpMQ8dpmAG0o2wRoaVv1P',
  '{
    "sku": "liveclass-lobra-rhd-ia-comunicacion-v001",
    "fulfillment_type": "live_class"
  }'::jsonb,
  now(),
  now()
),
(
  'one2one-lobra-rhd-030m-v001',
  149000,
  'MXN',
  'default',
  'one_time',
  '2026-04-01 00:00:00+00',
  true,
  'price_1SGP5lQ8dpmAG0o2ejefOvPG',
  '{
    "sku": "one2one-lobra-rhd-030m-v001",
    "fulfillment_type": "one_to_one"
  }'::jsonb,
  now(),
  now()
),
(
  'one2one-lobra-rhd-090m-v001',
  149000,
  'MXN',
  'default',
  'one_time',
  '2026-04-01 00:00:00+00',
  true,
  'price_1SUDcwQ8dpmAG0o2nsVfovBj',
  '{
    "sku": "one2one-lobra-rhd-090m-v001",
    "fulfillment_type": "one_to_one"
  }'::jsonb,
  now(),
  now()
);

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

WITH base AS (
  SELECT
    CASE
      WHEN (
        date_trunc('day', now() AT TIME ZONE 'America/Mexico_City')
        + (((2 - extract(isodow FROM now() AT TIME ZONE 'America/Mexico_City')::int + 7) % 7) || ' days')::interval
        + time '19:30:00'
      ) <= (now() AT TIME ZONE 'America/Mexico_City')
      THEN (
        date_trunc('day', now() AT TIME ZONE 'America/Mexico_City')
        + (((2 - extract(isodow FROM now() AT TIME ZONE 'America/Mexico_City')::int + 7) % 7) || ' days')::interval
        + time '19:30:00'
        + interval '7 days'
      ) AT TIME ZONE 'America/Mexico_City'
      ELSE (
        date_trunc('day', now() AT TIME ZONE 'America/Mexico_City')
        + (((2 - extract(isodow FROM now() AT TIME ZONE 'America/Mexico_City')::int + 7) % 7) || ' days')::interval
        + time '19:30:00'
      ) AT TIME ZONE 'America/Mexico_City'
    END AS martes_base
),
calendario AS (
  SELECT
    'liveclass-lobra-rhd-fin-egresos-v001'::text AS sku,
    'scheduled'::text AS status,
    NULL::text AS title,
    martes_base AS start_at,
    NULL::timestamptz AS end_at,
    10::int AS capacity,
    '{}'::jsonb AS metadata
  FROM base

  UNION ALL

  SELECT
    'liveclass-lobra-rhd-fin-ingresos-v001',
    'scheduled',
    NULL,
    martes_base + interval '7 days',
    NULL,
    10,
    '{}'::jsonb
  FROM base

  UNION ALL

  SELECT
    'liveclass-lobra-rhd-fin-reportes-v001',
    'scheduled',
    NULL,
    martes_base + interval '14 days',
    NULL,
    10,
    '{}'::jsonb
  FROM base

  UNION ALL

  SELECT
    'liveclass-lobra-rhd-fin-planeacion-v001',
    'scheduled',
    NULL,
    martes_base + interval '21 days',
    NULL,
    10,
    '{}'::jsonb
  FROM base

  UNION ALL

  SELECT
    'liveclass-lobra-rhd-ia-comunicacion-v001',
    'scheduled',
    NULL,
    martes_base + interval '28 days',
    NULL,
    10,
    '{}'::jsonb
  FROM base

  UNION ALL

  SELECT
    'liveclass-lobra-rhd-fin-freeintro-v001',
    'open',
    'Clase gratuita · Mapa de claridad financiera',
    martes_base - interval '2 days' - interval '30 minutes',
    (martes_base - interval '2 days' - interval '30 minutes') + interval '45 minutes',
    50,
    '{
      "type": "free_class",
      "landingSlug": "fin-freeintro",
      "waitlistEnabled": true
    }'::jsonb
  FROM base
)
INSERT INTO public.live_class_instances (
  sku,
  instance_slug,
  status,
  title,
  start_at,
  end_at,
  timezone,
  capacity,
  seats_sold,
  metadata,
  created_at,
  updated_at
)
SELECT
  sku,
  to_char(start_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD-HH24MI'),
  status,
  title,
  start_at,
  end_at,
  'America/Mexico_City',
  capacity,
  0,
  metadata,
  now(),
  now()
FROM calendario;