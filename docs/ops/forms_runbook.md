````markdown
# docs/ops/forms_runbook.md

# Runbook Operativo — Formularios y Endpoint `/api/forms/submit`

Versión: 2025-09-28  
Owner: Huerta Consulting

---

## 1) Alcance

Este runbook cubre la operación del endpoint `/api/forms/submit` que orquesta la creación de contactos y mensajes vía RPC `f_orch_contact_write`.  
Incluye monitoreo, resolución de incidentes y rollback.

---

## 2) Monitoreo en producción

### Logs en Vercel
- Revisar `logs.vercel.com` → filtros:
  - `event:submit_ok`
  - `event:turnstile_fail`
  - `event:rate_limited`
  - `event:rpc_error`

### Dashboards recomendados
- **GA4**: métricas de `subscribe` y `generate_lead`.  
- **Sentry**: capturas de excepciones con `request_id`.  
- **Brevo**: validación de contactos creados tras éxito.  
- **Resend**: confirmación de correos enviados (solo soporte/complaint).

### Alertas básicas
- >10% de fallos con `turnstile_fail` en 10 min → posible ataque bot.  
- >5% de `rpc_error` en 10 min → degradación Supabase.  
- Latencia media >2s sostenida → investigar.

---

## 3) Operación diaria

- Validar en **GA4** que los eventos `subscribe` y `generate_lead` coinciden con envíos registrados en Supabase.  
- Revisar una muestra diaria de logs en Vercel → buscar `warnings`.  
- Monitorear métricas de Resend y Brevo (tasa de errores <1%).

---

## 4) Respuesta a incidentes

### Caso A — `turnstile_fail` masivo
1. Confirmar si Turnstile API responde (`curl https://challenges.cloudflare.com/turnstile/v0/siteverify`).  
2. Si la API externa está caída:
   - Desactivar validación Turnstile vía feature flag temporal (`FORMS_DISABLE_TURNSTILE=true`).  
   - Documentar en `docs/ops/incidents.md`.  
   - Rehabilitar apenas Turnstile se recupere.

### Caso B — `rpc_error` generalizado
1. Verificar salud de Supabase desde consola.  
2. Validar que `f_orch_contact_write` sigue existiendo (`select proname from pg_proc where proname like 'f_orch_contact_write%';`).  
3. Si Supabase está caído → pausar campañas de marketing que disparen formularios.  
4. Reintentar una vez operativo; si persiste, escalar a DBA.

### Caso C — `rate_limited` legítimos
- Si hay que liberar un usuario bloqueado:  
  - Borrar manualmente la entrada de rate limit (según store usado, ej. Redis).  
  - Confirmar que no hay ataque en curso antes de liberar.

### Caso D — Latencia elevada
1. Medir latencia RPC (`EXPLAIN ANALYZE select f_orch_contact_write(...)`).  
2. Verificar índices en `contacts.email` y `messages.contact_id`.  
3. Si hay bloat >20%, ejecutar `VACUUM ANALYZE`.

---

## 5) Rollback

### Rollback del endpoint
- **Paso 1**: en Vercel → `Deployments` → seleccionar release anterior → `Rollback`.  
- **Paso 2**: documentar en `docs/ops/incidents.md` con RCA preliminar.  
- **Paso 3**: crear hotfix branch y corregir.  
- **Paso 4**: merge a `main` con tag `vX.Y.1`.

### Rollback de RPC
- Usar script `rollback_supabase_step3.sql` para restaurar tablas y funciones a baseline.  
- Confirmar con:  
  ```sql
  select f_orch_contact_write('{"request_id":"...","type":"newsletter","email":"test@example.com","source":"api"}');
````

---

## 6) Auditoría y compliance

* **Retención logs Vercel:** 30 días. Exportar semanal a almacenamiento seguro si se requiere mayor retención.
* **PII:** solo almacenar hash de IP (`h_hash`), nunca IP cruda.
* **Consentimiento:** verificar que `subscription_events` registra `opt_in` al menos para el 95% de newsletters.

---

## 7) Checklist pre-release

Antes de merge a `main`:

1. Pruebas E2E (`docs/tests/forms_e2e.md`) ejecutadas en Preview.
2. Latencia media <1s por request.
3. Eventos GA4 (`subscribe`, `generate_lead`) visibles.
4. Resend entrega email en <60s.
5. Brevo recibe contacto en <2 min.

---

## 8) RCA rápido

En cada incidente:

* Documentar en `docs/ops/incidents.md`:

  * Fecha y hora.
  * Síntoma.
  * Root cause.
  * Mitigación aplicada.
  * Tiempo hasta resolución.
* Etiquetar como `bot_attack`, `supabase_down`, `bug_release`, `infra_latency`.

---

```