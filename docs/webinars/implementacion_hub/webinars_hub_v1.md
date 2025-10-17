# Webinars Hub v1 — Diseño Funcional, Técnico y Visual
Archivo: `docs/modulos/webinars_hub_v1.md`  
Autor: Solution Owner  
Versión: 1.2  
Fecha: 2025-10-16

---

## 1. Propósito y Alcance (BPX)

Objetivo: habilitar una página **/webinars** que liste múltiples webinars con filtros y orden, sin romper flujos existentes (Home Featured, Ventas por instancia, Checkout, Gracias, Prelobby, Email).  
Alcance v1:
- Listado navegable y filtrable de webinars activos.
- Datos de catálogo desde Supabase (products + prices + metadata).
- Convivencia con `webinars.jsonc` para copy y lógica actual.
- Instancias de cada webinar modeladas en tabla dedicada, usadas en v1 para “Otras fechas” y para el Hub.
- Sin “Mis compras” por ahora. Sin membresías. Sin carrito.

Fuera de alcance v1:
- Cambio de URLs existentes.
- Migración completa de `webinars.jsonc` a tablas de copy.
- Checkout con múltiples line_items “ad hoc” (se usará bundle predefinido para combos).

Resultados esperados:
- `/webinars` visible, rápido y estable.
- Alta de nuevos webinars sin tocar código (solo metadatos y precios).
- No regressions en Home, Ventas por instancia, Prelobby, Email, Gracias.

---

## 2. Resumen de Contexto (BPX)

Piezas ya en producción:
- Home lee “featured webinar” desde `webinars.jsonc` (flags.featuredHome y startAt).
- Página de ventas por instancia en `/webinars/yyyy-mm-dd-hhmm` consume `webinars.jsonc`.
- Checkout y Gracias trabajan con `SKU` y `session_id` desde Stripe/Supabase.
- Prelobby y Email usan slugs de instancia y textos del JSONC.

Definiciones clave v1:
- Mantener URLs actuales y contratos existentes.
- El nuevo Hub lee catálogo desde Supabase y **no** altera Home, Instancias, Prelobby ni Emails.
- `webinars.jsonc` sigue siendo fuente de copy y labels en las piezas 1–6.

---

## 3. Arquitectura Funcional (BPX)

Flujo de datos:
- Frontend `/webinars` solicita a la API interna un listado paginado de webinars con filtros.
- La API consulta Supabase:  
  a) `products` (catálogo base)  
  b) `v_prices_vigente` para precios vigentes  
  c) `live_class_instances` para próximas fechas por SKU
- El Front renderiza: destacados, filtros (tema, nivel), grid, precios y CTA.
- No se consulta `webinars.jsonc` en el Hub (se reserva para páginas de instancia y prelobby/email).

Principios:
- Server-first para data crítica (SSR / ISR con revalidate corto).
- Campos mínimos y estandarizados en `products.metadata`.
- Tabla de instancias para escalar múltiples fechas por webinar.


### 3.1. Diseño UI y Layout (actualizado)

La página `/webinars` adopta un layout híbrido entre hero y listado, con un encabezado compacto que reduce el padding vertical respecto a otras páginas de nivel superior.

**Bloques principales:**
1. **Encabezado hero compacto** (`<header className="l-hero--compact">`)
   - Usa la nueva clase global `.l-hero--compact` agregada a `globals.css`.
   - Reduce `padding-block` a `40px 0` (desktop) y `32px 0` (mobile), evitando el exceso de espacio entre secciones.
   - Soporta resaltado de texto mediante el helper `renderAccent()` con sintaxis `[[texto]] → <span class="accent">texto</span>`.
   - Ejemplo: `Webinars [[LOBRÁ]]` con las palabras clave destacadas por color de acento (`--accent`).

2. **Bloque de destacados ("Alta demanda")**
   - Presenta los productos `is_featured=true`.
   - Mantiene jerarquía tipográfica superior a los módulos e individuales:
     - Título: `clamp(1.375rem, 1.05rem + 1.6vw, 2.25rem)`
     - Precio: `20px`
     - CTA: `17px`

3. **Bloques siguientes**
   - `Módulos completos` y `Clases individuales` comparten estructura de cards uniforme, coherente en densidad y alineación.
   - Los metadatos (nivel, fecha, tema) se agrupan con `display:flex; flex-wrap:wrap` para lograr consistencia en todos los anchos.

