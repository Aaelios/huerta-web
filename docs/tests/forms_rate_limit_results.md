# docs/tests/forms_rate_limit_results.md

# ✅ Resultados de pruebas — Rate Limit (Forms API, Prod)

**Fecha:** 2025-09-29  
**Ámbito:** Endpoint `/api/forms/submit` en producción  
**Casos cubiertos:** 9–11 del playbook (`forms_e2e.md`)  

---

## Contexto

Se ejecutaron pruebas de límite de envío (rate limit) usando PowerShell con `Invoke-RestMethod` y encabezado QA (`x-forms-qa-token`).  
Turnstile deshabilitado (`FORMS_DISABLE_TURNSTILE=true`) para eliminar ruido.  

Objetivo: validar comportamiento de **burst** (ráfagas) y **sustained** (ventanas sostenidas) en Supabase vía `f_rate_limit_touch_v1`.

---

## Resultados

### Caso 9 — Burst por IP
- 3× `submit_ok`
- 1× `rate_limited` con `reason:"ip_burst"`
- ✔️ Resultado esperado.

### Caso 10 — Burst por Email
- 2× `submit_ok`
- 1× `rate_limited` con `reason:"email_burst"`
- ✔️ Resultado esperado.

### Caso 11 — Sostenido por IP
- Bloqueos prematuros en 4.º y 5.º envío.
- Otro bloqueo en 9.º envío.
- Logs muestran mezcla de `reason:"email_sustained"` y `reason:"ip_sustained"`.
- ⚠️ Más agresivo de lo esperado.

---

## Logs confirmados

- `submit_ok` → status `ok` o `duplicate`.
- `rate_limited` → razones: `ip_burst`, `email_burst`, `email_sustained`.
- Ningún `rpc_error`.
- Ningún `turnstile_fail`.

---

## Latencias

- Rango observado: **293–904 ms**.
- Mediana: ~**320 ms**.
- ✔️ Muy por debajo del umbral de 2 s.

---

## Conclusiones

- **Burst (IP/email):** configuración correcta, sin falsos positivos.
- **Sustained:** comportamiento inconsistente. Posible riesgo de falsos positivos si un usuario legítimo envía ≥4 formularios en menos de 10 minutos.
- **Latencia:** sin problemas de performance.

---

## Acciones pendientes

- Revisar definición de claves y ventanas en lógica `sustained`.
- Documentar riesgo en `docs/forms/known-issues.md`.
- Evaluar ajuste de umbrales tras análisis de tráfico real en producción.

