# docs/security/forms_secrets.md

# Guía de Manejo de Secretos — Módulo de Formularios

Versión: 2025-09-28  
Owner: Huerta Consulting

---

## 1) Alcance

Este documento define el manejo seguro de variables y claves usadas por el endpoint `/api/forms/submit` y la RPC `f_orch_contact_write`.

---

## 2) Variables requeridas

| Variable                  | Uso                                   | Scope            |
|----------------------------|---------------------------------------|------------------|
| `SUPABASE_URL`            | URL del proyecto Supabase             | Server only      |
| `SUPABASE_SERVICE_ROLE_KEY` | Ejecutar RPC con permisos elevados   | Server only      |
| `TURNSTILE_SECRET_KEY`    | Validar token Turnstile server-side    | Server only      |
| `RESEND_API_KEY`          | Envío de correos transaccionales       | Server only      |
| `BREVO_API_KEY`           | Alta de contactos marketing CRM        | Server only      |
| `BREVO_LIST_NEWSLETTER`   | ID de lista para suscripción newsletter | Server only      |
| `BREVO_LIST_CONTACT`      | ID de lista para contactos             | Server only      |
| `SENTRY_DSN`              | Observabilidad y errores               | Server only      |
| `GTM_ID`, `GA4_ID`, `META_PIXEL_ID` | Analítica cliente            | Client (NEXT_PUBLIC\_) |

---

## 3) Principios

1. **Nunca en cliente**: todas las claves excepto analytics deben vivir solo en server.  
2. **Rotación semestral**: cada 6 meses renovar `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `BREVO_API_KEY`.  
3. **Auditoría**: registrar fecha de alta y próxima rotación en `docs/security/secrets.md`.  
4. **Reemplazo inmediato** si se sospecha filtración.  
5. **Feature flags** (`NEXT_PUBLIC_`) solo para claves estrictamente públicas como GTM/GA4.  

---

## 4) Procedimiento de actualización

1. Generar clave nueva en consola del proveedor.  
2. Guardar en **Vercel → Environment Variables** en `Production` y `Preview`.  
3. Actualizar `.env.local` en dev (solo para pruebas locales).  
4. Confirmar despliegue con build exitoso.  
5. Registrar fecha y hash de clave (primeros 6 caracteres SHA256) en sección de auditoría.

---

## 5) Almacenamiento

- **Fuente de verdad**: Vercel Environment Variables.  
- `.env.local`: solo para uso personal en desarrollo, no commitear.  
- **No** almacenar claves en repositorios ni en logs.  
- **Hash parcial**: si se necesita trazar en logs, usar `h_hash.ts` para calcular SHA256 truncado (ej. 8 chars).  

---

## 6) Auditoría de rotación

Ejemplo de tabla a mantener en este documento:

| Variable                  | Última rotación | Próxima rotación | Hash parcial |
|----------------------------|-----------------|-----------------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | 2025-03-15      | 2025-09-15      | `a1b2c3d4`   |
| `RESEND_API_KEY`           | 2025-04-10      | 2025-10-10      | `f9e8d7c6`   |
| `BREVO_API_KEY`            | 2025-02-01      | 2025-08-01      | `1a2b3c4d`   |

---

## 7) Plan de contingencia

- **Si se filtra**:  
  - Revocar clave de inmediato en el proveedor.  
  - Generar clave nueva y actualizar en Vercel.  
  - Rotar en `.env.local` en cada dev machine.  
  - Documentar incidente en `docs/ops/incidents.md`.  

- **Si expira**:  
  - Clave rota al llegar fecha de rotación → servicio falla.  
  - Proceder como en filtración, pero marcar como “expirada” en auditoría.  

---