**Resultado visual esperado:**
- Menor espacio vacío superior entre header y contenido.
- Mayor cohesión entre tipografía, CTA y cards.
- Alineación vertical uniforme entre “Alta demanda”, “Módulos completos” y “Clases individuales”.

---

## 4. Modelo de Datos (BPX + guía alta nivel)

4.1. Metadatos mínimos en `products.metadata` para webinars:
- product_slug: identificador lógico del producto (no URL pública en v1).
- level: basico | intermedio | avanzado.
- topics: lista de temas, p. ej. ["finanzas"].
- tags: lista libre para micro-agrupaciones.
- instructors: lista de slugs de instructor, p. ej. ["roberto-huerta"].
- duration_min: número.
- cover: ruta de imagen del card del Hub.
- is_featured: booleano para carrusel o fila de destacados.
- module_sku: SKU del bundle/módulo al que pertenece o vacío.
- purchasable: booleano; si false, no se muestra CTA “Comprar” y se sugiere el módulo.

4.2. Nueva tabla `live_class_instances` (propósito funcional):
- Registrar cada **fecha/horario** de un webinar sin duplicar el producto.
- Reutilizable para cohortes y “estrenos” de VOD en futuras fases.
- Campos y estados detallados en la sección 7 (técnica).

4.3. Relación con bundles y precios:
- Módulos existentes se modelan con `bundles` y `bundle_items`.
- Precios vigentes se leen de `v_prices_vigente` por SKU.
- No se usa JSONC para precio.

---

5.1. Visibilidad y compra

Un webinar o módulo aparece en el Hub si:
  a) products.status = active  
  b) products.visibility = public  
  c) fulfillment_type ∈ ('live_class','bundle','course')

Reglas:
- Los 'live_class' se listan con paginación y filtros.  
- Los 'bundle' y 'course' se incluyen en el resultado principal, pero sin paginación.  
- CTA “Comprar” aparece si purchasable=true y existe precio activo.  
- Si purchasable=false, se muestra “Solo en módulo” con link a module_sku.landing_slug.
- El Hub ya no usa webinars.jsonc para rutas; los slugs provienen de page_slug (en backend).


5.2. Destacados

- Los productos con is_featured=true se devuelven en featured_items.
- featured_items ignora filtros y paginación.
- Siempre se renderiza al inicio del Hub, visible independientemente de topic o level.
- No afecta el “Home Featured” ni los destacados de portada.


5.3. Filtros y orden

Facetas:
- topic: multiselección global (bundle, course, live_class)
- level: selección única (solo live_class)
- sort: aplica solo a live_class

Reglas:
- Al cambiar filtros o sort, se reinicia page=1.
- featured_items permanecen visibles sin importar filtros.
- facets.topics y facets.levels son globales (no dependen de filtros).


5.4. Facetas globales

El backend genera:
{
  "facets": {
    "topics": ["finanzas","ia","rh"],
    "levels": ["basico","intermedio","avanzado"]
  }
}

Estas facetas se muestran siempre en la barra de filtros.  
Los filtros nunca “desaparecen” tras aplicar uno nuevo.


---

5.5. Instancias:
- La página por **instancia** (URL actual) sigue igual.  
- En v1, el detalle por instancia puede mostrar “Otras fechas” consultando la tabla `live_class_instances`.

5.6. Upsell 1:1 sin carrito:
- Estrategia inicial: botón “Combo” que apunta a un **bundle SKU** (módulo + 1:1 o clase + 1:1).  
- No se combinan line_items “ad hoc” en v1 para evitar riesgo operativo.

5.7. Grants:
- No se cambia la lógica actual de concesión. La bandera `purchasable` solo impacta UI, no grants.

---

## 6. Interfaces y Endpoints (Técnico)


### 6.1. Endpoint de búsqueda del Hub

Ruta: /api/webinars/search
Método: GET

Parámetros:
- page, page_size
- topic (repetible)
- level
- sort (recent | price_asc | price_desc | featured)

Respuesta:

{
  "ok": true,
  "params": { ... },
  "data": {
    "page": 1,
    "page_size": 12,
    "total": 8,                     // solo live_class
    "items": [...],                 // mezcla: live_class (paginados) + bundle/course (no paginados)
    "featured_items": [...],        // destacados globales
    "facets": {
      "topics": ["finanzas"],
      "levels": ["basico","intermedio","avanzado"]
    }
  }
}

---

