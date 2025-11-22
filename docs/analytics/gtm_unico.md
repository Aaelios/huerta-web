# GTM Único — Arquitectura de Tracking  
**Proyecto:** LOBRÁ (lobra.net)  
**Ubicación del documento:** `/docs/analytics/gtm_unico.md`  
**Estado:** v1 · Estable

---

## 1. Objetivo
Centralizar toda la medición del sitio en **un único contenedor de Google Tag Manager (GTM)**, evitando scripts heredados, duplicados o directos (GA4, Meta Pixel, gtag.js, fbq, etc.).

---

## 2. Variables de entorno
El contenedor se define por:

```
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

Mientras esta variable exista, GTM se carga en todo el sitio.

---

## 3. Componentes que conforman el GTM único

### 3.1 Script GTM (parte `<head>` lógico)
Implementado en:

`components/Gtm.tsx`

Incluye:
- Carga del script oficial de GTM (`gtm.js`).
- Inicialización básica de `dataLayer`.
- Envío de `page_view` en cada cambio de ruta (SPA).

---

### 3.2 Noscript GTM (parte `<body>`)
Implementado en:

`app/layout.tsx`

Bloque existente:

```tsx
<noscript>
  <iframe
    src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
    height="0"
    width="0"
    style={{ display: "none", visibility: "hidden" }}
  />
</noscript>
```

Forma parte obligatoria del snippet estándar de GTM.

---

## 4. Scripts permitidos y controlados

### Permitidos
- **GTM único** (script + noscript).
- `dataLayer` inicial dentro de GTM.
- Pageviews gestionados desde `Gtm.tsx`.

### No permitidos en este proyecto
(Confirmado: no existen en el código)
- `gtag.js`
- `gtag('config',...)`
- `fbq()`
- Meta Pixel directo
- GA4 directo
- LinkedIn Insight
- Hotjar
- Cualquier script de analítica fuera de GTM

---

## 5. Ubicación de piezas oficiales

| Pieza | Archivo | Estado |
|------|---------|--------|
| Script GTM | `components/Gtm.tsx` | Activo |
| Noscript GTM | `app/layout.tsx` | Activo |
| dataLayer SPA | `components/Gtm.tsx` | Activo |
| Cloudflare Turnstile | `app/layout.tsx` | Permitido (no analítica) |

---

## 6. Validación en entorno Preview

### 6.1 DOM
- Solo debe aparecer **un** `<script>` que cargue:  
  `https://www.googletagmanager.com/gtm.js?id=GTM-XXXX`.
- Solo debe haber **un** `<iframe>` GTM dentro de `<noscript>`.

### 6.2 Búsqueda manual (DevTools → Sources → Search)
Debe NO aparecer:
- `gtag(`
- `fbq(`
- `Meta Pixel`
- `googletagmanager` fuera del snippet único

### 6.3 Navegación
En `/`, `/checkout`, `/gracias`:
- Sin errores en consola.
- Sin errores en `dataLayer`.
- Stripe funcionando.
- Supabase funcionando.

### 6.4 GTM Preview
- “Container Loaded” visible.
- `page_view` disparándose al navegar.

---

## 7. Estado final
El proyecto cumple con:
- **Un solo GTM.**
- **Cero scripts de GA4 directo.**
- **Cero scripts de Meta Pixel directo.**
- **Cero duplicados.**
- Arquitectura lista para configurar los eventos avanzados en otro módulo especializado.

---

## 8. Historial
- v1 · Creado basado en auditoría completa del repositorio.

