# docs/ops/forms_incidents.md

# Registro de Incidentes — Módulo de Formularios

Versión: 2025-09-28  
Owner: Huerta Consulting

---

## 1) Objetivo

Mantener un historial claro de incidentes relacionados con el endpoint `/api/forms/submit` y la RPC `f_orch_contact_write`.  
Sirve para análisis de causa raíz (RCA), mejoras continuas y cumplimiento.

---

## 2) Formato de registro

Cada incidente debe documentarse con los siguientes campos:

| Campo              | Descripción |
|--------------------|-------------|
| **ID**             | Identificador único (ej. `INC-2025-001`). |
| **Fecha/Hora**     | Inicio y fin del incidente. |
| **Síntoma**        | Qué percibieron los usuarios (ej. “formularios rechazan todo”). |
| **Detección**      | Cómo se identificó (ej. alerta, reporte cliente, log). |
| **Root Cause**     | Causa raíz confirmada. |
| **Impacto**        | Alcance (ej. % de usuarios, duración). |
| **Mitigación**     | Qué acción inmediata resolvió. |
| **Acciones futuras** | Cambios preventivos a aplicar. |
| **Owner**          | Responsable del seguimiento. |

---

## 3) Clasificación de incidentes

- **Bot Attack** → picos de `turnstile_fail`.  
- **Supabase Down** → errores `rpc_error` > 5%.  
- **Bug Release** → fallo tras merge a `main`.  
- **Infra Latency** → latencia >2s sostenida.  
- **Secrets Leak/Rotation** → claves expuestas o caducadas.  

---

## 4) Procedimiento post-incidente

1. Documentar el incidente en este archivo dentro de 24 h.  
2. Crear issue en GitHub con referencia al ID de incidente.  
3. Si aplica, actualizar:
   - `docs/security/forms_threat_model.md` (si fue vector nuevo).  
   - `docs/security/forms_secrets.md` (si se rotó clave).  
   - `docs/ops/forms_runbook.md` (si hubo cambio operativo).  
4. Revisar en retro mensual → priorizar acciones de mejora.

---

## 5) Ejemplo de entrada

```markdown
## INC-2025-001 — Bot Attack

**Fecha/Hora:** 2025-10-03 09:15 — 09:45  
**Síntoma:** Aumento de rechazos en formularios de contacto.  
**Detección:** Alerta en Vercel → `turnstile_fail > 20%`.  
**Root Cause:** Script automatizado enviando payloads falsos sin Turnstile.  
**Impacto:** 30% de formularios bloqueados durante 30 min.  
**Mitigación:** Activación temporal de `FORMS_DISABLE_TURNSTILE=false` y ajuste de reglas WAF en Cloudflare.  
**Acciones futuras:** Configurar alerta en GA4 para detectar caídas en conversiones.  
**Owner:** Roberto H.
````

---

## 6) Estado actual

* Ningún incidente registrado aún (2025-09-28).
* Primer retro de incidentes programado para Octubre 2025.

---