### 6.2. Fuentes de datos  (agregar línea final)

* Instancias: `f_webinars_resumen(sku, max)` expuesta como RPC segura para obtener `next_start_at` y “otras fechas”.

---

### 6.3. Contrato interno del objeto “item”
 
{
  "sku": string,
  "title": string,
  "summary": string | null,
  "cover": string | null,
  "level": string | null,
  "topics": string[],
  "module_sku": string | null,
  "purchasable": boolean,
  "price_cents": integer | null,
  "currency": string | null,
  "next_start_at": string | null,
  "instance_count_upcoming": integer,
  "featured": boolean,
  "fulfillment_type": "live_class" | "bundle" | "course" | "one_to_one",
  "landing_slug": string,
  "instance_slug": string | null
}


---

6.4. Analítica
- Disparos GA4:
  - `view_item_list` al cargar `/webinars`.
  - `select_item` al click en card.
  - `filter_applied` y `sort_applied` con payload de facetas.
  - Cuando se apliquen filtros o se cambie el orden, los eventos GA4 (`filter_applied`, `sort_applied`) deben incluir los valores actuales de `topics[]` y `level` aunque los destacados (`featured_items`) no cambien.


---

### 6.5. Reglas de “precio vigente” (ajustada)

* Fuente: vista `v_prices_vigente`.
* Filtros base: `sku`, `active=true`.
* Moneda preferida: `MXN`; fallback `USD` si no hay MXN.
* Prioridad:

  1. Promos vigentes (`price_list!='default'` dentro de ventana).
  2. Precios vigentes sin fin; prefieren no-default.
  3. Default sin vigencia.
  4. Fallback: más reciente por `valid_from DESC`.

* El campo `interval` puede variar; la lógica actual no lo filtra explícitamente.  
* Checkout: Stripe es autoridad; la UI muestra `v_prices_vigente`.

---

## 7. Modelo de Datos Detallado (Técnico)

7.1. `products.metadata` — llaves estándar para webinars
- product_slug: string
- level: string (“basico|intermedio|avanzado”)
- topics: string[]
- tags: string[]
- instructors: string[] (slugs)
- duration_min: number
- cover: string
- is_featured: boolean
- module_sku: string|null
- purchasable: boolean

Notas:
- Mantener coherencia de `sku`, `fulfillment_type='live_class'`, `visibility='public'`.
- `name` y `description` deben ser claros y sin HTML extenso.

Versión actualizada del documento con los cambios confirmados en este chat y el seed al final:

---

# Webinars Hub v1 — Diseño Funcional y Técnico

Archivo: `docs/modulos/webinars_hub_v1.md`
Autor: Solution Owner
Versión: 1.1
Fecha: 2025-10-13

---

## 7.2. Tabla `live_class_instances` (actualizada)

**Propósito:** registrar cada fecha/horario de un webinar sin duplicar el producto.
Se usa para determinar la “próxima fecha” y listar “otras fechas” en el Hub o dentro de la página de instancia.

**Estructura final:**

| Campo         | Tipo        | Descripción                                                      |      |          |       |            |
| ------------- | ----------- | ---------------------------------------------------------------- | ---- | -------- | ----- | ---------- |
| id            | uuid        | Primary key (`gen_random_uuid()`)                                |      |          |       |            |
| sku           | text        | SKU lógico (alineado a `products.sku` y a Stripe). No FK física. |      |          |       |            |
| instance_slug | text        | Identificador corto `yyyy-mm-dd-hhmm`, único por SKU.            |      |          |       |            |
| status        | text        | `scheduled                                                       | open | sold_out | ended | canceled`. |
| title         | text        | Opcional; variante visible en UI.                                |      |          |       |            |
| start_at      | timestamptz | Fecha/hora real de inicio en UTC.                                |      |          |       |            |
| end_at        | timestamptz | Fin real en UTC.                                                 |      |          |       |            |
| timezone      | text        | Default `'America/Mexico_City'` (`SITE_TZ`).                     |      |          |       |            |
| capacity      | integer     | Default 10. Null = ilimitado (futuro).                           |      |          |       |            |
| seats_sold    | integer     | Default 0.                                                       |      |          |       |            |
| zoom_join_url | text        | Sensible; no se expone públicamente.                             |      |          |       |            |
| replay_url    | text        | Sensible; no se expone públicamente.                             |      |          |       |            |
| metadata      | jsonb       | Default `'{}'`.                                                  |      |          |       |            |
| created_at    | timestamptz | Default `now()`.                                                 |      |          |       |            |
| updated_at    | timestamptz | Nullable, auditado por trigger.                                  |      |          |       |            |

