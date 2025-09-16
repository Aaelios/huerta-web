# Vercel & Next.js — Reglas del proyecto

**Huerta Consulting · Actualizado: 2025-09-15**

## Convenciones de nombres y estructura

* App Router obligatorio: `/app/*`.
* Páginas clave fijas: `/`, `/checkout`, `/gracias`, `/cancelado`, `/mi-cuenta`, `/mis-compras`, `/comunidad`, `/blog/*`, `/legales/*`, `/api/*`.
* API internos: `/api/<área>/<acción>` en `app/api/<área>/<acción>/route.ts`.
* Módulos en `/lib/<área>/f_<verbo>.ts`. Tipos en `/lib/types/*`.
* Middlewares globales solo en `middleware.ts`. Evitar lógica de negocio ahí.
* Archivos de config únicos: `next.config.js`, `vercel.json`.

## Entornos y ramas

* Rama de trabajo por defecto: `main` → despliega a **Production**.
* Cambios de riesgo: `feature/*` → **Preview**. Merge a `main` cuando pase QA.
* Sin CLI en local para deploys. Flujo: GitHub → Vercel.

## Variables de entorno y secretos

* UPPER\_SNAKE\_CASE. Solo `NEXT_PUBLIC_` si es estrictamente público.
* Definir en Vercel por entorno: **Production** y **Preview**. `.env.local` solo dev local.
* Rotación semestral de claves sensibles. Registrar fecha en `docs/security/secrets.md`.
* Nunca loggear valores de secretos. Usar sufijos hash si se requiere trazabilidad.

## Deploy, previews y control de cambios

* Un cambio por PR. Título: `feat|fix|chore: <área corta>`.
* Checklist antes de merge: build ok, páginas clave cargan, logs sin errores, eventos GTM presentes.
* Etiquetas Git por semana: `v0.X.0-start` y `v0.X.0`.
* Changelog web en `docs/changelog-web.md` por release.

## Dominios, DNS y SEO técnico

* Dominio primario: `https://huerta.consulting`.
* `https://huerta-consulting.com` y `https://www.huerta-consulting.com` → **301** al primario (reglas en `vercel.json`).
* `middleware.ts`: añadir `X-Robots-Tag: noindex,nofollow` cuando `host` incluya `huerta-consulting.com`.
* Un solo sitemap en dominio primario. Canónicas al primario en todas las páginas.
* `robots.txt` gestionado en App Router. Respetar `noindex` por host.

## Rutas y runtime

* Stripe SDK y webhooks en **Node.js runtime** (no Edge).
* GET públicos cacheables con ISR/`revalidate`. APIs con datos de usuario: `dynamic = 'force-dynamic'`.
* Tamaño de respuesta API ≤ 1 MB. Respetar timeouts de Vercel. Evitar operaciones largas.

## **Webhooks y seguridad (actualizado)**

* **Refetch obligatorio**: siempre reconsultar a Stripe (`invoice` o `checkout.session`) y orquestar con ese objeto canónico. No depender del payload del evento.
* **Compatibilidad de precios**:

  * Expandido: `lines[].price.id` / `line_items[].price.id`
  * Compacto: `lines[].pricing.price_details.price` / `line_items[].pricing.price_details.price`
* **Service Role**: llamadas a SQL con `SUPABASE_SERVICE_ROLE_KEY`. Funciones críticas en DB con `SECURITY DEFINER`.
* **Idempotencia**:

  * Registrar `received` en `webhook_events` con el **raw** del evento.
  * Marcar `processed` solo si hay `order_id`.
  * Replays devuelven 200 con `replay: true` sin reprocesar.
* **Logs mínimos y estables** (sin PII cruda): `stripe_event_id`, `type`, `refetch flags {has_price_expanded, has_compact_price, currency, amount_total}`, `orchestrate start/result`, `orderId`.

## Caching y rendimiento

* Imágenes con `next/image` y dominios whitelisted.
* HTTP caching solo en GET sin PII. `Cache-Control` explícito.
* Evitar `no-store` global. Usar `revalidate` por página.
* Predominio de componentes server. Cargar GTM no bloqueante.

## Observabilidad y auditoría

* Logs JSON server-only: `level, msg, request_id, path, stripe_event_id`.
* Propagar `request_id` por header o generar UUID por request.
* Capturar errores con Sentry (server y client). Sanitizar datos.
* Registrar cada webhook: `stripe_event_id`, `type`, `status`.
* **Alertas**:

  * `webhook_events.processed_at IS NULL` > 10 min
  * o >1% de eventos del día sin procesar.

## RLS y debugging

* RLS activado en tablas de usuario.
* Mantener helpers `f_debug_*` **solo** en staging o detrás de feature flag para auditoría con RLS desactivado. Documentar uso y retiro.

## Índices y mantenimiento

* Índices requeridos:

  * `order_headers(stripe_invoice_id)`
  * `order_headers(stripe_customer_id)`
  * `payments(stripe_invoice_id)`
  * `entitlements(source_type, source_id)`
* Retención: purgar `webhook_events` > 45 días semanalmente.
* `VACUUM ANALYZE` si bloat > 20% en tablas transaccionales.

## Pruebas (actualizado)

* **Stripe CLI nightly**:

  * `invoice.payment_succeeded` en formato **compacto** y **expandido**.
  * `checkout.session.completed` con `line_items` expandidos.
* **Smoke test SQL post-deploy**: validar `price_id` en `order_headers`, `payments`, `entitlements` para el último `invoice.payment_succeeded`.
* GTM: evento `purchase` en `/gracias` tras validar `session_id`.

## Rollback y contingencias

* Si falla post-deploy: `Rollback` en Vercel a la versión previa + revert del commit.
* Mantener `docs/ops/incidents.md` con RCA breve.
* No despublicar el sitio salvo incidente de seguridad. Hotfix en `main` o rollback.

## Accesos y permisos

* Vercel: mínimo necesario. Solo Owners modifican dominios, variables y webhooks.
* Producción: bloquear auto-deletes. Exportar config en `docs/ops/vercel-export.md` tras cambios críticos.

## Analítica y cumplimiento

* GTM único. Verificar GA4 y Meta Pixel con Tag Assistant antes de producción.
* Consent mode en la UE si aplica.
* Políticas servidas desde `/legales/*`.

## Checklists de release (actualizado)

**Antes de merge a `main`:**

1. Build OK.
2. Webhooks de prueba en verde y `price_id` propagado a **order**, **payment**, **entitlement**.
3. Logs Vercel: `refetch invoice … { has_compact_price: true|false }` y `orchestrate result: processed`.
4. Variables `STRIPE_WEBHOOK_SECRET` y `SUPABASE_SERVICE_ROLE_KEY` presentes.
5. `purchase` en `/gracias` validado.

**D-Day:**

1. DNS y 301 verificados.
2. Search Console sin errores críticos.
3. Monitoreo de errores 24 h.
4. Plan de reversa documentado.

## Lecciones aprendidas

* Refetch evita estados parciales.
* Parsers tolerantes a formatos nuevos de Stripe.
* RLS complica diagnóstico sin lectores debug controlados.
* Contratos tipados firmes evitan roturas de build.
* Logs suficientes, no excesivos.

> Documento base actualizado. No se requiere un nuevo documento. Si prefieres separar prácticas operativas, crea `docs/ops/webhooks-maintenance.md`.
