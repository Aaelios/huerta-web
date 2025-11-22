# Arquitectura de Analítica — LOBRÁ  
## Google Tag Manager (GTM) + GA4 + Meta + Ads  
**Versión:** v1  
**Estado:** En desarrollo  
**Dominio:** lobra.net  

---

## 1. Objetivo  
Establecer una arquitectura unificada de analítica para LOBRÁ que centralice toda la medición a través de Google Tag Manager, elimine configuraciones heredadas, evite duplicidad de eventos y permita escalar hacia campañas avanzadas sin retrabajo futuro.

---

## 2. Alcance  
Este documento cubre:  
- Inventario y limpieza del sitio.  
- Estructura del contenedor GTM.  
- Definición del Data Layer estándar.  
- Integraciones con GA4, Meta Pixel y Google Ads.  
- Controles, QA y gobernanza.

Este documento **no incluye** código detallado ni instrucciones específicas de implementación. Cada bloque tendrá su propio chat hijo cuando se ejecute.

---

## 3. Componentes principales  
La arquitectura completa se divide en cinco bloques:

1. Inventario y Limpieza  
2. Estructura del Contenedor GTM  
3. Data Layer Estándar (Next.js)  
4. Integraciones externas (GA4, Meta, Ads)  
5. Control, QA y Documentación

---

## 4. Bloque 1 — Inventario y Limpieza

### 4.1 Qué buscar  
Identificar cualquier fragmento de código relacionado con medición en el repositorio. Categorías principales:

1. **Google Analytics hardcodeado**  
   - Scripts `gtag.js`  
   - Llamadas directas `gtag('config', ...)`  
   - Inicializaciones dentro de layouts o componentes.

2. **GTM duplicado o heredado**  
   - Varias inserciones del snippet GTM  
   - Versiones anteriores del dominio huerta.consulting.

3. **Meta Pixel suelto**  
   - `fbq('init', ...)`  
   - `fbq('track', ...)`  
   - Scripts `connect.facebook.net`.

4. **Otros trackers**  
   - LinkedIn Insight  
   - Hotjar  
   - Cualquier script externo no documentado.

---

### 4.2 Qué eliminar  
Debe eliminarse **todo** lo que no pase por el nuevo contenedor GTM:

- Scripts directos de Google Analytics.  
- Pixel de Meta incrustado manualmente.  
- Cualquier instancia de GTM que no sea la nueva.  
- Scripts asociados al dominio huerta.consulting.  
- Bibliotecas externas que inyecten eventos sin control.

---

### 4.3 Qué conservar  
Solo se conservan:

1. **Snippet oficial de GTM (único)**  
   - Ubicado en `<head>`  
   - `<noscript>` correspondiente en `<body>`  
   - Punto único de entrada para todo tracking.

2. **Data Layer estándar**  
   - Declaración única: `window.dataLayer = window.dataLayer || []`  
   - Eventos enviados desde Next.js de forma manual y controlada.

---

### 4.4 Procedimiento de limpieza  
1. Crear rama `analytics/cleanup`.  
2. Buscar en todo el proyecto las palabras clave:  
   `gtag`, `fbq`, `googletagmanager`, `analytics`, `pixel`.  
3. Remover todos los scripts encontrados.  
4. Insertar el snippet oficial de GTM (solo uno).  
5. Hacer deploy a Preview.  
6. Validar en el navegador:  
   - Sin errores en consola  
   - Sin duplicados en Network  
   - Flujos críticos operando (`/checkout`, `/gracias`).  
7. Si está estable, fusionar a main.

## 5. Bloque 2 — Estructura del Contenedor GTM

### 5.1 Variables base  
Debe crearse un set mínimo de variables para evitar repetición:

1. **Variables del navegador**
   - {{Page URL}}
   - {{Page Path}}
   - {{Page Hostname}}
   - {{Referrer}}

2. **Variables de utilidades**
   - {{Debug Mode}} (para distinguir Preview vs Live)
   - {{Random Number}} (evitar caches)
   - {{Event}} (nombre del evento capturado)

3. **Variables de Data Layer**
   - {{dl_event}} → `event` normalizado  
   - {{dl_value}} → monto  
   - {{dl_currency}}  
   - {{dl_content_type}}  
   - {{dl_content_id}}  
   - {{dl_items}} → array de productos u objetos  
   (Todas creadas como “Data Layer Variable”)

4. **Variables para plataformas**
   - GA4 Measurement ID  
   - Meta Pixel ID  
   - Google Ads Conversion ID  

---

### 5.2 Triggers base