**Constraints y reglas:**

* `instance_slug` debe cumplir `^\d{4}-\d{2}-\d{2}-\d{4}$`.
* `status` limitado a los valores válidos.
* `seats_sold ≤ capacity` cuando `capacity` no es null.
* `start_at ≥ now()` para estados abiertos o programados (regla lógica, no trigger).
* `timezone` usa `SITE_TZ` por default.

**Índices:**

* `ux_live_class_instances__sku_slug` (unique).
* `idx_live_class_instances__sku_start_at_desc` (sku, start_at desc).
* `idx_live_class_instances__status` (status).

**Auditoría:**

* Trigger `trg_live_class_instances__updated_at` → `public.f_audit_set_updated_at()`.

**RLS y seguridad:**

* RLS habilitado.
* Política única: acceso completo solo para `service_role`.
* Lectura pública solo mediante RPC seguro.

**Contrato RPC público:**

* `f_webinars_resumen(p_sku text, p_max int = 5)`

  * Tipo: `jsonb`.
  * Security Definer, `stable`.
  * Devuelve:

    ```json
    {
      "sku": "...",
      "generated_at": "...",
      "timezone": "America/Mexico_City",
      "next_instance": {...} | null,
      "future_instances": [ ... ]
    }
    ```
  * Nunca incluye `zoom_join_url` ni `replay_url`.
  * Diseñado como único endpoint para el Hub y para “otras fechas”.

**Diseño de integridad:**

* Sin FK a `products.sku` para evitar acoplamiento y permitir migraciones ligeras.
* Validación lógica de existencia del SKU se hará a nivel de aplicación o función.
* En el futuro podría añadirse una validación `exists()` diferida o constraint lógica.

---


7.3. Reutilización futura
- La misma tabla puede modelar cohortes, re-estrenos VOD, o horarios alternos multi-zona horaria.
- Para tools/cursos, `instance_slug` podría reservarse o usarse como “drop date”.

---

## 8. Recomendaciones de Implementación (Técnico)

### 8.1. Modularidad (naming conventions Kairos)
- Módulo de negocio catálogo: `m_catalogo`
  - Función lectura productos: `f_catalogoListaWebinars`
  - Función mapeo a DTO del Hub: `f_catalogoMapItemWebinar`
- Módulo instancias: `m_instancias`
  - Próxima instancia por SKU: `f_instanciaProximaPorSku`
  - Otras fechas por SKU: `f_instanciasFuturasPorSku`
- Módulo precios: `m_precios`
  - Precio vigente por SKU: `f_precioVigentePorSku`
- Módulo filtros: `m_filtros`
  - Normaliza parámetros: `f_normalizaFiltrosWebinars`
  - Construye orden: `f_construyeOrdenListado`
- Módulo analítica: `m_analitica`
  - Eventos del Hub: `f_analiticaTrackListado`, `f_analiticaTrackFiltro`, `f_analiticaTrackSeleccion`

Nota: prefijos y formato siguen `nomenclatura_kairos.md`. Evitar nombres genéricos sin prefijo.

### 8.2. SSR / ISR

- /webinars es Server Component con revalidate: 900 (ISR cada 15 min).  
- fetch('/api/webinars/search', { cache: 'no-store', next: { revalidate: 900 } })  
- Filtros manejan navegación client-side con actualización del querystring.  
- FEATURE_WEBINARS_HUB controla visibilidad en cada entorno.



### 8.3. Estados UI

- Sección fija: Destacados → siempre visible si existen.
- Filtros → siempre visibles (facetas globales).
- Grid de resultados: 
  * Bloque 1: Módulos y bundles
  * Bloque 2: Clases individuales (con paginación)
- Estado vacío: texto “No hay resultados con los filtros seleccionados” + botón “Ver todos”.
- CTA:
  * “Ver instancia” → /webinars/[instance_slug]
  * “Ver módulo” → landing_slug (bundle/course)

#### 8.3.1. Header hero compacto

