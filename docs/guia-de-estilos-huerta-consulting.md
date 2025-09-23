# Guía de Estilos — Huerta Consulting

Fecha: 2025-09-22
Estado: **v2 (primitivos consolidados en `globals.css`)**

> Propósito: documentar tokens, temas, utilidades, componentes base, reglas de uso, QA y plan de migración. Optimiza **conversión**, **SEO** y **performance** (LCP/CLS).

---

## 0) Objetivos y alcance

* Centralizar **95%+** de estilos en `app/globals.css`.
* Sistema de **tokens + utilidades + componentes base**, con **excepciones controladas**.
* Alternar temas por sección sin perder contraste.
* Mobile-first. Container fluido con gutters responsivos.
* Performance: LCP < 2.5s, CLS < 0.05, Unused CSS < 20%.
* Público objetivo: emprendedor urbano inicial (LATAM), foco en claridad y confianza.

---

## 1) Tokens globales (CSS variables)

*(sin cambios respecto a v1, ya implementados en `:root`)*

---

## 2) Temas y contraste

* `section--dark` / `--surface` remapean tokens `--fg`, `--fg-80`, `--fg-70`, `--fg-60` → **texto siempre accesible**.
* `section--light` remapea a tokens claros (`--text-on-light`, etc.).
* Formularios adaptados por tema (`.c-form-control` en light/dark).
* Contraste AA garantizado en botones, links y párrafos.

---

## 3) Reset y accesibilidad

* Reset mínimo y **focus-visible global** en links, botones, inputs.
* Helpers: `.sr-only`, `.sr-only-focusable`, `.u-visually-hidden`.
* `@media (prefers-reduced-motion: reduce)` desactiva animaciones.
* `::selection` accesible.
* Imágenes, SVG, video, canvas → `display:block; max-width:100%; height:auto`.
* Helpers de aspect ratio: `.u-aspect-1-1`, `.u-aspect-4-5`, `.u-aspect-16-9`.

---

## 4) Utilidades de layout

* `.container`, `.section`.
* **Stacks**: `.stack-2…6`.
* **Cluster**: `.cluster-3|4|5`.
* **Grid**: `.grid-2|3|4`, `.grid-auto`, `.grid-auto-lg`.
* **Helpers**:

  * Texto: `.u-center`, `.u-text-center`, `.u-center-text-block`, `.u-lead`, `.u-small`.
  * Dimensión: `.u-maxw-sm|md|lg|xl|xxl|prose`.
  * Flex: `.u-flex-center`.
  * Gap: `.u-gap-x-*`, `.u-gap-y-*`.
  * Listas: `.u-inline-list`, reset de listas `role="list"`.
  * Divisores: `.u-divider`, unificado con `.footer-divider`.

---

## 5) Componentes base

### 5.1 Links

* `.c-link`, `.c-link--nav`, `.c-link--muted`.
* Foco visible con outline en todos.
* Ajustes de color por tema (`section--light` vs `--dark`).

### 5.2 Botones

* `.c-btn` con tallas `--sm|--md|--lg`.
* Variantes: `--solid`, `--outline`, `--ghost`, `--pill`, `--icon`, `--block`.
* Estados: `:hover`, `:active`, `:disabled`, `[aria-busy]`.
* Accesibles con outline y animación de spinner en busy.

### 5.3 Cards y derivados

* Base común: `.c-card`, `.c-card--benefit`, `.c-pill`, `.c-step`.
* Variantes (`--light`, `--dark`, `--accentTop`, `benefit`, `pill`, `step`) sólo aportan fondo/bordes.
* Foco accesible unificado en todas.

### 5.4 Badges

* `.badge`, `.badge--live`, `.badge--accent`, `.badge--muted`.

### 5.5 Quotes

* `.c-quote` con `::before` en `--accent-strong`.

### 5.6 Formularios

* `.c-form-label`, `.c-form-control`, `.c-form-help`, `.c-form-error`.
* Adaptados a `section--dark` y `section--light`.
* Focus visible y colores accesibles en error/help.

---

## 6) Convenciones de naming

*(igual que v1, reforzado con nuevas utilidades documentadas)*

---

## 7) Prohibiciones

*(sin cambios, se mantiene la política de tokens y sin `!important`)*

---

## 8) Reglas de excepción

* CSS por sección solo en `/docs/excepciones.md`.
* Nuevas utilidades: justificadas por ≥3 repeticiones.
* Nuevos tokens: usados en ≥2 vistas.

---

## 9) Plan de migración

* Ya aplicado: Header, Footer, Home.
* Pendiente: Sobre mí (siguiente en roadmap).
* Se mantiene remap de legacy → `.c-*`.

---

## 10) QA y métricas

* Lighthouse Home: **CLS=0**, **LCP <2.5s**, **Unused CSS <20%**.
* Contraste AA validado.
* Focus visible en todos los interactivos.
* Mobile-first sin saltos ni overflows.

---

## 11) Mantenimiento y pendientes

* Migrar **FEATURED webinar** a Supabase (ver plan v1).
* Crear `/docs/excepciones.md` para gobierno de estilos especiales.

---

## 12) Registro de cambios

* **v1 (2025-09-21)**: Tokens, reset, utilidades y componentes iniciales.
* **v2 (2025-09-22)**: Consolidación completa de primitivos; unificación cards/btns; nuevas utilidades (`grid-auto`, `u-prose`, `u-inline-list`, gaps, aspect ratios); accesibilidad ampliada; footer refactor a tokens.
