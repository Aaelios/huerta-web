# Notificador Interno de Eventos Stripe  
## Documento de Arquitectura   
**Huerta Consulting – 2025**

---

# 1. Objetivo

Crear un sistema de **notificación interna operativa** para cada evento Stripe que debería generar o actualizar una orden.  
Debe alertar cuando:

- Todo salió bien → orden creada/actualizada.
- Ocurrió una anomalía → evento “processed” sin orden.
- Hubo un error del flujo → `error_transient` o `error_fatal`.

Es una capa de observabilidad mínima sin depender aún de un dashboard.

---

# 2. Alcance

- Se integra dentro del webhook de Stripe (`route.ts`).
- No modifica el flujo de correo al cliente.
- No modifica la lógica de negocio del orquestador.
- No introduce nuevos proveedores ni servicios.
- El fallo del notificador **jamás** rompe el webhook.
- La información se aloja en `webhook_events`, para soportar un dashboard futuro.

---

# 3. Flujo actual (resumen)

1. `route.ts` recibe evento.
2. Verifica firma.
3. Maneja idempotencia con `webhook_events` (received).
4. Refetch canónico:
   - checkout session
   - invoice
   - payment_intent (cuando aplica)
5. Ejecuta `h_stripe_webhook_process`:
   - Crea/actualiza orden.
   - Crea/actualiza entitlements.
   - Devuelve:
     - `outcome`
     - `details.orderId?`
6. `route.ts` marca processed / ignored.
7. Envía correo al cliente.
8. Responde a Stripe.

Este flujo no debe alterarse ni romperse.

---

# 4. Problema a resolver

Hoy **no existe visibilidad inmediata** cuando ocurre:

- Una compra exitosa.
- Un fallo en creación de orden.
- Una anomalía: evento “processed” sin orden.
- Un error fatal o transitorio.

Se requiere un mecanismo ligero que avise y que sea base para un dashboard futuro.

---

# 5. Solución propuesta — Arquitectura

## 5.1 Punto de enganche

El notificador se ejecuta **después** del bloque donde el webhook:

- Marca `processed` / `ignored`.
- Antes de la respuesta final HTTP.

Se alimenta del resultado del orquestador:

- `stripeEventId`
- `event.type`
- `result.outcome`
- `result.details.orderId?`

---

## 5.2 Persistencia — `webhook_events`

Se agrega una columna en la tabla `webhook_events`:

    admin_notified_at timestamptz NULL;

Función:

- Si es NULL → el notificador puede enviar correo.
- Si tiene valor → no se repite el envío.

Garantiza **idempotencia**, incluso si se reprocesa el evento.

---

## 5.3 Servicio nuevo — `AdminOpsNotifier`

Ubicación sugerida:

    /lib/admin/f_adminOps_notifyStripeEvent.ts

Responsabilidades:

1. Recibir input desde `route.ts`:
   - `stripeEventId`
   - `eventType`
   - `outcome`
   - `orderId?`

2. Leer `webhook_events` por `stripeEventId`:
   - Si `admin_notified_at` no es NULL → salir sin hacer nada.

3. Clasificar severidad:

   - Caso A — Éxito  
     Condición: `outcome = processed` y `orderId` presente.  
     Severidad: `info`.

   - Caso B — Anomalía  
     Condición: `outcome = processed` pero sin `orderId`.  
     Severidad: `warning`.

   - Caso C — Error  
     Condición: `outcome = error_transient` o `error_fatal`.  
     Severidad: `error`.

4. Si `orderId` existe → leer orden y entitlements para enriquecer el correo:
   - SKU.
   - Monto y moneda.
   - fulfillment_type.
   - Email del cliente.

5. Construir correo interno:
   - Usar ambiente con `EMAIL_SUBJECT_PREFIX` (ej. `[Dev]`).
   - Incluir tag `[Admin]` en el asunto.
   - Incluir información clave del evento, outcome, orden y cliente.

6. Enviar correo usando Resend:
   - Reutilizar el mismo cliente de Resend ya creado en el proyecto.
   - Usar `RESEND_FROM` o configuración actual equivalente.

7. Actualizar `webhook_events.admin_notified_at` al éxito del envío.

8. Si el envío falla:
   - Loguear el error.
   - No romper el webhook (no responder 500 solo por el mail interno).

---

## 5.4 Eventos que disparan notificación interna

Eventos que **en teoría deben generar o actualizar una orden**:

- `checkout.session.completed`
- `invoice.payment_succeeded`

Y cualquier otro tipo que el orquestador ya trate como generador de orden.

La lógica puede estar parametrizada a futuro, pero inicialmente se trabaja con estos.

---

# 6. Reglas importantes

- No interferir con el correo al cliente.
- No alterar comportamiento del orquestador `h_stripe_webhook_process`.
- No introducir nuevos proveedores (usar solo Resend).
- No fallar el webhook si el correo interno falla.
- Mantener arquitectura capaz de crecer hacia un dashboard.
- Reutilizar `EMAIL_SUBJECT_PREFIX` para distinguir ambientes (Dev/Prod).
- Asegurar idempotencia usando `admin_notified_at`.

---

# 7. Estructura del correo interno

Contenido mínimo:

- Ambiente (`EMAIL_SUBJECT_PREFIX`).
- Tipo de evento Stripe (`eventType`).
- Outcome (`processed`, `ignored`, `error_transient`, `error_fatal`).
- `stripeEventId`.
- `orderId` si existe.
- Datos de orden (si aplica):
  - SKU.
  - Monto y moneda.
  - fulfillment_type.
  - Status de la orden.
