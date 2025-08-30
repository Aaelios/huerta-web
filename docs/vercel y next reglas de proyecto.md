# Vercel & Next.js — Reglas del proyecto

## Convenciones de nombres y estructura
- App Router obligatorio: `/app/*`.
- Páginas clave fijas: `/`, `/checkout`, `/gracias`, `/cancelado`, `/mi-cuenta`, `/mis-compras`, `/comunidad`, `/blog/*`, `/legales/*`, `/api/*`.
- API internos: `/api/<área>/<acción>` en `app/api/<área>/<acción>/route.ts`.
- Módulos en `/lib/<área>/f_<verbo>.ts`. Tipos en `/lib/types/*`.
- Middlewares globales solo en `middleware.ts`. Evitar lógica de negocio ahí.
- Archivos de config únicos: `next.config.js`, `vercel.json`.

## Entornos y ramas
- Rama de trabajo por defecto: `main` → despliega a **Production**.
- Cambios de riesgo: `feature/*` → **Preview**. Merge a `main` cuando pase QA.
- Sin CLI en local para deploys. Flujo: GitHub → Vercel.

## Variables de entorno y secretos
- Formato UPPER_SNAKE_CASE. Solo exponer con `NEXT_PUBLIC_` si es estrictamente público.
- Definir en Vercel por entorno: **Production** y **Preview**. `.env.local` solo dev local.
- Rotación semestral de claves sensibles. Documentar fecha de rotación en `docs/security/secrets.md`.
- Nunca registrar valores de secretos en logs. Usar sufijos hash si se requiere trazabilidad.

## Deploy, previews y control de cambios
- Un cambio por PR. Título: `feat|fix|chore: <área corta>`.
- Checklist antes de merge: build ok, páginas clave cargan, logs sin errores, eventos GTM presentes.
- Etiquetas Git por semana: `v0.X.0-start` y `v0.X.0`.
- Changelog web en `docs/changelog-web.md` por release.

## Dominios, DNS y SEO técnico
- Dominio primario: `https://huerta.consulting`.
- `https://huerta-consulting.com` y `https://www.huerta-consulting.com` → **301** al primario (reglas en `vercel.json`).
- `middleware.ts`: añadir `X-Robots-Tag: noindex,nofollow` cuando `host` incluya `huerta-consulting.com`.
- Un solo sitemap en dominio primario. Canónicas al primario en todas las páginas.
- `robots.txt` gestionado en App Router. Respetar `noindex` por host.

## Rutas y runtime
- Stripe SDK y webhooks en **Node.js runtime** (no Edge).
- GET públicos cacheables con ISR/`revalidate`. APIs con datos de usuario: `dynamic = 'force-dynamic'`.
- Tamaño de respuesta API ≤ 1 MB. Timeouts por defecto de Vercel respetados; evitar operaciones largas.

## Webhooks y seguridad
- `/api/stripe/webhooks`: verificar firma con `STRIPE_WEBHOOK_SECRET`. Idempotencia persistida en `webhook_events`.
- Responder siempre 2xx solo tras persistir. En error, 5xx con `stripe_event_id` en log.
- Bloquear métodos no permitidos con 405. Sin CORS abiertos en rutas privadas.
- Health-check mínimo: `/api/health` retorna `{ok:true, version, commit}`.

## Caching y rendimiento
- Imágenes con `next/image` y dominios whitelisted.
- Habilitar HTTP caching solo en GET sin PII. `Cache-Control` explícito.
- Evitar `no-store` global. Usar `revalidate` por página.
- Minimizar JS del cliente: componentes server por defecto. Cargar GTM de forma no bloqueante.

## Observabilidad y auditoría
- Logs estructurados JSON en server-only (`level, msg, request_id, path, user_id?`).
- Propagar `request_id` por header entrante o generar UUID por request.
- Capturar errores con Sentry en server y client. Sanitizar datos.
- Registrar en log cada webhook procesado: `stripe_event_id`, `type`, `status`.

## Pruebas
- Pruebas de humo en Preview: `/`, `/gracias?session_id=...`, `/api/stripe/create-checkout-session` (200), `/api/stripe/webhooks` (firma).
- Stripe Test: tarjeta, OXXO/SPEI y suscripción. Validar efectos en Supabase.
- GTM: evento `purchase` en `/gracias` tras validar `session_id`.

## Rollback y contingencias
- Si falla post-deploy: `Rollback` en Vercel a la versión previa + revert de commit.
- Mantener status page interna `docs/ops/incidents.md` con RCA breve.
- No despublicar el sitio salvo incidente de seguridad. Usar hotfix en `main` o rollback.

## Accesos y permisos
- Vercel: mínimo necesario. Solo Owners pueden modificar dominios, variables y webhooks.
- Producción: bloqueado para auto-deletes de proyectos. Backups de config exportados en `docs/ops/vercel-export.md` tras cambios críticos.

## Analítica y cumplimiento
- GTM único. Verificar GA4 y Meta Pixel con Tag Assistant antes de producción.
- Consentimiento de cookies si se publicita en la UE. Configurar GTM para consent mode cuando aplique.
- Política de privacidad y términos servidos desde `/legales/*`.

## Checklists de release
**Antes de merge a `main`:**
1) Build ok. Lighthouse ≥ 90 en Home.  
2) Webhooks de Stripe en verde con eventos de prueba.  
3) `purchase` se dispara en `/gracias`.  
4) Redirects 301 activos del `.com` al `.consulting`.  
5) Sin secretos en logs.

**D-Day (corte desde Framer):**
1) DNS apuntando a Vercel.  
2) 301 en Vercel verificados con paths reales.  
3) Search Console sin errores críticos.  
4) Monitoreo de errores 24 h.  
5) Plan de reversa: volver DNS a Framer + rollback en Vercel.

---
Estado: propuesta para revisión. Indica cambios o aprueba para formalizar en el repo.
