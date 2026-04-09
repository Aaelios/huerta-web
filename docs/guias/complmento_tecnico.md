# Complemento — Aterrizaje Técnico MVP Lobra

## TAREA 1 — Contratos mínimos del sistema

### 1. Funnel

Propósito
Definir un recorrido operativo concreto para llevar a una persona desde entrada hasta compra o conversión objetivo.

Campos clave

* id
* key o slug
* nombre
* objetivo
* estado (activo/inactivo)
* metadata mínima de configuración

Responsabilidad

* definir el recorrido operativo
* servir como contenedor lógico de contenido y tracking
* usar el set global de etapas del MVP
* servir como referencia para el estado del usuario

No incluye

* copy completo
* pricing
* lógica de cobro
* accesos
* automatizaciones complejas

Relaciones

* se relaciona con EstadoUsuarioFunnel
* se relaciona con Contenido
* puede relacionarse con Producto cuando el funnel empuja a una compra
* se relaciona con Tracking

Nota

* El funnel no redefine ni crea etapas en MVP.
* Usa exclusivamente el set global:

entrada
lead
pre-pago
pago

---

### 2. EstadoUsuarioFunnel

Propósito
Guardar en qué etapa del funnel está un usuario o contacto.

Campos clave

* id
* funnel_id
* identificador_usuario o contact_id o user_id
* etapa_actual
* estado_general
* entered_at
* updated_at
* last_event
* metadata mínima

Responsabilidad

* persistir etapa actual
* permitir saber si alguien ya entró, avanzó o compró
* habilitar tracking y visibilidad por etapa

No incluye

* historial detallado completo
* copy
* entitlement
* orden de compra
* scoring sofisticado

Relaciones

* pertenece a Funnel
* se relaciona con Tracking
* puede relacionarse con Contact o User
* puede disparar lógica de visibilidad de Contenido

---

### 3. Contenido

Propósito
Representar una pieza de contenido reusable dentro del sistema, sin amarrarla a una sola página o flujo.

Campos clave

* id
* key o slug
* tipo
* estado
* título interno
* source o location
* metadata mínima

Responsabilidad

* ser unidad lógica de contenido
* permitir asignación a funnels o páginas
* separar contenido de recorrido y de producto

No incluye

* estado del usuario
* precio
* compra
* acceso
* lógica de render específica

Relaciones

* se relaciona con Funnel
* contiene o agrupa BloqueContenido
* puede relacionarse indirectamente con Producto

---

### 4. BloqueContenido

Propósito
Representar una pieza específica y renderizable de contenido dentro de un Contenido mayor.

Campos clave

* id
* contenido_id
* key
* tipo_bloque
* orden
* payload o referencia
* estado

Responsabilidad

* ser la unidad mínima de render
* permitir ordenar bloques
* contener el payload o referencia necesaria para render

No incluye

* pricing
* acceso
* estado del usuario
* lógica de tracking completa

Relaciones

* pertenece a Contenido
* se muestra o no según el mapping funnel + etapa

Nota

* La visibilidad de bloques no vive en BloqueContenido.
* La visibilidad se controla exclusivamente desde funnel + etapa.

### 4.1 Mapping Funnel → Bloques por etapa

Propósito
Resolver qué bloques se muestran en cada etapa de cada funnel.

Concepto
La decisión de qué bloques se muestran no la toma el contenido ni el bloque.
La toma el funnel usando la etapa actual del usuario.

Contrato conceptual

* funnel + etapa global → lista de bloques a mostrar
* el bloque no decide visibilidad
* el contenido no decide visibilidad
* el funnel controla la composición visible según etapa

Responsabilidad

* habilitar reutilización
* permitir que un mismo contenido o bloque se use en distintos funnels
* centralizar la lógica de visibilidad fuera del contenido

No incluye

* render de UI
* pricing
* acceso
* tracking completo

Relaciones

* se apoya en Funnel
* usa la etapa actual de EstadoUsuarioFunnel
* selecciona BloqueContenido dentro de Contenido

---

### 5. Producto

Propósito
Representar la entidad comercial operativa ligada a SKU que puede venderse o entregarse.

Campos clave

* sku
* nombre
* fulfillment_type
* product_type
* status
* visibility
* stripe_product_id
* metadata operativa
* page_slug si aplica

Responsabilidad

* definir identidad comercial operativa
* ser referencia para precio, checkout, orden y entitlement
* servir como ancla de fulfillment

No incluye

* copy largo editorial
* etapa de funnel
* estado de usuario
* tracking de funnel

Relaciones

* se relaciona con product_prices
* se relaciona con Order
* se relaciona con Entitlement
* puede ser destino de un Funnel

---

### 6. Entitlement

Propósito
Representar el derecho real de acceso a un producto o experiencia.

Campos clave

* id
* user_id
* sku
* fulfillment_type
* source_type
* source_id
* active
* valid_until
* revoked_at
* metadata

Responsabilidad

* ser fuente de verdad de acceso
* conceder, renovar, revocar o expirar acceso
* conectar compra con acceso real

No incluye

* copy
* estado de funnel
* lógica de pricing
* render de UI

Relaciones