- Cliente:
  - Email.
- Entitlements generados (lista resumida).
- Para errores:
  - Razón (`reason` del outcome).
  - Datos clave del evento.
- Marca de tiempo (fecha/hora).

Asunto recomendado:

    ${EMAIL_SUBJECT_PREFIX}[Admin] Evento Stripe: <outcome> <sku|orderId>

Ejemplos:

- `[Dev][Admin] Evento Stripe: processed one2one-lobra-rhd-090m-v001`
- `[Admin] Evento Stripe: error_transient (sin orden)`

---

# 8. Configuración

Variables nuevas:

    ADMIN_PURCHASE_ALERT_TO=roberto@huerta.consulting

Opcionales:

    ADMIN_PURCHASE_ALERT_BCC=
    ADMIN_PURCHASE_ALERT_ENABLED=1

Variables reutilizadas:

- `EMAIL_SUBJECT_PREFIX`
- `RESEND_API_KEY`
- `RESEND_FROM`

---

# 9. Plan de implementación via Chats Hijos

## 9.1 Chat Hijo 1 — Estado actual + diseño técnico del notifier

Alcance:

- Revisar esquemas reales:
  - `webhook_events`
  - `orders` / `order_headers`
- Revisar fragmentos relevantes de:
  - `app/api/stripe/webhooks/route.ts`
  - `h_stripe_webhook_process`
  - Helpers de email existentes (por ejemplo `renderEmail`, inicialización de Resend).
- Diseñar:
  - Firma final de `AdminOpsNotifier`.
  - DTOs de entrada/salida.
  - Reglas exactas por outcome.
  - Severidad por caso.
  - Datos mínimos a incluir en el correo.

Sin escribir código final aún. Solo diseño detallado.

---

## 9.2 Chat Hijo 2 — Cambios de DB

Alcance:

- Diseñar migración SQL para agregar `admin_notified_at` a `webhook_events`.
- Revisar impacto en:
  - Ambientes Dev / Prod.
  - Consultas existentes (por si se tocan todas las columnas).
- Validar si es necesario añadir índice (probablemente no crítico, pero se puede decidir).

---

## 9.3 Chat Hijo 3 — Plantilla de correo interno

Alcance:

- Definir contenido final del correo:
  - Texto.
  - Formato (lista, tabla simple, etc.).
  - Tono directo y operativo.
- Decidir si se implementa como:
  - TSX reutilizable en `/lib/emails/admin/...`, o
  - HTML generado dentro del notifier (solución mínima inicial).
- Garantizar uso correcto de:
  - `EMAIL_SUBJECT_PREFIX`
  - `[Admin]` en el subject.

---

## 9.4 Chat Hijo 4 — Implementación

Alcance:

- Integrar llamadas a `AdminOpsNotifier` en `route.ts`:
  - Después de `markProcessed` / `markIgnored`.
  - Usando `stripeEventId`, `type`, `outcome`, `orderId?`.
- Implementar `AdminOpsNotifier` con:
  - Lectura `webhook_events`.
  - Lectura opcional de órdenes/entitlements (si `orderId` existe).
  - Envío de correo vía Resend.
  - Actualización de `admin_notified_at`.
- Asegurar que:
  - No se toca el flujo actual del correo al cliente.
  - No se cambia la semántica del orquestador.

---

## 9.5 Chat Hijo 5 — QA + Deploy

Alcance:

- Matriz de pruebas en Stripe test mode:
  - Éxito con orden (`processed` + `orderId`).
  - Procesado sin orden (simular anomalía).
  - `error_transient`.
  - `error_fatal`.
  - Reprocesamiento del mismo evento (confirmar que no hay correos duplicados).
- Checklist antes de deploy:
  - Migración aplicada en todos los ambientes.
  - `ADMIN_PURCHASE_ALERT_TO` configurada.
  - `EMAIL_SUBJECT_PREFIX` correcto en Dev/Prod.
  - Validación manual de 2–3 correos reales.
- Confirmar que:
  - Webhook responde correctamente a Stripe.
  - No hay impacto en métricas ni flujos actuales.

---

# 10. Consideraciones de escalabilidad

- Diseño pensado para soportar:
  - Dashboard admin que lea:
    - `webhook_events`
    - `orders`
    - `entitlements`
  - Nuevos canales de notificación:
    - Slack
    - Panel interno
  - Jobs/colas asíncronas para envío de notificaciones.

- `webhook_events` actúa como fuente única de verdad:
  - Idempotencia.
  - Historial de eventos.
  - Historial de notificaciones (`admin_notified_at`).

No se requiere reescritura de arquitectura para agregar estas capas en el futuro.

---

# 11. Principios rectores

- No romper lo que funciona.
- Reutilizar componentes existentes.
- Mantener bajo el número de piezas nuevas.
- Minimizar puntos de falla.
- Mantener la semántica actual del sistema.
- Optimizar por:
  - Escalabilidad.
  - Flexibilidad.
  - Bajo retrabajo.

---

# 12. Estado final

Con esta arquitectura:

- Tienes visibilidad inmediata de compras y errores críticos.
- El webhook se mantiene estable y confiable.
- El sistema está listo para crecer hacia un dashboard y más canales de notificación.
- Los cambios son acotados, reversibles y coherentes con el stack actual.
