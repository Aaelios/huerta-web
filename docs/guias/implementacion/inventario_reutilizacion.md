CT-02.01 — Inventario de Reutilización Supabase

1. Contexto del Padre
- Supabase es fuente de verdad operativa
- Stripe es fuente de cobro
- JSON queda solo como capa editorial temporal
- SKU es llave del sistema
- Catálogo, detalle y checkout no deben depender de RPC
- CT-01 definió contrato operativo base

2. Alcance del Hijo
Análisis de reutilización para consumo de catálogo en:
- /webinars (hub)
- /webinars/[slug] (detalle)
- /checkout/[slug]
- prelobby

3. Piezas reutilizables identificadas

Reutilizar tal cual:
- app/webinars/page.tsx
- app/api/webinars/search/route.ts
- src/server/modules/webinars/m_catalogo

Reutilizar con adapter:
- lib/webinars/load.ts (getWebinar)
- lib/webinars/getWebinarBySku.ts
- app/webinars/[slug]/page.tsx
- app/checkout/[slug]/page.tsx
- app/webinars/[slug]/prelobby/page.tsx
- lib/ui_checkout/buildCheckoutUI.ts
- lib/postpurchase/resolveNextStep.ts

No reutilizar como fuente operativa:
- lib/webinars/loadWebinars.ts
- data/webinars.jsonc

4. Qué ya existe en Supabase
- Endpoint /api/webinars/search basado en Supabase
- Lógica de catálogo en m_catalogo
- DTO de salida (HubSearchDTO)
- Flujo transaccional completo (Stripe + órdenes + entitlements)

5. Gaps reales
- Detalle, checkout y prelobby siguen dependiendo de JSON
- Helpers de lookup (getWebinar, getWebinarBySku) dependen de JSON
- Posible divergencia entre:
  - Hub (Supabase)
  - Detalle (JSON)
  - Checkout (JSON)
- Shape del hub (HubSearchDTO) no está validado contra shape esperado por UI

6. Riesgos
- Alto riesgo de mismatch entre:
  - HubSearchDTO
  - Webinar (schema actual)
- Reemplazo directo rompería:
  - UI
  - CTAs
  - checkout
- Dependencias indirectas (resolveNextStep, UI builders) pueden romperse

7. Conclusión
- Supabase ya es la base correcta para catálogo
- JSON debe dejar de ser fuente operativa
- Helpers actuales deben evolucionar a adapters, no eliminarse

8. Recomendación para CT-02.02
- Diseñar adapter entre:
  HubSearchDTO → Webinar (shape actual)
- Reemplazar loadWebinars por loader desde Supabase
- Mantener:
  - getWebinar
  - getWebinarBySku
  como capa de compatibilidad
- Migrar JSON a rol estrictamente editorial

Estado:
CT-02.01 completo y listo para diseño de helpers