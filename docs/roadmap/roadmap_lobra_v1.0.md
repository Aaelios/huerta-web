# Roadmap LOBRA v1.0 — Implementación Prioritaria 2025

---

## 🔹 1. Objetivo general

Definir la secuencia óptima de implementación técnica y funcional del sitio **lobra.net**, priorizando tareas que contribuyen directamente a generar ingresos.  
El presente documento consolida el orden, fases, dependencias y responsables derivados del análisis de matriz de impacto–complejidad y revisión de dependencias cruzadas.

---

## 🔹 2. Criterios de priorización

| Criterio | Descripción |
|-----------|-------------|
| **Impacto en ingresos** | Qué tanto contribuye la tarea a generar o multiplicar ventas. |
| **Complejidad técnica** | Nivel de esfuerzo (1–5) requerido para completarla. |
| **ROI técnico** | Relación entre impacto y complejidad (Impacto ÷ Complejidad). |
| **Dependencias** | Solo se programan tareas que no dependan de otras posteriores. |
| **Tiempo disponible** | Plan basado en 16–24 h semanales de desarrollo. |

---

## 🔹 3. Estructura por fases

### **Fase 1 — Monetización mínima funcional (Semanas 1–2)**
Objetivo: permitir ventas reales y medir resultados.

- Repositorio Supabase versionado  
- Página de venta de módulos completos  
- Página de venta de sesiones 1-a-1  
- Página por clase con próximas fechas  
- Copys optimizados (Home / Sales / Gracias / Email)  
- Upsell 1-a-1 en checkout (in-flow)  
- Tracking completo GA4 + Meta Pixel + GTM limpio  

🟢 **Resultado esperado:** el sitio puede vender y registrar conversiones reales.

---

### **Fase 2 — Entrega automática y base de datos unificada (Semanas 3–4)**
Objetivo: eliminar tareas manuales y centralizar la información.

- Migrar JSONC → Supabase  
- “Mis compras” + entregas automáticas  
- Consolidar Home / Sales / Gracias / Prelobby con Supabase  
- Automatizar agenda 1-a-1 (Stripe → Calendly)  
- Integración Brevo básica  

🟢 **Resultado esperado:** ciclo de compra completamente automatizado.

---

### **Fase 3 — Retención y marketing automatizado (Semanas 5–6)**
Objetivo: aumentar recurrencia e ingresos sin trabajo manual.

- Upsell 1-a-1 post-venta (/gracias + email)  
- Email post-clase con upsell  
- Cross-sell entre clases  
- Sistema de referidos  
- Página de recursos gratuitos / lead magnet  
- UTM tracking y atribución de campañas  
- Secuencias Brevo (recordatorios / upsell)  
- Email abandono de carrito / no compra  

🟢 **Resultado esperado:** flujo de marketing automatizado y aumento del valor de vida del cliente (LTV).

---

### **Fase 4 — Retención y confianza (Semanas 7–8)**
Objetivo: fortalecer la experiencia de usuario y preparar escalabilidad.

- Centro de ayuda / soporte  
- Certificados descargables / compartibles  
- Tenant como PK (multi-tenant ready)  
- Testimonios / casos de éxito  
- Timers / urgencia visual  

🟢 **Resultado esperado:** credibilidad reforzada y base lista para escalar.

---

### **Fase 5 — Optimización y mantenimiento (Posterior)**
Objetivo: robustecer operaciones, rendimiento y crecimiento orgánico.

- Panel interno para editar precios/textos  
- Sistema de logs + alertas  
- Backup y rollback automáticos Supabase  
- CI/CD automatizado (Preview / Prod)  
- Optimización Lighthouse / móvil  
- Blog / SEO  
- Comunidad (Discord o Circle)  

🟢 **Resultado esperado:** entorno estable, mantenible y preparado para expansión.

---

## 🔹 4. Gobernanza del roadmap

**Responsable técnico:** Snow  
**Responsable funcional:** Roberto Huerta  

Actualización cada cierre de fase:
1. Evaluar cumplimiento de entregables y horas reales.  
2. Repriorizar tareas pendientes según impacto comercial.  
3. Documentar ajustes en nueva versión `roadmap_lobra_vX.Y.md`.  

---

## 🔹 5. Reglas de modificación

- Solo se moverán tareas de fase si:
  1. Surge una oportunidad de venta inmediata.  
  2. Se detecta una dependencia técnica no prevista.  
  3. Se justifica una mejora sustancial de ingresos o estabilidad.  
- Toda modificación debe reflejarse en la tabla maestra (XLS) y en el changelog del repositorio.

---

## 🔹 6. Referencias

- **Tabla detallada:** `/roadmap_lobra_v1.0.xlsx`  
- **Repositorio:** [GitHub – LOBRA](https://github.com/Aaelios/huerta-web)  
- **Supabase Project:** `lobra-prod`  
- **Fecha de corte:** Octubre 2025

---

### ✅ Estado actual: v1.0 finalizado y documentado.
