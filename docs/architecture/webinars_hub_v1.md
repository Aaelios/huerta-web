# Webinars Hub v1 — Diseño Funcional y Técnico
Archivo: `docs/modulos/webinars_hub_v1.md`  
Autor: Solution Owner  
Versión: 1.0  
Fecha: 2025-10-13

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
  a) `v_products_public` para catálogo base  
  b) `v_prices_vigente` para precios vigentes  
  c) `live_class_instances` para próximas fechas por SKU
- El Front renderiza: destacados, filtros (tema, nivel), grid, precios y CTA.
- No se consulta `webinars.jsonc` en el Hub (se reserva para páginas de instancia y prelobby/email).

Principios:
- Server-first para data crítica (SSR / ISR con revalidate corto).
- Campos mínimos y estandarizados en `products.metadata`.
- Tabla de instancias para escalar múltiples fechas por webinar.

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

## 5. Lógica y Reglas de Negocio (BPX)

5.1. Visibilidad y compra:
- Un webinar aparece en el Hub si:  
  a) `products.status = active`  
  b) `products.visibility = public`  
  c) `fulfillment_type = live_class`
- CTA “Comprar” aparece si `purchasable = true` y existe precio activo.  
- Si `purchasable = false`, se muestra “Disponible en el módulo” con link al `module_sku`.

5.2. Destacados:
- `is_featured = true` lo coloca en la franja de destacados del Hub (no afecta Home Featured).

5.3. Filtros v1 del Hub:
- Tema (topics).  
- Nivel (level).  
- Orden: recientes (por start_at de la próxima instancia, si existiera; si no, por created_at) y precio.

5.4. Instancias:
- La página por **instancia** (URL actual) sigue igual.  
- En v1, el detalle por instancia puede mostrar “Otras fechas” consultando la tabla `live_class_instances`.

5.5. Upsell 1:1 sin carrito:
- Estrategia inicial: botón “Combo” que apunta a un **bundle SKU** (módulo + 1:1 o clase + 1:1).  
- No se combinan line_items “ad hoc” en v1 para evitar riesgo operativo.

5.6. Grants:
- No se cambia la lógica actual de concesión. La bandera `purchasable` solo impacta UI, no grants.

---

## 6. Interfaces y Endpoints (Técnico)

6.1. Endpoint de búsqueda del Hub
- Ruta: `/api/webinars/search`  
- Parámetros de consulta:  
  - `page` (número), `page_size`  
  - `topic` (string, repetible)  
  - `level` (string)  
  - `sort` (`recent|price_asc|price_desc`)  
- Respuesta: lista paginada con objetos de catálogo (sku, title, summary corta, price, level, topics, instructors, cover, purchasable, module_sku, próxima instancia si existe).

6.2. Fuentes de datos
- Catálogo base: `v_products_public` filtrado por `fulfillment_type='live_class'` y `visibility='public'`.
- Precios: `v_prices_vigente` por SKU en MXN (y USD futuro si existe).
- Instancias: `live_class_instances` por SKU para extraer `next_start_at` y “otras fechas”.

6.3. Contrato interno del objeto “item” del Hub
- Campos mínimos:
  - sku (string)
  - title (string, de products.name)
  - summary (string breve; si no existe, truncar description)
  - price_cents (int), currency (string)
  - level (string), topics (string[])
  - instructors (string[])
  - cover (string)
  - purchasable (bool)
  - module_sku (string|null)
  - next_start_at (ISO8601|null)
  - instance_count_upcoming (int)

6.4. Analítica
- Disparos GA4:
  - `view_item_list` al cargar `/webinars`.
  - `select_item` al click en card.
  - `filter_applied` y `sort_applied` con payload de facetas.

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

7.2. Tabla `live_class_instances` (nueva)
- id: uuid (pk)
- sku: text (fk lógico a products.sku)
- instance_slug: text (formato `yyyy-mm-dd-hhmm`, único por SKU)
- start_at: timestamptz
- timezone: text (IANA, ej. “America/Mexico_City”)
- status: text (`scheduled|open|sold_out|ended|canceled`)
- capacity: integer (nullable)
- seats_sold: integer (default 0)
- zoom_join_url: text (nullable)
- replay_url: text (nullable)
- notes: text (nullable)
- metadata: jsonb (default `{}`)
- created_at: timestamptz default now()
- updated_at: timestamptz default now()

Índices sugeridos:
- idx_instances_sku_start_at (sku, start_at desc)
- idx_instances_status (status)
- Unique parcial (sku, instance_slug)

Reglas de negocio:
- “Próxima fecha” por SKU = menor `start_at` ≥ now() con `status in (scheduled, open)`.
- “Otras fechas” = resto de futuras en el mismo conjunto de estados.

7.3. Reutilización futura
- La misma tabla puede modelar cohortes, re-estrenos VOD, o horarios alternos multi-zona horaria.
- Para tools/cursos, `instance_slug` podría reservarse o usarse como “drop date”.

---

## 8. Recomendaciones de Implementación (Técnico)

8.1. Modularidad (naming conventions Kairos)
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

8.2. SSR/ISR
- `/webinars` como Server Component con ISR `revalidate: 900` (15 min).
- Filtros en URL (`?topic=&level=&sort=`) con navegación ligera client-side.

8.3. Estados UI
- Skeletons para carga.
- Estado vacío con texto claro y botón “Ver todos”.
- Cards con badges: nivel, “Live”, “Solo en módulo”.

8.4. Imágenes
- `cover` optimizada <120KB.
- Aspecto 3:2 desktop y recorte seguro para móvil.

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
