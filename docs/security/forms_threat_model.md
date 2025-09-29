# docs/security/forms_threat_model.md

# Modelo de Amenazas — Formularios y Endpoint `/api/forms/submit`

Versión: 2025-09-28  
Owner: Huerta Consulting

---

## 1) Alcance

Este documento identifica amenazas principales al flujo de formularios (contacto, soporte, newsletter) y describe medidas de mitigación implementadas en Next.js, Supabase y servicios externos.

---

## 2) Actores maliciosos potenciales

- **Bots de spam**: intentan enviar miles de formularios para saturar base de datos o generar correos falsos.  
- **Usuarios maliciosos**: buscan exfiltrar datos o probar payloads dañinos.  
- **Atacantes externos**: intentan explotar inyecciones en RPC o en almacenamiento JSON.  
- **Scrapers**: automatizan envíos con emails falsos para inflar listas.

---

## 3) Vectores de ataque

| Vector                           | Riesgo                                          | Mitigación actual |
|----------------------------------|-------------------------------------------------|-------------------|
| **Bypass de frontend**           | Envíos directos al endpoint sin UI.            | Validación server-side con Zod + Turnstile obligatorio. |
| **Spam / brute force**           | Saturación de `contacts` y `messages`.         | Turnstile + rate limit por IP/email. |
| **SQL injection vía payload**    | Daño a base de datos.                          | Entrada limitada a JSONB, validada contra esquema, sin SQL dinámico. |
| **Overflow en payload**          | Denial of Service (DoS) por tamaños grandes.   | Límites estrictos: body ≤64 KB, message ≤2 KB. |
| **Abuso de idempotencia**        | Saltarse validación enviando múltiples `request_id`. | UUID v4 obligatorio, duplicados devuelven `status:"duplicate"`. |
| **Exfiltración de secretos**     | Filtrar `SUPABASE_SERVICE_ROLE_KEY`.           | Clave solo en server, nunca en cliente. |
| **Enumeración de emails**        | Saber si un email existe en la base.           | RPC responde igual para duplicados (`status:"duplicate"`). |
| **Ataques de latencia**          | Lento procesamiento → saturar workers.         | Timeout 5 s RPC / 10 s endpoint. |
| **PII en logs**                  | Exposición de emails o IPs en logs.            | Hash de IP, no loggear email en claro. |

---

## 4) Defensas técnicas implementadas

### Next.js
- Validación con Zod (`SubmitInputSchema`).
- Límite de tamaño de body (`MAX_BODY_BYTES`).
- Verificación de Turnstile vía `h_verify_turnstile`.
- Rate limiting con `h_rate_limit_touch` (IP + email).
- Logs estructurados sin PII.

### Supabase
- RPC `f_orch_contact_write` con `SECURITY DEFINER`.
- RLS activado en tablas, solo `service_role` puede insertar.
- Constraints de tamaño y unicidad (`citext` en email).
- Triggers bloquean `UPDATE/DELETE` en tablas append-only.

### Servicios externos
- Cloudflare Turnstile para mitigación de bots.
- Resend: solo envíos internos (no eco al cliente).
- Brevo: sincronización async con tags y listas.

---

## 5) Riesgos residuales

- **Ataques distribuidos (DDoS)**: Turnstile y rate limit reducen, pero no eliminan. → Mitigar con Cloudflare a nivel de dominio si escala.  
- **Exploración de rate limits**: Un atacante puede mapear umbrales. → Rotar claves de rate limit y usar backoff exponencial.  
- **Errores de configuración en Supabase**: Si `service_role` se filtra, acceso total a DB. → Rotación semestral obligatoria.  
- **Locales internacionales**: Validación en español, aún no escalada a multi-idioma. → Escalar a schemas por `locale`.  

---

## 6) Plan de mejoras futuras

1. **ReCAPTCHA fallback**: segunda capa si Turnstile falla globalmente.  
2. **Web Application Firewall (WAF)**: reglas específicas en Cloudflare para `/api/forms/*`.  
3. **Alertas de anomalías**: detectar picos inusuales en `turnstile_fail` o `rate_limited`.  
4. **Pruebas de fuzzing** sobre `payload` y `metadata` en staging.  
5. **Soporte multi-idioma** en mensajes de error (es/en).  
6. **Integración de colas** para desacoplar la llamada a RPC y reducir latencia.

---

## 7) Checklist de seguridad

- [x] Validación estricta de entradas.  
- [x] Límite de tamaño de body.  
- [x] Rate limit IP/email.  
- [x] Idempotencia vía `request_id`.  
- [x] No exponer secretos en cliente.  
- [x] Hash de IP en logs.  
- [ ] WAF configurado en Cloudflare.  
- [ ] Fuzzing de payloads en QA.  
- [ ] Documentar plan de rotación de claves en `docs/security/secrets.md`.  

---