1. **All Pages**  
   - Activación: DOM Ready  
   - Uso: GA4 Pageview

2. **DLV Event — Personalizado**  
   - Activación cuando `event` = cualquiera de los eventos definidos en el Data Layer.  
   - Tags que lo usan: GA4 events, Meta events, Ads conversions.

3. **Pageview limpio**  
   - Condición: {{Page Hostname}} contenga "lobra.net"  
   - Evita disparos en otros dominios por error.

4. **Conversiones específicas**  
   - `event = purchase`  
   - `event = begin_checkout`  
   - `event = lead`  
   (Todos basados en Data Layer)

---

### 5.3 Carpetas  
Todo organizado para evitar caos:

- **/Core** → variables, triggers y tags esenciales  
- **/GA4** → tags + configuraciones  
- **/Meta** → pixel + conversiones  
- **/Ads** → Google Ads  
- **/Events** → eventos específicos desde Data Layer  
- **/QA** → herramientas de depuración  
- **/Archived** → elementos en desuso sin eliminar

---

### 5.4 Nombres estándar  
Regla: `[Plataforma] — [Acción] — [Detalle opcional]`

Ejemplos:
- `GA4 — Config`  
- `GA4 — Event — purchase`  
- `GA4 — Event — view_content`  
- `Meta — Pageview`  
- `Meta — Event — purchase`  
- `Ads — Conversion — purchase`

---

### 5.5 Reglas de publicación

1. **Nunca publicar directo a Live** sin revisar en Preview.  
2. **Siempre documentar cambios** como versiones numeradas:  
   - v1: Base  
   - v1.1: Meta Pixel  
   - v1.2: Events purchase  
3. **Todo evento nuevo** debe probarse en:  
   - GTM Debug  
   - GA4 DebugView  
   - Meta Test Events  
   - Google Ads Tag Diagnostics  
4. Si event se duplica → se detiene deploy.  

## 6. Bloque 3 — Data Layer Estándar (Next.js)

### 6.1 Eventos obligatorios  
El Data Layer debe tener cuatro eventos principales. Son los mínimos para ventas, remarketing y embudos futuros:

1. **view_content**  
   - Se dispara al cargar páginas clave:
     - Página de un webinar
     - Página de un módulo
     - Página de un producto
     - Página de una herramienta (futuro)

2. **begin_checkout**  
   - Se dispara cuando el usuario da clic en “Comprar” o “Ir al checkout” y se inicia el flujo de Stripe Embedded Checkout.

3. **purchase**  
   - Se dispara en `/gracias` después de validar el `session_id` de Stripe.
   - Debe incluir ID de orden, monto y moneda.

4. **lead**  
   - Se dispara en acciones de captura de datos, por ejemplo:
     - Registro a masterclass gratuita
     - Registro vía formularios nativos (cuando existan)
     - Eventos equivalentes a “registro” o “interés calificado”

---

### 6.2 Payload recomendado  

Cada evento debe empujar un objeto consistente al Data Layer:

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "name",
      value: 0,              // monto (definir convención: centavos o MXN enteros)
      currency: "MXN",
      content_id: "",        // sku o identificador del contenido
      content_type: "",      // webinar | module | course | tool | generic
      items: [],             // array de objetos si aplica (order items, etc.)
    });

Parámetros mínimos por evento:

| Evento        | Obligatorio                                      |
|---------------|--------------------------------------------------|
| view_content  | content_id, content_type                         |
| begin_checkout| content_id, content_type                         |
| purchase      | value, currency, content_id, items[] (si aplica) |
| lead          | content_type o identificador del formulario      |

La convención exacta (centavos vs MXN enteros en `value`) debe definirse una sola vez y respetarse en todas las plataformas.

---

### 6.3 Dónde se disparan  

1. **view_content**  
   - En los layouts o componentes de páginas dinámicas como:
     - Detalle de webinar  
     - Detalle de módulo/curso  
     - Detalle de herramienta (futuro)  
   - Se dispara una sola vez por carga de página.

2. **begin_checkout**  
   - En el botón que inicia el flujo de compra:
     - Antes o en el momento de crear la sesión de Stripe.
   - El `content_id` debe corresponder al `sku` principal que se está comprando.

3. **purchase**  
   - En `/gracias`, después de:
     - Validar en servidor el `session_id` de Stripe.  
     - Confirmar que la orden existe en Supabase (estado `paid` o equivalente).
   - Debe evitarse cualquier duplicado (solo disparar una vez por orden válida).

4. **lead**  
   - En acciones de captura de datos relevantes:
     - Registro confirmado a masterclass.  
     - En el futuro, formularios nativos de newsletter o listas de espera.  
   - Idealmente, disparar “al confirmar” y no solo al hacer clic.

