# ServiceDetail · DTO  
**Propósito:** entregar a la página `/servicios/[slug]` toda la información necesaria para renderizar:

- Modo **info** (cuando llega desde módulo).  
- Modo **buy** (cuando llega desde email, prelobby o venta directa).  
- Hero + copys de la página.  
- Lista de variantes (SKUs hijos) con precios resueltos.  

---

## 1. Estructura raíz del DTO

ServiceDetail = {
  canonicalSku: string  
  pageSlug: string  
  hero: ServiceHero  
  sales: SalesPage  
  variants: ServiceVariant[]  
  selectedSku: string  
  mode: "info" | "buy"  
}

### Definición de campos

**canonicalSku**  
SKU dueño del `page_slug`.  
Ejemplo: `one2one-lobra-rhd-090m-v001`.

**pageSlug**  
Slug real encontrado en `products.page_slug`.  
Ejemplo: `servicios/1a1-rhd`.

**hero**  
Copia directa del bloque `hero` contenido en `sales_pages.jsonc`.

**sales**  
Objeto completo obtenido desde `sales_pages.jsonc` usando `loadSalesPageBySku`.  
Aquí vive también el bloque `variants`.

**variants**  
Lista de variantes, ya enriquecida con precios desde Supabase.

**selectedSku**  
SKU activo para la vista actual. Se deriva desde:
- Query param `activeSku`,  
- O variante marcada como `isDefault`,  
- O `canonicalSku` como fallback.

**mode**  
Controla el comportamiento de la página.  
- `info` → vista informativa sin compra,  
- `buy` → vista comercial con selector de variantes.  
Valor por defecto: `buy`.

---

## 2. Formato de `ServiceVariant`

ServiceVariant = {
  sku: string  
  label: string  
  variantKind: "time_session" | "template_setup" | "template_customization" | "other"  
  minutes: number | null  
  scope: "mentoria" | "implementacion" | "otro"  
  isDefault: boolean  
  position: number  

  stripePriceId: string  
  amountCents: number  
  currency: "MXN" | "USD"  
}

### Notas

**variantKind**  
Clasifica la variante para ajustar UI y copy:  
- `time_session`: asesorías por duración (30/90/180).  
- `template_setup`: configuración de archivo.  
- `template_customization`: personalización o ajustes.  
- `other`: cualquier opción adicional.

**minutes**  
Aplica solo para asesorías por duración.

**scope**  
Define alcance del servicio:  
- `mentoria` → dudas, claridad.  
- `implementacion` → trabajo concreto, acciones específicas.

**position**  
Control explícito del orden de despliegue en UI.  
Ejemplo típico: 90 → 180 → 30.

**stripePriceId**, **amountCents**, **currency**  
Siempre obtenidos vía `f_catalog_price_by_sku`.

---

## 3. Comportamiento por `mode`

### Modo INFO (`view=info`)
- No mostrar CTA de compra.  
- Mostrar CTA para regresar al módulo.  
- Mostrar copy del SKU seleccionado.  
- No mostrar selector de variantes (solo la variante activa).

### Modo BUY (default)
- Mostrar selector de variantes.  
- Mostrar CTA “Reservar esta sesión”.  
- Al elegir variante → checkout con ese SKU.

---

## 4. Origen de datos (flujo conceptual)

**canonicalSku**  
Resuelto al buscar `products.page_slug`.

**sales**  
`loadSalesPageBySku(canonicalSku)` con el bloque `variants`.

**variants**  
Leídos desde el JSONC y enriquecidos consultando precio por SKU.

**selectedSku**  
Determinado por:  
1. Query `activeSku`,  
2. Variante con `isDefault = true`,  
3. `canonicalSku`.

**mode**  
Determinado por query param:  
- `view=info` → `"info"`  
- Cualquier otro valor → `"buy"`