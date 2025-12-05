
---

```md
# Arquitectura Brevo · Bloque 3 — Free Class F1  
Versión: 1.0  
Fecha: 2025-12-04  
Archivo: `docs/brevo/arquitectura_f1_freeclass_bloque3.md`

---

# 0) Contexto del Padre

Bloque 2 dejó implementada toda la integración técnica Next.js → Supabase v2 → Brevo:

- Helpers de Supabase y Brevo funcionando.  
- Upsert, tags y RPC `f_contacts_marketing_update_v1`.  
- Route `/api/freeclass/register` produciendo `sku` y `instance_slug`.  

Bloque 3 define la **arquitectura de Brevo desde cero** para F1 Free Class:

- Estructura base de listas.  
- Atributos mínimos.  
- Tags oficiales (lead + cohorts).  
- Journeys 09-dic y 16-dic.  
- Política NONPROD/PROD.  
- Buenas prácticas para escalabilidad 2026.

---

# 1) Alcance Final del Bloque 3

### Incluye
- Lista global Brevo.  
- Atributos mínimos (EMAIL + FIRSTNAME).  
- Sistema completo de tags, basado en `sku` + `instance_slug`.  
- Journeys automatizados para cohortes.  
- Reglas de reinscripción.  
- Política NONPROD vs PROD.  
- QA técnico-conceptual.

### No Incluye
- Buyer-tag (bloque 4).  
- Copy de emails.  
- Lógica de compra o postventa.  
- Modificaciones a Supabase o Next.js.

---

# 2) Estructura de Brevo desde cero

## 2.1 Lista Global (recomendada)
Crear una sola lista:

**`LOBRÁ · Contactos (Global)`**

Reglas:
- Todo contacto vive aquí.  
- No usar múltiples listas.  
- Segmentación siempre mediante **tags**.

Motivos:
- Menor costo operacional.  
- Evita duplicados.  
- Compatible con upsert por email.  
- Escalable sin límite.

---

# 3) Atributos Brevo

Para F1 solo se usan atributos nativos:

- `EMAIL`  
- `FIRSTNAME`

No se agregan atributos custom.

Motivos:
- Menos mantenimiento.  
- Barato y estable.  
- Todo lo demás vive en Supabase.

---

# 4) Sistema de Tags · Arquitectura 2026

## 4.1 Convención universal

Los tags se generan automáticamente desde el backend con:

### A) Tag del lead general (producto)
```

lead_<sku>

```

Ejemplo F1:
```

lead_liveclass-lobra-rhd-fin-freeintro-v001

```

### B) Tag de cohorte / instancia
```

lead_<sku>_<instance_slug>

``

Ejemplos F1:
```

lead_liveclass-lobra-rhd-fin-freeintro-v001_2025-12-09-1900
lead_liveclass-lobra-rhd-fin-freeintro-v001_2025-12-16-1900

```

## 4.2 Alias opcionales (no recomendados para journeys)
Pueden existir alias informales para uso humano:

- `lead_freeclass_fin_freeintro`  
- `lead_freeclass_fin_freeintro_2025-12-09-1900`  
- `lead_freeclass_fin_freeintro_2025-12-16-1900`

Recomendación: usar solo los **tags estructurados** para herramientas y journeys.

## 4.3 Reglas globales de naming
1. Sin espacios ni mayúsculas.  
2. Basado siempre en SKU.  
3. Instancia siempre en formato ISO simplificado.  
4. Nunca usar UTMs como tags.  
5. No borrar tags históricos.  

---

# 5) Journeys Free Class (PROD)

## 5.1 Reglas de reinscripción
- Un contacto **no puede reingresar** al journey de la **misma cohorte**.  
- Sí puede participar en cohortes distintas.  
- Si un contacto entra a 09 y 16, recibirá ambos flujos correctamente.

---

# 6) Journey · Cohorte 09-dic-2025

### Trigger
```

lead_liveclass-lobra-rhd-fin-freeintro-v001_2025-12-09-1900

```

### Secuencia propuesta
1. **Email inmediato — Confirmación de registro**  
2. **Espera hasta 24h antes**  
   - Recordatorio general.  
3. **Espera hasta 2h antes**  
   - Último recordatorio + link sesión.  
4. **2h después del evento**  
   - Gracias + materiales post-clase.  
5. **Nurturing opcional (1–3 emails)**  
   - Enfoque en claridad financiera y próximos pasos.  
   - No incluye buyer-tag.

---

# 7) Journey · Cohorte 16-dic-2025

### Trigger
```

lead_liveclass-lobra-rhd-fin-freeintro-v001_2025-12-16-1900

```

### Secuencia
La misma estructura del 09-dic cambiando fecha relativa.

---

# 8) Reglas técnicas para ambos journeys

- No permitir reinscripción en cohortes repetidas.  
- Permitir participación en cohortes distintas.  
- Pasos basados siempre en delay relativo al **tag assignment**.  
- No borrar ni modificar tags.  
- No depender aún de buyer-tag ni de pagos.

---

# 9) Política de Entornos Brevo

## 9.1 NONPROD (local, dev, preview)
- Usar `BREVO_API_KEY_NONPROD`.  
- No crear journeys.  
- No enviar emails reales.  
- Solo validar que el helper aplique tags.  
- Usar contactos ficticios para pruebas.

Objetivo: validar integraciones sin costo ni afectación real.

---

## 9.2 PROD (huerta.consulting / lobra.net)
- Usar `BREVO_API_KEY_PROD`.  
- Crear lista global y tags estructurados.  
- Crear journeys 09 y 16.  
- Activar triggers por tag.

Objetivo: flujo real para leads reales.

---

# 10) QA de Bloque 3

## 10.1 Prueba real de cohorte 09-dic
1. Registrarse en la landing.  
2. Confirmar en Supabase:  
   - `free_class_registrations` correcta.  
   - Tags aplicados.  
   - `brevo_contact_id` presente.  
3. Confirmar en Brevo PROD:  
   - Contacto existe.  
   - Journey de 09-dic activado.

## 10.2 Prueba de error Brevo (NONPROD)
- Ingresar email inválido.  
- Validar en Supabase:  
  - `status = bounced`.  
  - `last_status = sync_error`.

## 10.3 Prueba real 16-dic
- Validar separación de cohortes.  
- Validar journeys independientes.

---

# 11) Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Duplicación de journeys | Bloquear reinserción por tag único. |
| Naming inconsistente | Uso obligatorio de `<sku>_<instance_slug>`. |
| Email inválido | Supabase marca `bounced`, no afecta UX. |
| Fallas Brevo | Route no se cae (Bloque 2 maneja resiliencia). |

---

# 12) Futuro (no bloqueante)
- Definir buyer-tag (Bloque 4).  
- Atributos adicionales si hay SMS o WhatsApp.  
- Journeys de venta para módulos 2026.  

---

# 13) Conclusión

Bloque 3 queda definido con:

- Lista única global.  
- Atributos mínimos.  
- Sistema estructurado de tags escalable.  
- Journeys de cohortes consistentes.  
- Separación limpia de entornos.  
- QA claro y reproducible.

Arquitectura lista para implementación inmediata en Brevo PROD.
```

---