---

### 6.4 Validación del Data Layer  

Antes de conectar GA4, Meta o Google Ads, se valida el Data Layer de forma independiente:

1. Abrir GTM en modo Preview.  
2. Navegar el sitio y confirmar:
   - Que cada evento se dispare en el momento esperado.  
   - Que los parámetros (`value`, `currency`, `content_id`, `content_type`, `items`) tengan datos correctos.  
   - Que no existan disparos duplicados para el mismo evento lógico.

3. Validar en las herramientas de diagnóstico:
   - GA4 → DebugView.  
   - Meta → Test Events.  
   - Google Ads → Tag Assistant / Diagnostics.

4. Solo cuando los eventos del Data Layer sean consistentes y estables, se avanza al Bloque 4 (integraciones externas).

## 7. Bloque 4 — Integraciones Externas  
GA4 · Meta Pixel · Google Ads

Este bloque define cómo se conectan las plataformas externas al Data Layer ya estandarizado. Ninguna integración debe dispararse directamente desde el código del sitio. Todo pasa por GTM.

---

### 7.1 GA4 (Google Analytics 4)

#### Objetivo  
Medir navegación, comportamiento y conversión usando datos limpios del Data Layer.

#### Reglas  
- GA4 recibe solo eventos provenientes del Data Layer.  
- Se usa **1 tag de configuración** y **1 tag por cada evento**.

#### Componentes  
1. **GA4 — Config**  
   - Disparo: All Pages  
   - Usa Measurement ID del proyecto LOBRÁ.  

2. **GA4 — Event — view_content**  
   - Disparo: `event = view_content`  
   - Parámetros: content_id, content_type  

3. **GA4 — Event — begin_checkout**  
   - Disparo: `event = begin_checkout`  
   - Parámetros: content_id, content_type  

4. **GA4 — Event — purchase**  
   - Disparo: `event = purchase`  
   - Parámetros: value, currency, items[], content_id  

5. **GA4 — Event — lead**  
   - Disparo: `event = lead`  
   - Parámetros: content_type o formulario/slug  

---

### 7.2 Meta Pixel

#### Objetivo  
Permitir remarketing y medición de conversiones en Meta Ads (Facebook/Instagram).

#### Reglas  
- Pixel no se inserta en el código del sitio.  
- Se usa un único tag “Meta — Base Pixel”.  
- Cada evento se dispara desde Data Layer, nunca desde FBQ manual.

#### Componentes  
1. **Meta — Base Pixel**  
   - Disparo: All Pages  
   - Contiene `fbq('init', PIXEL_ID)` y `fbq('track', 'PageView')`.

2. **Meta — Event — view_content**  
   - Disparo: `event = view_content`  
   - Parámetros: content_id, content_type  

3. **Meta — Event — begin_checkout**  
   - Disparo: `event = begin_checkout`  
   - Parámetros: content_id, content_type  

4. **Meta — Event — purchase**  
   - Disparo: `event = purchase`  
   - Parámetros: value, currency, content_id, items[]  
   - Importante: agregar `event_id` para evitar duplicados en Ads Manager.

5. **Meta — Event — lead**  
   - Disparo: `event = lead`  
   - Parámetros: content_type o identificador del formulario  

---

### 7.3 Google Ads

#### Objetivo  
Permitir medición de conversiones y remarketing para campañas futuras.

#### Reglas  
- Conversiones basadas solo en eventos del Data Layer.  
- No se insertan scripts de Ads directamente en el sitio.

#### Componentes  
1. **Ads — Base Tag**  
   - Disparo: All Pages  
   - Contiene el Conversion ID.

2. **Ads — Conversion — begin_checkout**  
   - Disparo: `event = begin_checkout`

3. **Ads — Conversion — purchase**  
   - Disparo: `event = purchase`  
   - Parámetros: value, currency  

4. **Ads — Conversion — lead**  
   - Disparo: `event = lead`  

---

### 7.4 Reglas de consistencia  
1. Un evento del Data Layer debe alimentar **GA4 + Meta + Ads**.  
2. No duplicar eventos: un mismo disparo debe generarse **una sola vez**.  
3. Si Meta o Ads piden eventos extras, deben pasar por el Data Layer.  

---

### 7.5 Consideraciones para migrar a Server-Side GTM  
Arquitectura ya preparada para migrar cuando LOBRÁ escale campañas:

- Mantener Data Layer limpio.  
- Evitar scripts en el cliente que rompan la cadena.  
- Mantener eventos unificados.  

