# 📄 Auditoría de Variables de Entorno — v1.0.0  
Proyecto: **huerta-web → LOBRÁ (lobra.net)**  
Fecha de auditoría: _(pendiente de firma en el corte final)_

---

## 1. 🎯 Objetivo
Verificar, limpiar y **documentar** todas las variables de entorno actuales en Vercel y local.  
No se realizaron cambios ni sincronizaciones; este documento es de referencia previa al **cutover v1.0.0**.

---

## 2. 🧾 Contexto actual

| Elemento | Estado |
|-----------|--------|
| Proyecto Vercel | **huerta-web** (único entorno consolidado) |
| Repositorio | `main` en GitHub → despliegue automático a Vercel |
| Dominios | `lobra.net` (activo), `huerta.consulting` (301 planificado) |
| Stripe | Modo **test**, sin claves live |
| Supabase | Una sola instancia activa |
| Resend | Configuración válida (`mail.lobra.net`) |
| Brevo | Fuera de alcance MVP |
| ICS_* | No se usan; generación dinámica |
| QA / Preview | Aún no creados |

---

## 3. 🧩 Tabla consolidada de variables

| Tipo | Variable | Valor actual | Local | QA | Preview | Producción | Comentario |
|------|-----------|---------------|-------|----|----------|-------------|-------------|
| App | APP_URL | http://localhost:3000 | Sí | https://qa.lobra.net | derivado de VERCEL_URL | https://lobra.net | Base URL de ejecución |
| App | CANONICAL_BASE_URL | https://lobra.net | Sí | https://qa.lobra.net | https://preview.lobra.net | https://lobra.net | Usada en SEO y canónicas |
| Environment | VERCEL_ENV | development | Sí | preview | preview | production | Automática por entorno |
| Environment | SEND_RECEIPTS | 0 | Sí | 1 | 1 | 1 | Controla envío de recibos |
| Environment | EMAIL_SUBJECT_PREFIX | [Dev] | Sí | [QA] | [Preview] | (vacío) | Prefijo en correos |
| Environment | ALLOW_DEV_TESTS | 1 | Sí | 0 | 0 | 0 | Rutas internas `/dev` |
| Environment | SITE_TZ | America/Mexico_City | Sí | Sí | Sí | Sí | Zona horaria base |
| Public | NEXT_PUBLIC_GTM_ID | GTM-WG9VXG8R | Sí | TBD (nuevo GTM) | TBD | GTM-LOBRA | Nuevo contenedor GTM pendiente |
| Public | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | pk_test_... | Sí | pk_test_... | pk_test_... | pk_live_... | Cambiar en cutover |
| Public | NEXT_PUBLIC_TURNSTILE_SITE_KEY | 0x4AAAAAAB3kcrg8PdKhcHGd | Sí | Sí | Sí | Sí | Sin cambios |
| Public | NEXT_PUBLIC_PRICE_ID_WEBINAR_OCT2025 | price_1S97ubQ8dpmAG0o28zqhJkTP | Sí | Sí | Sí | Sí | SKU webinar actual |
| Public | NEXT_PUBLIC_SKU_WEBINAR_OCT2025 | prod_T5IVV5Nyf0v1oQ | Sí | Sí | Sí | Sí | SKU persistente |
| Public | NEXT_PUBLIC_DEBUG | 1 | Sí | 0 | 0 | 0 | Debug visual |
| Public | NEXT_PUBLIC_SITE_URL | http://localhost:3000 | Sí | https://qa.lobra.net | derivado | https://lobra.net | URL pública |
| Stripe | STRIPE_SECRET_KEY | sk_test_... | Sí | sk_test_... | sk_test_... | sk_live_... | Cambiar en cutover |
| Stripe | STRIPE_WEBHOOK_SECRET | whsec_test... | Sí | whsec_test... | whsec_test... | whsec_live... | Cambiar en cutover |
| Supabase | SUPABASE_URL | https://vwfwgiftbjjipzveilnx.supabase.co | Sí | Nueva instancia QA | Nueva instancia Preview | Misma URL Prod | Una sola base por ahora |
| Supabase | SUPABASE_ANON_KEY | sb_publishable_... | Sí | nueva | nueva | prod | Clave pública cliente |
| Supabase | SUPABASE_SERVICE_ROLE_KEY | sb_secret_... | Sí | nueva | nueva | prod | Solo server |
| Resend | RESEND_API_KEY | re_NPUTiNKT_... | Sí | Sí | Sí | Sí | Mismo dominio |
| Resend | RESEND_DOMAIN | mail.lobra.net | Sí | Sí | Sí | Sí | Dominio autenticado |
| Resend | RESEND_FROM | LOBRÁ <no-reply@mail.lobra.net> | Sí | Sí | Sí | Sí | Remitente principal |
| Turnstile | TURNSTILE_SECRET_KEY | 0x4AAAAAAB3kcu65vh... | Sí | Sí | Sí | Sí | Sin cambios |
| Forms | HASH_SALT | 6a0c59c2b0f44e8... | Sí | Sí | Sí | Sí | Hash global |
| Forms | RL_WINDOW_S | 60 | Sí | Sí | Sí | Sí | Rate limiting |
| Forms | RL_IP_BURST | 3 | Sí | Sí | Sí | Sí | — |
| Forms | RL_EMAIL_BURST | 2 | Sí | Sí | Sí | Sí | — |
| Forms | RL_WINDOW_SUSTAINED_S | 600 | Sí | Sí | Sí | Sí | — |
| Forms | RL_IP_SUSTAINED | 8 | Sí | Sí | Sí | Sí | — |
| Forms | RL_EMAIL_SUSTAINED | 3 | Sí | Sí | Sí | Sí | — |
| Forms | FORMS_DISABLE_TURNSTILE | FALSE | Sí | FALSE | FALSE | FALSE | — |
| Forms | FORMS_DISABLE_RL | TRUE | Sí | FALSE | FALSE | FALSE | Desactivar límites en QA/Prod |
| Forms | FORMS_DISABLE_RPC | FALSE | Sí | FALSE | FALSE | FALSE | — |
| Webinars | PRELOBBY_TEST_DOMAIN | lobra.net | Sí | qa.lobra.net | preview.lobra.net | lobra.net | Usado en ICS |
| Webinars | CACHE_WEBINARS_TTL | 60 | Sí | Sí | Sí | Sí | TTL cache |