- El header usa la clase global `.l-hero--compact` (derivada de `.l-hero`) definida en `globals.css`.
- Su propósito es evitar el doble padding de 64 px superior + 64 px inferior observado entre bloques `.section`.
- Padding final efectivo: **40 px (desktop)** / **32 px (mobile)**.
- Implementación en `page.tsx`:

  ```tsx
  <header className="l-hero--compact">
    <h1>{renderAccent("Webinars [[LOBRÁ]]")}</h1>
    <p>
      {renderAccent("Explora [[workshops en vivo]], [[módulos]] y [[bundles]]. Filtra por tema y nivel. Compra individual o en paquete.")}
    </p>
  </header>

### 8.4. Imágenes
- `cover` optimizada <120KB.
- Aspecto 3:2 desktop y recorte seguro para móvil.

### 8.5. Refinamiento Visual / UX v1 (2025-10-16)

**Objetivo:** unificar jerarquía visual, densidad y consistencia en /cards y layouts del Hub sin cambiar lógica ni contratos de datos.

**Ajustes principales**
- Tipografía heredada Satoshi (700 en titles, 600 en CTA).  
- Ratio 16:9 uniforme en covers y skeletons.  
- Spacing base 16–24 px según breakpoint.  
- Transiciones de 150 ms (`transform` + `box-shadow`).  
- Jerarquía CTA por tipo: 14 px (base), 15 px (bundles), 17 px (featured).  
- Grids adaptativos: 1–2–3 cols según viewport (481 / 1024 / 1280).  
- Color de acento #50C878 → sombra rgba(0,0,0,.35).  
- Contraste AA verificado (8.13:1).  
- Foco visible en CTA y filtros.  
- `alt` presente pero dinámico pendiente de campo en Supabase (`cover_alt`).  

**Estado**
| Aspecto | Resultado |
| --------- | ----------- |
| Tipografía y espaciado | OK |
| Grillas y responsive | OK |
| Skeleton / loading | OK |
| Microinteracciones | OK |
| Accesibilidad AA | OK |
| Alt dinámico | Pendiente (backend) |

**Archivos afectados**
`app/webinars/page.tsx`, `components/webinars/hub/*`, `app/globals.css`, `public/images/webinars/*/hub.jpg`

---

## 9. Matriz de Reglas y Pruebas (Técnico)

9.1. Matriz de banderas → comportamiento
- status=active, visibility=public, purchasable=true, price.active=true → Mostrar card + “Comprar”.
- status=active, visibility=public, purchasable=false → Mostrar card + “Disponible en el módulo”.
- visibility=hidden → No listarlo en el Hub. Grants no afectados si el SKU se compra por bundle o link directo.
- status!=active → No listarlo. No vender.

9.2. Casos funcionales mínimos
- Listar al menos 4 webinars con precio y nivel visibles.
- Filtrar por topic=“finanzas” y level=“basico”.
- Orden por recientes cambia el orden.
- Card de “planeación” con purchasable=false muestra CTA al módulo y NO muestra “Comprar”.
- Hub no altera Home Featured, Venta por instancia, Prelobby, Email, Checkout, Gracias.

9.3. Regresión
- Home sigue mostrando su featured desde JSONC.
- `/webinars/yyyy-mm-dd-hhmm` sigue renderizando con JSONC.
- Prelobby y Email sin cambios de copy ni rutas.

---

## 10. Checklist de Despliegue y Rollback (Técnico)

10.1. Despliegue
- Crear tabla `live_class_instances` vacía.
- Completar `products.metadata` para los SKUs `liveclass-*` con campos mínimos.
- Verificar `v_prices_vigente` activo para cada SKU listado.
- Publicar `/webinars` (feature flag ON).
- Activar analítica (GA4: view_item_list, select_item, filter_applied).
- QA: carga del Hub, filtros, precio, CTAs, no-roturas en piezas 1–6.

10.2. Rollback
- Apagar feature flag del Hub.
- Mantener tabla `live_class_instances` y metadatos (no rompen).
- Confirmar que Home/Instancias/Prelobby/Email/Checkout/Gracias operan normal.

10.3. Operación
- Alta de webinar:  
  a) Crear producto + precio en Stripe.  
  b) Insertar/actualizar `products` y `product_prices`.  
  c) Completar `products.metadata` mínimos del Hub.  
  d) (Opcional) Insertar instancia en `live_class_instances`.  
  e) Ajustar `webinars.jsonc` solo para copy de la instancia.


### 10.4. Feature flag  (reemplazar tabla)

| Variable             | Valor actual | Entorno         | Descripción                         |
| -------------------- | ------------ | --------------- | ----------------------------------- |
| FEATURE_WEBINARS_HUB | false        | PROD            | Desactiva endpoint y UI del Hub     |
| FEATURE_WEBINARS_HUB | true         | PREVIEW / LOCAL | Activa endpoint y UI del Hub        |
| ALLOW_DEV_TESTS      | 1            | PREVIEW / LOCAL | Habilita rutas `/dev/test-webinars` |

---

## Apéndice A. Asignaciones sugeridas para SKUs actuales (referencia rápida)

- liveclass-lobra-rhd-fin-ingresos-v001  
  level=basico; topics=["finanzas"]; instructors=["roberto-huerta"]; duration_min=90; purchasable=true; module_sku="course-lobra-rhd-fin-finanzas-v001"; is_featured=true

- liveclass-lobra-rhd-fin-egresos-v001  
  level=basico; topics=["finanzas"]; instructors=["roberto-huerta"]; duration_min=90; purchasable=true; module_sku="course-lobra-rhd-fin-finanzas-v001"

- liveclass-lobra-rhd-fin-reportes-v001  
  level=intermedio; topics=["finanzas"]; instructors=["roberto-huerta"]; duration_min=90; purchasable=true; module_sku="course-lobra-rhd-fin-finanzas-v001"

- liveclass-lobra-rhd-fin-planeacion-v001  
  level=avanzado; topics=["finanzas"]; instructors=["roberto-huerta"]; duration_min=90; purchasable=false; module_sku="course-lobra-rhd-fin-finanzas-v001"

- one2one-lobra-rhd-030m-v001  
  type one_to_one; mostrar como upsell mediante bundle

- course-lobra-rhd-fin-finanzas-v001  
  bundle/módulo; no se lista en Hub de webinars; se usa para upsell y landing del programa

---
## Apéndice B. Seed PREVIEW

```sql
-- SEED PREVIEW · instancias iniciales de webinars
insert into public.live_class_instances
(sku, instance_slug, status, start_at)
values
('liveclass-lobra-rhd-fin-ingresos-v001', '2025-10-21-2030', 'scheduled', '2025-10-21 20:30:00+00');

