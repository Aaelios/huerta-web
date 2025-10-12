# Stripe Live Map — v1.0.0  
Catálogo validado E2E en Stripe Test y clonado a Live el 10-oct-2025.  
Webhook Live activo en `https://lobra.net/api/stripe/webhooks`.

| Tipo | Nombre | SKU | fulfillment_type | product_id_test | price_id_test | product_id_live | price_id_live | webhook_id_live |
|------|---------|-----|------------------|-----------------|----------------|-----------------|----------------|-----------------|
| live_class | Workshop “Domina tus Ingresos” · Estrategias para cobrar mejor y vender con claridad | liveclass-lobra-rhd-fin-ingresos-v001 | live_class | prod_TCoI05wHivveWv | price_1SGOfTQ8dpmAG0o2DWCS0Wdk | prod_TCv0ynYNfERx2v | price_1SGVARLU78hTsaOctJCLnx3F | whsec_… |
| live_class | Workshop “Controla tus Egresos” · Aprende a reducir fugas sin vivir limitado | liveclass-lobra-rhd-fin-egresos-v001 | live_class | prod_TCoVKJyjCmGw1C | price_1SGOsrQ8dpmAG0o2YrvR2LV3 | prod_TCv0MNcMQjgykg | price_1SGVAPLU78hTsaOcQJUoA1dN | whsec_… |
| live_class | Workshop “Entiende tus Números” · Crea tu tablero de rentabilidad en tiempo real | liveclass-lobra-rhd-fin-reportes-v001 | live_class | prod_TCoZfevgJpTIoh | price_1SGOvtQ8dpmAG0o2mzvcK5WM | prod_TCv09RH3MuODdZ | price_1SGVANLU78hTsaOcRy9kidQs | whsec_… |
| live_class | Workshop “Planea tu 2025” · Convierte tus finanzas en decisiones claras | liveclass-lobra-rhd-fin-planeacion-v001 | live_class | prod_TCocVuS7NjkQ6p | price_1SGOzfQ8dpmAG0o2Y0r2jdBw | prod_TCv0fYKTBbsgrk | price_1SGVALLU78hTsaOcqCOTfB6H | whsec_… |
| bundle | Programa “Tranquilidad Financiera” · 4 Workshops + 1 sesión personalizada | course-lobra-rhd-fin-finanzas-v001 | bundle | prod_TCofkc2XPAkMbh | price_1SGP2ZQ8dpmAG0o2MtLjhMq1 | prod_TCv0qNgWO0zSqf | price_1SGVAJLU78hTsaOciH5BZagO | whsec_… |
| one_to_one | Asesoría 1:1 “Sesión de Claridad” · 30 min para resolver tu mayor duda de negocio | one2one-lobra-rhd-030m-v001 | one_to_one | prod_TCojyw1YiET2QK | price_1SGP5lQ8dpmAG0o2ejefOvPG | prod_TCv0LPzygw9e5S | price_1SGVABLU78hTsaOcWCSrv3As | whsec_… |

---

### Notas técnicas
- `planeación`: product activo/public, price inactivo (solo concedido vía bundle).  
- `bundle` concede 5 entitlements (4 workshops + 1 sesión 1:1).  
- Todos los precios `one_time` en MXN.  
- `whsec_…` corresponde al `STRIPE_WEBHOOK_SECRET` en `.env.production`.

---

Bloque SQL para verificación y documentación.
Puedes guardarlo como `verify_stripe_links.sql` en `/docs/sql/` o ejecutarlo en Supabase SQL Editor tras cada cambio de catálogo.

---

```sql
-- ===========================================
-- Verify Stripe ↔ Supabase Link Consistency
-- Version: v1.0.0 (Live)
-- ===========================================

-- 1. Verifica que todos los SKUs tengan IDs Stripe Test y Live
SELECT
  p.sku,
  p.fulfillment_type,
  p.stripe_product_id AS product_id_live,
  pp.stripe_price_id AS price_id_live,
  pp.currency,
  pp.amount_cents,
  pp.active
FROM public.products p
JOIN public.product_prices pp USING (sku)
WHERE p.sku IN (
  'liveclass-lobra-rhd-fin-ingresos-v001',
  'liveclass-lobra-rhd-fin-egresos-v001',
  'liveclass-lobra-rhd-fin-reportes-v001',
  'liveclass-lobra-rhd-fin-planeacion-v001',
  'course-lobra-rhd-fin-finanzas-v001',
  'one2one-lobra-rhd-030m-v001'
)
ORDER BY p.sku;

-- 2. Verifica integridad del bundle (padre-hijos)
SELECT
  bi.bundle_sku,
  bi.child_sku,
  p.fulfillment_type,
  p.status,
  p.visibility
FROM public.bundle_items bi
JOIN public.products p ON p.sku = bi.child_sku
WHERE bi.bundle_sku = 'course-lobra-rhd-fin-finanzas-v001'
ORDER BY bi.child_sku;

-- 3. Vista de control de precios activos
SELECT
  sku,
  amount_cents,
  currency,
  interval,
  active,
  created_at
FROM public.v_prices_vigente
ORDER BY sku;

-- 4. Validar políticas RLS vigentes para stripe access
SELECT
  policy_name,
  roles,
  command,
  using_expr,
  with_check
FROM pg_policies
WHERE tablename IN ('products','product_prices');
```

---

🧾 **Resultado esperado:**

* Todas las filas muestran `stripe_product_id` y `stripe_price_id` (Live).
* Bundle incluye 5 hijos.
* Solo `planeación` aparece con `active=false`.
* Políticas RLS: `service_role` ALL / `anon, authenticated` SELECT.
