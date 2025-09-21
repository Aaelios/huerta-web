# Guía de Estilos — Huerta Consulting
Fecha: 2025-09-21  
Estado: v1 (Pasos 1–4 implementados en `app/globals.css`)

> Propósito: documentar tokens, temas, utilidades, componentes base, reglas de uso, QA y plan de migración. Optimiza **conversión**, **SEO** y **performance** (LCP/CLS).

---

## 0) Objetivos y alcance
- Centralizar 90%+ de estilos en `app/globals.css`.
- Sistema de **tokens + utilidades + componentes base**, con **excepciones controladas**.
- Alternar temas por sección sin perder contraste.
- Mobile-first. Container fluido con gutters responsivos.
- Performance: LCP < 2.5s, CLS < 0.05, Unused CSS < 20%.
- Público objetivo: emprendedor urbano inicial (LATAM), foco en claridad y confianza.

---

## 1) Tokens globales (CSS variables)
> Definidos en `:root` dentro de `app/globals.css` (Pasos 1–3).

### 1.1 Colores
- **Marca**: `--primary-1:#5CF28E` · `--primary-2:#50C878` (alias `--accent`) · `--primary-3:#33824D`
- **Base**: `--bg:#0B1D22`, `--surface:#0F262C`, `--light-bg:#F7FAF9`, `--white:#fff`, `--black:#0A0A0A`
- **Texto en oscuro**: `--text-on-dark:#E6F1F3`, `--text-muted-dark:rgba(230,241,243,.80)`, `--text-subtle-dark:.70`
- **Texto en claro**: `--text-on-light:#0A0A0A`, `--text-muted-light:rgba(10,10,10,.75)`, `--text-subtle-light:.60`
- **Bordes**: `--border-dark-1:.10` · `-2:.14` · `-3:.18` · `--border-light-1:.08` · `-2:.12` · `-3:.18` (rgba)
- **Aliases**: `--accent`, `--accent-strong`, `--accent-dark`

### 1.2 Tipografía y escalas
- **Familia**: `--font-sans: var(--font-satoshi), system-ui, ...`
- **Body**: 16/1.6
- **Headings (clamp)**:  
  - `h1: clamp(36px, 6vw, 60px)`  
  - `h2: clamp(28px, 4.5vw, 44px)`  
  - `h3: clamp(22px, 3.5vw, 32px)`

### 1.3 Espaciado, radios, sombras, z-index, transiciones
- **Espaciado**: `--space-1:4` · `2:8` · `3:12` · `4:16` · `5:24` · `6:32` · `7:48` · `8:64` (px)
- **Radios**: `--radius-1:8` · `2:10` · `3:12` · `4:14` · `5:16` · `--radius-pill:999`
- **Sombras**: `--shadow-1`, `--shadow-2`, `--shadow-3`
- **Z-index**: `--z-1:10`, `--z-2:100`, `--z-3:1000`
- **Tiempo/Easing**: `--duration-1:150ms` … `--duration-4:300ms`, `--easing-standard:cubic-bezier(.2,.8,.2,1)`

### 1.4 Breakpoints y contenedor
- **BPs**: `--bp-sm:640`, `--bp-md:768`, `--bp-lg:1024`, `--bp-xl:1280`
- **Container**: `--container-max:1200px`, `--container-fluid: clamp(320px, 92vw, var(--container-max))`
- **Gutters**: `--gutter-x`: 16/24/32 (móvil/tablet/desktop) mediante media queries
- **Padding de sección**: `--section-py`: 32/48/64 (móvil/tablet/desktop)

---

## 2) Temas y contraste
> Reglas para no sobrepensar combinaciones. Evitan overrides y `!important`.

- **`section--dark`**: fondo `--bg`, texto `--text-on-dark`. Párrafos `--text-muted-dark`.
- **`section--light`**: fondo `--light-bg|--white`, texto `--text-on-light`. Párrafos `--text-muted-light`.
- **`section--surface`**: capas sobre dark. **No usar sobre light**.
- **Cards**:  
  - En `dark/surface` usar `c-card--light` (fondo claro).  
  - En `light` usar `c-card--dark` (fondo `--surface`).  
- **Límites**: máx. **3 cambios** de tema por página.
- **Buttons/links**: siempre tokens (`--accent`, etc.). Texto del botón sólido en claro = **negro**.

---

## 3) Reset y accesibilidad
- Reset mínimo y **focus-visible** global (outline 2px + offset 2px).
- `@media (prefers-reduced-motion: reduce)` desactiva transformaciones; deja color/opacidad.
- `::selection` accesible. `img/svg/video/canvas` con `display:block; max-width:100%`.
- Evitar `outline:none`. No usar colores directos en componentes; solo tokens.

---

## 4) Utilidades de layout
- **`.container`**: `width:min(container-fluid, 100%)`, `padding-inline: var(--gutter-x)`.
- **`.section`**: `padding-block: var(--section-py)`.
- **Stacks**: `.stack-2|3|4|5|6` → columna con `gap` según escala.
- **Cluster**: `.cluster-3|4|5` → fila con `wrap` y `gap`.
- **Grid**: `.grid-2|3|4` → 1 col en móvil; 2/3/4 col en md/lg.
- **Helpers**: `.u-center`, `.u-text-center`, `.u-maxw-sm|md|lg`, `.u-divider`, `.u-lead`, `.u-small`.

---

## 5) Componentes base
> Añadidos en Paso 4 al final de `globals.css`.

### 5.1 Links
- `.c-link` (hover subrayado, foco visible).  
- `.c-link--nav` + `.is-active` con subrayado por pseudo para evitar CLS.  
- `.c-link--muted` para enlaces secundarios.