insert into public.live_class_instances
(sku, instance_slug, status, start_at)
values
('liveclass-lobra-rhd-fin-egresos-v001', '2025-10-28-2030', 'scheduled', '2025-10-28 20:30:00+00');

insert into public.live_class_instances
(sku, instance_slug, status, start_at)
values
('liveclass-lobra-rhd-fin-reportes-v001', '2025-11-04-2030', 'scheduled', '2025-11-04 20:30:00+00');

insert into public.live_class_instances
(sku, instance_slug, status, start_at)
values
('liveclass-lobra-rhd-fin-planeacion-v001', '2025-11-11-2030', 'scheduled', '2025-11-11 20:30:00+00');
```

### Apéndice C. Rutas de prueba (nuevo)

* `/dev/test-webinars?module=filtros&topic=finanzas&level=basico&sort=featured&page=1&page_size=12`
* `/dev/test-webinars?module=instancias&sku=<SKU>&max=5`
* `/dev/test-webinars?module=precio&sku=<SKU>&currency=MXN`
* `/dev/test-webinars?module=catalogo&topic=finanzas&level=basico&sort=recent&page=1&page_size=12`
* `/api/webinars/search`
* `/api/webinars/search?topic=finanzas&level=basico&sort=recent`
* `/api/webinars/search?sort=price_desc`
* `/api/webinars/search?page=2&page_size=5`

---

## Apéndice D. Estilos globales nuevos

Se añadió al archivo `globals.css` el siguiente bloque:

```css
/* Variante compacta del hero para páginas de listados (ej. /webinars) */
.l-hero--compact {
  padding-block: 40px 0;
}
@media (max-width: 767px) {
  .l-hero--compact {
    padding-block: 32px 0;
  }
}
Propósito:

Reducir el exceso de espacio vertical en páginas de tipo listado (como /webinars).

Mantener coherencia con .l-hero original sin alterar otras secciones.

Utilizado como encabezado visual compacto en módulos tipo Hub.

**Notas de paridad visual v1.2**
- Incorpora cambios del archivo `WebinarsHub.module.css v2.5.5`.  
- Se revisaron contrastes, focos y ratio de imagen.  
- Se mantiene pendiente la propagación de `cover_alt` desde Supabase para cumplimiento AA pleno.  


---
