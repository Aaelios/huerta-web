# Plan Técnico · Implementación m-detalle (módulos/bundles)

## 1. Alcance cerrado

- Solo se cambia **UNA** página existente:  
  `app/webinars/[slug]/page.tsx`
- Todo lo demás son **archivos nuevos**.
- Verdad de producto (hijos, precios, fechas) = **Supabase**.
- JSON = **solo copy/UI**.

---

## 2. Checklist previo (antes de escribir código)

1. Confirmar en Supabase:
   - Tabla `products` tiene:
     - `sku` del bundle.
     - `page_slug = 'webinars/ms-tranquilidad-financiera'`.
     - `fulfillment_type = 'bundle'`.
   - Existe relación en `bundles` + `bundle_items` para ese `sku`.
   - RPCs disponibles:
     - `f_bundles_expand_items`
     - `f_catalog_price_by_sku`
     - (opcional) `f_bundle_children_next_start` / `f_bundle_next_start_at`.

2. Definir lista cerrada de SKUs que entran en esta fase:
   - Bundle: `course-lobra-rhd-fin-finanzas-v001`.
   - Hijos: 4 webinars financieros.

---

## 3. Archivos nuevos (definición y responsabilidad)

### 3.1 `data/views/sales_pages.jsonc`
**Rol:** fuente de copy de venta por `sku`.

Contendrá entradas al menos para:
- `course-lobra-rhd-fin-finanzas-v001` (módulo).
- Opcional: los 4 webinars hijos.

Responsabilidad:
- Título, subtítulo, hero, bullets, beneficios, incluye, para quién, SEO.

> En el chat de implementación te preguntaré:  
> “¿Quieres ahora el JSON base para `sales_pages` o empezamos por el loader?”

---

### 3.2 `lib/modules/loadModuleDetail.ts`
**Rol:** único punto de orquestación de datos para m-detalle.

Responsabilidades:

1. Entrada: `slug` (`ms-tranquilidad-financiera`).
2. Resolver en Supabase:
   - Buscar en `products` por `page_slug`:
     - Confirmar `fulfillment_type = 'bundle'`.
     - Obtener `sku` del bundle.
3. Obtener composición:
   - Llamar `f_bundles_expand_items(sku)`:
     - Lista de `child_sku`, tipo, etc.
4. Obtener precios:
   - `precioPaquete`:
     - `f_catalog_price_by_sku(bundle_sku, currency)`.
   - `precioRegular`:
     - Para cada `child_sku` vendible individualmente:
       - `f_catalog_price_by_sku(child_sku, currency)`.
       - Sumar `amount_cents`.
5. Obtener copy de marketing:
   - Leer `data/views/sales_pages.jsonc`.
   - Tomar la entrada del `bundle_sku`.
   - (Opcional) También de cada `child_sku` para títulos/bullets de las clases.
6. Construir un DTO único para el front, por ejemplo:
   - `module`:
     - `sku`, `slug`, `precioPaquete`, `precioRegular`.
     - `hero`, `beneficios`, `incluye`, `paraQuien`, `seo`.
   - `clases`:
     - Por cada hijo:
       - `sku`, `tipo`, `titulo`, `bullets`, `slugDetalle` (`/webinars/[slugHijo]`).

---

### 3.3 Componentes UI

Carpeta nueva: `components/modules/`

1. `ModuleHero.tsx`
   - Props: hero + precios + CTA (`ctaHref`, `ctaText`).
   - Usa solo datos del DTO de `loadModuleDetail`.

2. `ModuleSummary.tsx` (o similar)
   - Props: `beneficios`, `incluye`, `paraQuien`.

3. `ModuleClasses.tsx`
   - Props: lista de clases:
     - título, bullets, slug detalle, indicador de “incluido en el módulo”.

4. `ModuleLayout.tsx`
   - Componente “page-level” que orquesta:
     - Hero
     - Summary
     - Classes
     - FAQs (si se usan)

> En el chat de implementación te preguntaré:  
> “¿Quieres primero el código de `ModuleHero` o de `loadModuleDetail`?”  
> Y también si quieres solo la parte nueva o el archivo completo.

---

## 4. Único archivo existente a modificar

### 4.1 `app/webinars/[slug]/page.tsx`

Cambios estructurados:

1. **Resolver slug:**
   - Igual que hoy.

2. **Intentar tratarlo como módulo:**
   - Llamar a `loadModuleDetail(slug)`:
     - Si responde “es bundle” → renderizar layout de módulo.
     - Si responde “no encontrado / no es bundle” → fallback al flujo actual.

3. **Rama módulo:**
   - Usar DTO de `loadModuleDetail`.
   - Renderizar:
     - `<ModuleLayout dto={...} />`.

4. **Rama webinar (actual):**
   - Mantener:
     - `getWebinar(slug)`
     - `SalesHero`
     - `SalesClase`.

5. **SEO (`generateMetadata`):**
   - Intentar primero SEO del módulo (usando `sales_pages` o `loadModuleDetailLight`).
   - Si no hay módulo, usar `w.sales.seo` como hoy.

---

## 5. Secuencia de implementación (en el próximo chat)

Orden recomendado:

1. **Paso 1 — JSON de vistas**
   - Crear `data/views/sales_pages.jsonc` con 1 entrada de bundle.
   - Validar estructura mínima.

2. **Paso 2 — Loader de módulo**
   - Crear `lib/modules/loadModuleDetail.ts`:
     - Sin UI, solo DTO.
     - Simular llamadas Supabase si es necesario al inicio, luego conectar.

3. **Paso 3 — Componentes UI**
   - Crear `ModuleHero`, `ModuleSummary`, `ModuleClasses`, `ModuleLayout`.
   - Trabajar solo con el DTO del loader.

4. **Paso 4 — Integración en `[slug]/page.tsx`**
   - Añadir lógica “try module → else webinar”.
   - Integrar SEO condicional.

5. **Paso 5 — Pruebas**
   - `/webinars/ms-tranquilidad-financiera`:
     - Carga sin errores.
     - Muestra precios correctos (bundle vs suma).
     - Enlaces a clases hijas correctos.
     - CTA al checkout correcto.
   - `/webinars/w-*`:
     - Siguen comportándose exactamente igual.

6. **Paso 6 — Revisión final**
   - Confirmar que:
     - No se tocó checkout.
     - No se tocó hub.
     - No se tocó webhooks.
     - No se duplicaron precios ni composición en JSON.

---

## 6. Reglas para el chat de implementación

- Siempre que vayamos a escribir código:
  - Te preguntaré antes:  
    - “¿Quieres ahora el código de `<archivo>` o `<otro archivo>`?”  
    - “¿Quieres solo el bloque nuevo o el archivo completo?”
- Nunca se entregarán más de **un bloque de código** a la vez.
- Empezaremos por el archivo que tú elijas según este plan.