---

## 4. 🔍 Brechas detectadas
Variables presentes en `.env.local` pero **no en Vercel** al momento de la auditoría:
- CANONICAL_BASE_URL  
- SEND_RECEIPTS  
- EMAIL_SUBJECT_PREFIX  
- ALLOW_DEV_TESTS  
- SITE_TZ  
- NEXT_PUBLIC_DEBUG  
- HASH_SALT  
- RL_* y FORMS_*  
- PRELOBBY_TEST_DOMAIN  
- CACHE_WEBINARS_TTL  

**Acción:** Documentadas para agregarse en el cutover. No modificadas aún en producción.

---

## 5. 🧱 Plan de segmentación de entornos
| Elemento | Producción | QA | Preview |
|-----------|-------------|----|----------|
| Proyecto Vercel | lobra-web (renombrado desde huerta-web) | lobra-qa | lobra-preview |
| Supabase | Instancia actual (prod) | Nueva instancia QA | Nueva instancia Preview |
| Stripe | Claves live | Claves test | Claves test |
| Resend | Key prod | Key separada QA (opcional) | Key test (opcional) |
| GTM | GTM-LOBRA | Contenedor QA (opcional) | Contenedor QA (opcional) |
| Dominio | lobra.net | qa.lobra.net (noindex) | *.vercel.app (noindex) |
| Despliegue | Manual desde `main` | Manual previo a merge | Auto PRs |

---

## 6. 🔒 Validación final
| Área | Resultado | Observaciones |
|------|------------|----------------|
| Dominio | ✅ | `lobra.net` operativo. Redirección 301 desde huerta.consulting planificada. |
| Stripe | ⚠️ | Modo test. Pasará a live durante el cutover. |
| Supabase | ✅ | Instancia estable, sin fugas. |
| Resend | ✅ | Dominio verificado y clave válida. |
| GTM | ⚠️ | Usa contenedor de huerta.consulting. Crear GTM-LOBRA. |
| Turnstile | ✅ | Configuración correcta. |
| Rate Limit / Forms | ⚠️ | Solo local. Subir bloque completo a Vercel. |
| ICS | ✅ | Generación dinámica confirmada. |
| Brevo | 🚫 | Fuera de alcance v1.0.0. |

---

## 7. ✅ Conclusión

- No existen fugas de claves live o residuales en ambientes test.  
- `.env.local` contiene la configuración más completa; Vercel carece solo de flags y forms.  
- El entorno está **listo para migrar** a la estructura QA / Preview cuando existan las nuevas bases.  
- La sincronización no formó parte del alcance, solo **auditoría y documentación**.

---

**Documento preparado por:**  
> Auditoría de entornos — *Cutover v1.0.0*  
> Proyecto: huerta-web → LOBRÁ (lobra.net)  
> Repositorio: `main`  
> Entornos: Local, QA, Preview, Producción  