### 5.2 Botones
- `.c-btn` con tallas `--sm|--md|--lg` y variantes:
  - `--solid` (CTA principal)
  - `--outline` (secundario)
  - `--ghost` (terciario)
  - `--pill` (forma redondeada)
  - `--icon` (icon-only)
- `is-block` para ancho completo.
- Reglas de transición y foco accesibles.

### 5.3 Cards
- `.c-card` con variantes `--dark` y `--light` + `--accentTop`.
- Hover: `shadow-1` + leve `translateY`.

### 5.4 Formularios
- `.c-form-label`, `.c-form-control`, `.c-form-help`, `.c-form-error`.
- Versiones adaptadas a `section--light` y `section--dark`.

### 5.5 Compat temporal
- Alias (si tu build soporta `composes`): `.btn-*` y `.input` → `.c-*`.
- En nuevo código usa **solo** `.c-*`.

---

## 6) Convenciones de naming
- **Layout**: `l-*` (ej. `l-header`, `l-footer`).
- **Componentes**: `c-*` (ej. `c-btn`, `c-card`).
- **Utilidades**: `u-*` (ej. `u-center`), o sin prefijo para familias (`stack-*`, `grid-*`).
- **Estados**: `is-*` y `has-*`.

---

## 7) Prohibiciones
- **Sin inline styles** ni CSS por página, salvo excepción aprobada.
- **Sin colores hardcodeados** en componentes; usar tokens.
- Evitar `!important`. Resolver por especificidad/estructura.

---

## 8) Reglas de excepción (gobierno)
- CSS por sección **solo** si es caso único no reutilizable o dependencia puntual.  
  Documentar en `/docs/excepciones.md` con responsable y fecha de expiración.
- **Nuevos tokens**: mínimo 2 vistas usándolos.
- **Nuevas utilidades**: deben eliminar ≥3 repeticiones reales.

---

## 9) Plan de migración
**Orden**: tokens/base (listo) → reset/accesibilidad (listo) → utilidades (listo) → componentes (listo) → **páginas**.  
**Páginas**: Header → Footer → Home → Sobre mí.

- Remap general:
  - `.btn-solid` → `.c-btn c-btn--solid`
  - `.btn-outline` → `.c-btn c-btn--outline`
  - `.btn-pill` → `.c-btn c-btn--solid c-btn--pill`
  - `.icon-btn` → `.c-btn c-btn--icon`
  - `.nav-link`/`.active` → `.c-link--nav .is-active`
  - `.input` → `.c-form-control`
  - `.card` → `.c-card c-card--dark` (si `section--light`)
  - `.card--light` → `.c-card c-card--light` (si `section--dark|surface`)
  - Contenedores manuales → `.container`
  - Grids/Stacks ad-hoc → `.grid-*`, `.stack-*`, `.cluster-*`
  - Colores directos → variantes de **tema**

---

## 10) Mapa por sección (destino mínimo)
### 10.1 Header
- `header.site-header` + `.container .nav-container`
- Links: `.c-link--nav` (+ `.is-active`)
- Botones: `.c-btn c-btn--icon` y CTA `.c-btn c-btn--solid c-btn--pill`

### 10.2 Footer
- `footer.site-footer` + `.container .footer-grid`
- Form: `.c-form-control`, botón `.c-btn c-btn--solid`

### 10.3 Home
- Secciones alternando `section--dark` / `section--light`.
- `surface` solo para bloques destacados.  
- Testimonios en `section--surface` para contraste seguro.

### 10.4 Sobre mí
- Intro `section--dark` → bloques `section--surface` → descanso `section--light`.

---

## 11) QA y métricas de aceptación
- Lighthouse: **CLS ≤ 0.05**, **LCP ≤ 2.5s**, **Unused CSS < 20%** (Home).
- Contraste **AA** en texto y controles.
- Focus visible en todos los interactivos.
- Sin inline styles ni `<style jsx>`.
- Mobile-first: centrado correcto, sin overflows, sin saltos al pasar breakpoints.

---

## 12) Performance (LCP/CLS) — prácticas clave
- `next/image` con `width/height` + `sizes`; si wrapper flexible, añadir `aspect-ratio`.
- Subrayado nav con pseudo (`.c-link--nav::after`), no `border-bottom` que cambie caja.
- `next/font` o `font-display: swap`; `font-synthesis-weight: none` para estabilidad.
- Reservar altura para contenido que aparece post-hidratación (chips/badges dinámicos).
- No cambiar grosor de bordes en hover.

---

## 13) Mantenimiento y pendientes
- **TODO (mantenimiento)**: Migrar “FEATURED webinar” de Home a Supabase.  
  - **Plan**: crear tabla `webinars (id, title, summary, href, cta_label, type, start_at, image_url, status)`.
  - Home debe leer el próximo por `start_at` con `status=published` desde un server component.
  - Eliminar la constante local y este TODO cuando esté en producción.
- **Issue sugerido** (copiar/pegar en GitHub):
  - **Título:** Migrar “FEATURED webinar” de Home a Supabase
  - **Descripción:** Ver sección 13 de esta guía.
  - **Criterios de aceptación:** Home muestra automáticamente el próximo webinar; fallback si no hay registros; sin regresión LCP/CLS.

---

## 14) Cambios futuros previstos
- Portar `.btn-*` y `.input` legados a `.c-*` en todas las vistas.
- Añadir utilidades específicas solo si reducen ≥3 repeticiones.
- Documentar cualquier excepción en `/docs/excepciones.md`.

---

## 15) Registro de cambios
- **v1 (2025-09-21)**: Definición inicial. Tokens, reset, utilidades, componentes base, reglas de contraste y plan de migración.
