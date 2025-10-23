# 🧭 Infraestructura Común — Embudo LOBRÁ

**Versión:** v1.0.0
**Autor:** Solution Owner — Huerta Consulting
**Última actualización:** 2025-10-22

---

## 🎯 Objetivo general

Centralizar todas las piezas **no visuales** del embudo: DTOs, mapeadores, fetchers y utilidades.
Estas funciones **no renderizan**, **no exponen rutas**, y **no dependen del cliente**.
Su regla base es: **“proveer datos, no mostrarlos.”**

---

## 📁 Estructura de módulos

| Orden | Archivo                                                        | Descripción breve                             | Tipo                   |
| :---: | :------------------------------------------------------------- | :-------------------------------------------- | :--------------------- |
|   1   | [`dto-catalog.md`](./dto-catalog.md)                           | Contratos canónicos y tipos base del catálogo | `dto`                  |
|   2   | [`mappers-catalog.md`](./mappers-catalog.md)                   | Normalización Supabase / JSONC → DTOs         | `mapper`               |
|   3   | [`getProductPublicBySku.md`](./getProductPublicBySku.md)       | Fetcher base de productos públicos            | `fetcher`              |
|   4   | [`getPriceBySku.md`](./getPriceBySku.md)                       | RPC de precios vigentes (centavos)            | `fetcher`              |
|   5   | [`getInstancesSummaryBySku.md`](./getInstancesSummaryBySku.md) | RPC de instancias futuras (live_class)        | `fetcher`              |
|   6   | [`getFeatured.md`](./getFeatured.md)                           | Orquestador principal del ítem destacado      | `fetcher/orchestrator` |
|   7   | [`seo-emitJSONLD.md`](./seo-emitJSONLD.md)                     | Generador JSON-LD para SEO estructurado       | `utility`              |
|   8   | [`analytics-track.md`](./analytics-track.md)                   | Capa central de tracking con antirrebote      | `utility`              |
|   9   | [`format.md`](./format.md)                                     | Utilidades genéricas de formato               | `utility`              |

---

## ⚙️ Principios técnicos

1. **Server-only**: Todos los módulos se ejecutan en el servidor o en Server Components.
2. **Compatibilidad progresiva**: Si Supabase falla, los fetchers pueden hacer fallback a JSONC.
3. **Sin dependencias externas** (excepto Supabase).
4. **ESLint estricto**: prohibido `any`, se usa `unknown` + *type narrowing*.
5. **DTOs como contrato de verdad**: ningún componente o página debe depender directamente de Supabase o JSONC.

---

## 🧩 Relación jerárquica

```
(dto) catalog.ts
   ↓
(mapper) catalog.ts
   ↓
(fetchers) getProductPublicBySku → getPriceBySku → getInstancesSummaryBySku
   ↓
(orchestrator) getFeatured
   ↓
(utilities) emitJSONLD, track, format
```

---

## 🧱 Cómo extender la infraestructura

1. **Agregar un nuevo tipo de producto o fuente**

   * Crear DTO nuevo en `dto/catalog.ts`.
   * Añadir mapper correspondiente en `mappers/`.
   * Implementar fetcher que devuelva ese DTO.

2. **Agregar nueva utilidad**

   * Colocar en `/lib/utils/` o `/lib/format/`.
   * Documentar en esta carpeta `docs/embudo_modulos/infra`.

3. **No romper contratos existentes**

   * Si cambias una firma, agrega un wrapper (`getFeaturedSafe()`).

---

## 🧩 Convención de rutas y naming

* Todas las rutas internas siguen el prefijo `/lib/`.
* DTOs y mapeadores usan `camelCase`.
* Fetchers comienzan con `get*`.
* Utilidades funcionales comienzan con `emit*`, `format*`, `track*`.

---

## 🧭 Próximas ampliaciones

* `searchPublicProducts()` — búsqueda general (Chat 2.2).
* `bundleSchedule` — próxima fecha agregada para bundles.
* `analytics.sendToGTM()` — versión avanzada del tracker.

---

## 🗂 Documentos relacionados

* **Entorno Supabase Preview:** `docs/env_preview.md`
* **Documento maestro del embudo:** `docs/documento maestro embudo.txt`
* **Plan de control de implementación:** `docs/control_implementacion_embudo.md`

---

## 🔗 Dependencias cruzadas

| Módulo | Depende de | Usado por |
|---|---|---|
| **dto/catalog** | — | mappers/catalog, emitJSONLD, format, track |
| **mappers/catalog** | dto/catalog | getFeatured |
| **getProductPublicBySku** | Supabase (`v_products_public`) | getFeatured, searchPublicProducts |
| **getPriceBySku** | Supabase RPC (`f_catalog_price_by_sku`) | getFeatured |
| **getInstancesSummaryBySku** | Supabase RPC (`f_webinars_resumen`) | getFeatured |
| **getFeatured** | mappers/catalog, getProductPublicBySku, getPriceBySku, getInstancesSummaryBySku | Home Featured, Hub, Sales Pages |
| **emitJSONLD** | dto/catalog | Sales Pages, SEO Head |
| **track** | — | Home, Hub, Sales, CTA components |
| **format** | dto/catalog | Todos los renderizadores (price/date) |

---