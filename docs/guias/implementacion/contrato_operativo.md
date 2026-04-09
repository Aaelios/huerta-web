CT-01 — Contrato Operativo Catálogo (MVP) — Versión final alineada

1. Objetivo
Definir el contrato operativo mínimo y correcto para catálogo, detalle y checkout, eliminando dependencia operativa del JSON y dejando una separación clara entre datos operativos y contenido editorial.

2. Principios
- Supabase es la fuente de verdad operativa
- Stripe es la fuente de cobro
- JSON queda solo para contenido editorial / presentación
- SKU es la llave de unión lógica del sistema
- FREE es una condición válida dentro del modelo (no un tipo de producto)
- El contrato base no depende de RPC como fuente de verdad
- El contrato base no incluye instancia

3. Contrato base obligatorio (operativo)
Estos campos deben resolverse desde Supabase y no deben depender de JSON:

- page_slug
- sku
- name (campo oficial en DB)
- product_type
- fulfillment_type
- estado real del producto en DB
- pricing vigente del producto:
  - stripe_price_id
  - amount_cents
  - currency
  - valid_from
  - valid_until

Nota:
- Webinar.shared.title (y equivalentes) se derivan de `name`
- `title` NO es campo persistente en DB

4. Regla operativa de pricing (cerrada)
Regla MVP:
- 1 producto = 1 price vigente resoluble en un momento dado

Definición correcta:
- la resolución del precio debe ser:
  - determinística
  - sin fallback
  - sin selección implícita

Fuente canónica:
- RPC f_catalog_price_by_sku

Comportamiento obligatorio:
- falla si:
  - hay más de un price vigente
  - no hay ningún price vigente

Implicación:
- catálogo, detalle y checkout consumen un único precio ya resuelto
- no deben implementar lógica de selección

Importante:
- si hay inconsistencia → es problema de datos, no del contrato

5. Regla de FREE dentro del modelo
FREE no es un tipo de producto.

FREE es una condición de pricing:
- amount_cents = 0
  o
- ausencia de price

En MVP:
- FREE NO vive dentro de product_prices
- se mantiene constraint amount_cents > 0

Representación operativa:
- sigue teniendo:
  - sku
  - name
  - product_type
  - fulfillment_type
  - estado del producto

Implicación:
- FREE usa el mismo contrato base
- no requiere contrato paralelo
- no depende de fulfillment_type específico

6. Qué sí puede quedarse en JSON
Campos editoriales / de presentación que no deben ser fuente operativa:

- hero
- subtitle
- bullets
- labels
- badges comerciales
- copy largo
- imágenes
- SEO title
- SEO description
- bloques de contenido comercial

7. Qué no debe depender de JSON
Los siguientes campos no deben salir de JSON:

- page_slug
- sku
- name
- product_type
- fulfillment_type
- estado real del producto
- stripe_price_id
- amount_cents
- currency
- vigencia del precio

8. Qué queda fuera del contrato base
Estos datos pueden ser operativos, pero no forman parte del contrato base:

- instance_slug
- start_at
- end_at
- timezone
- zoom_join_url
- replay_url
- capacidad
- acceso / entitlement
- prelobby

9. RPC e instancias
El contrato base:
- no depende de RPC como fuente de verdad estructural
- sí utiliza RPC como mecanismo de resolución controlada (pricing)

RPC aplica en:
- resolución de precio vigente (obligatoria)
- prelobby
- validación de acceso
- lógica operativa de sesión
- resolución de instancia cuando aplique

RPC NO debe introducir:
- fallback silencioso
- lógica ambigua
- defaults implícitos

10. Regla de visibilidad del producto
Regla correcta:
- el producto debe estar en un estado visible/publicable según DB
- debe cumplir UNA de estas:
  - tener precio vigente válido
  - cumplir condición de FREE

Importante:
- visibilidad base no depende de instancia
- validaciones adicionales se resuelven fuera del contrato base

11. Separación final
Operativo (Supabase):
- identidad del producto
- clasificación del producto
- estado del producto
- pricing vigente (resuelto)

Editorial (JSON):
- copy
- bloques de venta
- SEO
- assets visuales
- elementos de presentación

Resolución operativa adicional:
- RPC controlada (pricing, instancia, acceso)

12. Decisiones cerradas
- campo oficial: name (no title)
- FREE es condición de pricing, no tipo
- FREE fuera de product_prices en MVP
- precio vigente se resuelve vía RPC estricta
- RPC:
  - determinística
  - sin fallback
  - falla ante ambigüedad o ausencia
- catálogo, detalle y checkout no seleccionan precio
- instancia no forma parte del contrato base
- JSON no es fuente de verdad operativa

13. Deuda controlada
- DB aún no garantiza unicidad estricta de precio vigente
- coexistencia de lógica flexible en f_checkout_mapping (no contractual)
- FREE no está unificado dentro del subsistema de pricing
- posible endurecimiento futuro de constraints de pricing

14. Riesgos reales
- datos actuales pueden violar unicidad de pricing
- posibles consumos legacy de JSON
- divergencia entre RPC estricta y lógica flexible existente
- necesidad futura de consolidar modelo de pricing

15. Estado
CT-01 queda alineado con Supabase y validado por CT-02.6.

→ Listo para CT-03 — Implementación de Helpers