Al migrar:  
- GA4 pasa al server container.  
- Meta Pixel se proxifica (mejor calidad de datos).  
- Ads mejora coincidencia de conversiones.

(No se implementa ahora, pero la base queda lista.)

## 8. Bloque 5 — Control, QA y Documentación

Este bloque define cómo se asegura la calidad del sistema, cómo se valida cada cambio y cómo se mantiene el control operativo a lo largo del tiempo. Es el equivalente a “gobernanza” del ecosistema de analítica.

---

### 8.1 Checklist de control  
Debe usarse antes y después de cada deployment.

**Previo al deployment**
1. ¿El Data Layer dispara los eventos correctos?  
2. ¿Los parámetros están completos (value, currency, content_id, items)?  
3. ¿No hay duplicados en el modo Preview de GTM?  
4. ¿El código no contiene scripts sueltos de GA, FB, Ads?  
5. ¿El GTM Container está ordenado en carpetas?  
6. ¿Los triggers del contenedor están filtrados por dominio?  

**Posterior al deployment**
1. ¿GA4 DebugView recibe todos los eventos?  
2. ¿Meta Test Events refleja los eventos y parámetros?  
3. ¿Google Ads Diagnostics no marca missing conversions?  
4. ¿El flujo `/checkout → /gracias` dispara `purchase` una sola vez?  
5. ¿No aparece ningún error en consola del navegador?

---

### 8.2 Flujo de pruebas recomendado  

**Etapa 1 — Validación local / Preview**
- Activar GTM Preview.
- Navegar cada página importante:
  - Home  
  - Webinars  
  - Módulos  
  - Checkout  
  - Gracias  
- Confirmar disparos y parámetros.

**Etapa 2 — GA4 DebugView**
- Confirmar que:
  - `view_content` llega con SKU correcto.  
  - `begin_checkout` llega en el clic correcto.  
  - `purchase` llega con monto correcto.  
  - No existe ruido (“page_view” duplicado o “session_start” inesperado).

**Etapa 3 — Meta Test Events**
- Confirmar que:
  - No hay dobles disparos de PageView.  
  - Eventos reciben `event_id` cuando aplique.  
  - Los valores de compra son correctos.

**Etapa 4 — Google Ads Diagnostics**
- Validar que las conversiones no estén en “Unverified”.

---

### 8.3 Auditorías periódicas  
Revisión mensual para evitar degradación:

1. Revisar en GTM:
   - Tags sin uso  
   - Variables duplicadas  
   - Triggers obsoletos  
   - Versiones muy antiguas  

2. Revisar en GA4:
   - Eventos que ya no se usan  
   - Embudos y conversiones rotas  
   - Medición de compras estable  

3. Revisar en Meta:
   - Eventos con mismatch  
   - Purchases sin value/currency  
   - Consistencia del pixel  

4. Revisar en Ads:
   - Conversiones con estatus “inactive”  
   - Caída repentina de “purchase”  

---

### 8.4 Chat de Control (arquitectura)  
Un Chat de Control supervisará:

1. Coherencia entre Data Layer y GTM.  
2. Validación de cada cambio antes del deployment.  
3. Revisión de los chats hijo por bloque:
   - Limpieza del sitio  
   - Data Layer en Next.js  
   - Configuración GTM  
   - Integración GA4  
   - Integración Meta  
   - Integración Ads  

El Chat de Control evita que un cambio en un bloque rompa otro.

---

### 8.5 Chats hijo y alcances  
Cada chat hijo debe tener alcance **muy acotado**:

1. **Chat Hijo — Limpieza del sitio**  
   - Elimina scripts legacy.  
   - Asegura un solo GTM.

2. **Chat Hijo — Data Layer (Next.js)**  
   - Implementa push de eventos.  
   - Asegura parámetros correctos.

3. **Chat Hijo — GTM Container**  
   - Crea variables, triggers y tags.  
   - Organiza carpetas.

4. **Chat Hijo — GA4**  
   - Configura tags de GA4.  
   - Valida eventos.

5. **Chat Hijo — Meta Pixel**  
   - Configura pixel y eventos.  
   - Valida Test Events.

6. **Chat Hijo — Google Ads**  
   - Configura conversiones.  
   - Valida diagnostics.

Cada chat hijo entrega resultados al Chat de Control antes de terminar.

---

## 9. Anexos

### 9.1 Glosario  
- **Data Layer:** Canal único donde el sitio envía eventos.  
- **GTM:** Sistema que distribuye eventos a plataformas externas.  
- **GA4:** Plataforma analítica principal.  
- **Pixel:** Script de Meta para medir conversiones.  
- **Conversion ID:** Identificador para Google Ads.