* se relaciona con Producto por sku
* se relaciona con Order o Subscription por source
* se relaciona con User
* puede ser consultado por Prelobby, Gracias o Mi Cuenta

---

## TAREA 2 — Source of Truth por entidad

Producto → catálogo operativo → Supabase
Precio → cobro y price real → Stripe
Precio vigente por SKU → mapeo operativo → Supabase
Contenido operativo → única fuente de verdad operativa → Supabase
Contenido editorial temporal → soporte editorial temporal → JSON
Funnel → definición de recorrido → Supabase
Estado de usuario → etapa actual del funnel → Supabase
Acceso → entitlement → Supabase
Orden / compra → orden y pago materializados → Supabase
Estado de pago → confirmación de cobro → Stripe
Tracking de eventos → dataLayer / GTM como ejecución, definición de evento en app
Tracking persistente de funnel → Supabase
Siguiente paso postcompra → lógica aplicada desde app/backend, apoyada en Supabase
Email transaccional → envío → Resend
Marketing / nurturing → listas y cohorts → Brevo

Nota

* Supabase es la única fuente de verdad operativa.
* JSON solo existe como soporte editorial temporal y no debe actuar como fuente operativa.

---

## TAREA 3 — Secuencia de implementación

### Paso 1

* objetivo
  Definir el contrato operativo mínimo que detalle, checkout y prelobby deben consumir desde Supabase

* qué se hace
  Cerrar lista de campos operativos obligatorios por slug y sku

* qué no se toca
  UI, Stripe, webhooks, gracias, Resend

* validación
  Existe un contrato único y claro para:
  slug, sku, pricing operativo, startAt, duración, flags operativos y datos mínimos de acceso

---

### Paso 2

* objetivo
  Cambiar la fuente operativa de los helpers críticos

* qué se hace
  Actualizar la lógica conceptual de:
  loadWebinars, getWebinar, getWebinarBySku
  para que resuelvan operativo desde Supabase y solo completen editorial desde JSON temporal

* qué no se toca
  CheckoutClient, webhook route, create-checkout-session, PurchaseTracker

* validación
  Los helpers devuelven el mismo shape esperado por la app y ya no dependen del JSON para sku, precio o existencia

Dependencia
Requiere Paso 1 cerrado

---

### Paso 3

* objetivo
  Alinear detalle, checkout y prelobby a la nueva verdad operativa

* qué se hace
  Hacer que esas rutas usen los helpers ya corregidos, sin cambiar componentes visuales

* qué no se toca
  Hub de /webinars, gracias, core transaccional

* validación
  Detalle, checkout y prelobby resuelven slug válido, sku válido y CTA correcto contra Supabase

Dependencia
Requiere Paso 2 validado

---

### Paso 4

* objetivo
  Validar el flujo transaccional completo con la nueva fuente operativa

* qué se hace
  Probar:
  detalle → checkout → pago → webhook → order → entitlement → gracias → acceso

* qué no se toca
  Core de Stripe/webhook salvo bug real

* validación
  SKUs nuevos o alineados pasan completo el flujo sin inconsistencias entre detalle, checkout y acceso

Dependencia
Requiere Paso 3 validado

---

### Paso 5

* objetivo
  Crear el modelo mínimo de funnel

* qué se hace
  Crear conceptualmente y luego materializar:
  funnel y estado_usuario_funnel
  solo con campos mínimos

* qué no se toca
  Contenido modular complejo, automatizaciones, scoring, auth formal

* validación
  Se puede registrar entrada y etapa actual sin afectar compra ni acceso

Dependencia
No bloquea el core transaccional, pero sí debe montarse sobre la nueva verdad operativa ya alineada

---

### Paso 6

* objetivo
  Agregar tracking faltante de funnel

* qué se hace
  Implementar entrada_funnel y cambio_etapa en puntos concretos del flujo

* qué no se toca
  begin_checkout, purchase, view_content existentes

* validación
  Los eventos existen, se disparan una vez y reflejan estado real del funnel

Dependencia
Requiere Paso 5

---

## TAREA 4 — Lista de NO HACER para Control

* No tocar create-checkout-session salvo que un bug real lo obligue
* No tocar webhook route salvo que un bug real lo obligue
* No rediseñar Stripe ni metadata base
* No rehacer CheckoutClient
* No rehacer página de gracias
* No duplicar catálogo en dos fuentes operativas
* No dejar JSON como verdad de sku, precio o existencia
* No migrar todo el contenido editorial de golpe
* No crear sistema paralelo nuevo si el actual ya resuelve el core
* No meter funnel complejo antes de tener alineado detalle/checkout/prelobby
* No cambiar UI por gusto
* No mezclar decisiones de funnel con decisiones de acceso
* No meter auth formal en este bloque
* No inventar automatizaciones de Brevo fuera del alcance
* No reabrir arquitectura base
* No descubrir cosas nuevas que este chat ya dejó definidas

## TAREA 5 - Criterio de éxito  MVP

* detalle, checkout y prelobby usan Supabase como fuente operativa
* el flujo completo de compra funciona sin inconsistencias
* entitlement concede acceso correcto
* no existe doble fuente de verdad operativa
* tracking mínimo funcional existe:
    * view_content
    * begin_checkout
    * purchase
    * entrada_funnel
    * cambio_etapa