### 9.2 Errores comunes  
- Colocar múltiples GTM en el sitio.  
- Enviar eventos directamente desde GA4 o FBQ en el código.  
- Enviar “purchase” sin validar en servidor.  
- Duplicar disparos de “checkout”.  
- No respetar `content_id` o `value`.

### 9.3 Futuras ampliaciones  
- Migración a Server-Side GTM.  
- Atribución multiplataforma.  
- Conversiones avanzadas de Meta.  
- Integración con CRM futuro.  

Entendido. Necesitas **formato Markdown real compatible con GitHub**, sin rupturas.

El problema no fue `**` ni `##`.
El problema fue **los bloques de código dentro de bloques de código** y **triple backtick dentro de triple backtick**. Eso rompe cualquier parser.

Solución:
👉 **Cada bloque del documento debe estar encapsulado en un único bloque `md**, SIN volver a abrir bloques internos con `**.
👉 El código dentro debe ir con indentación de 4 espacios, no con triple backticks.
👉 Los títulos, listas, negritas, tablas, todo funciona perfecto con GitHub si evitamos el problema anterior.

Te entrego los anexos nuevamente, **EN FORMATO MD 100% COMPATIBLE CON GITHUB**, sin riesgo de romperse.

---

```md
## 9.4 Anexo — Convenciones de nombres (estándares)

### 9.4.1 Eventos (Data Layer)
Los eventos del Data Layer deben seguir snake_case:
- view_content
- begin_checkout
- purchase
- lead

### 9.4.2 Variables (GTM)
Variables del Data Layer:
- dl_event
- dl_value
- dl_currency
- dl_content_id
- dl_content_type
- dl_items

Variables del navegador:
- Page URL
- Page Path
- Page Hostname
- Referrer
- Debug Mode

Variables de plataformas:
- GA4 Measurement ID
- Meta Pixel ID
- Ads Conversion ID

### 9.4.3 Triggers (GTM)
- Core — All Pages  
- DL — view_content  
- DL — begin_checkout  
- DL — purchase  
- DL — lead  

### 9.4.4 Tags (GTM)
- GA4 — Config  
- GA4 — Event — view_content  
- GA4 — Event — begin_checkout  
- GA4 — Event — purchase  
- GA4 — Event — lead  
- Meta — Base Pixel  
- Meta — Event — view_content  
- Meta — Event — begin_checkout  
- Meta — Event — purchase  
- Meta — Event — lead  
- Ads — Conversion — purchase  
- Ads — Conversion — begin_checkout  
- Ads — Conversion — lead  

### 9.4.5 Carpetas (GTM)
- Core  
- GA4  
- Meta  
- Ads  
- Events  
- QA  
- Archived  


## 9.5 Anexo — Atribución de campañas

### 9.5.1 Captura automática de atribución
El sistema captura automáticamente:
- UTMs (utm_source, utm_medium, utm_campaign, etc.)  
- gclid para Google Ads  
- event_id para Meta Ads  
- referrer para tráfico orgánico o directo  

No se requiere lógica adicional en Next.js ni en GTM.

### 9.5.2 Atribución en GA4
GA4 asocia automáticamente los eventos a:
- first_user_source / medium / campaign  
- session_source / medium / campaign  

Esto cubre:
- leads  
- begin_checkout  
- purchases  

### 9.5.3 Atribución en Meta Pixel
Para atribución correcta:
- Se envía event_id en `purchase`  
- Meta cruza event_id con clics y vistas  
- No requiere UTMs  

### 9.5.4 Atribución en Google Ads
Google Ads:
- Capta gclid automáticamente  
- Lo asocia al evento de conversión que recibe vía GTM  
- No requiere UTMs manuales para campañas pagadas  

### 9.5.5 UTMs recomendados para LOBRÁ

Instagram (orgánico):
```
?utm_source=instagram&utm_medium=social&utm_campaign=brand_reel

```

WhatsApp directo:
```

?utm_source=whatsapp&utm_medium=direct&utm_campaign=outreach

```

Email:
```

?utm_source=email&utm_medium=owned&utm_campaign=lanzamiento_webinar_noviembre

```

Masterclass pagada:
```

?utm_source=instagram&utm_medium=paid&utm_campaign=masterclass_tranquilidad

```

### 9.5.6 Reglas de consistencia
- Todos los eventos deben fluir Data Layer → GTM → Plataformas  
- No duplicar `purchase`  
- Mantener estructura consistente de UTMs  
- Usar siempre event_id en Meta para conversiones  
```

