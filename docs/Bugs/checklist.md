# Checklist de implementación — Fix definitivo webhooks Stripe / Supabase

Versión: checklist-v1  
Documento asociado: `design-v1` (este mismo hilo)

---

## 0. Preparación

- [ ] Crear rama de trabajo específica (ej. `fix/stripe-webhook-auth-500`).
- [ ] Confirmar que hay entorno de pruebas (Preview / QA) con:
  - [ ] Stripe en modo test.
  - [ ] Supabase de preview conectada.
  - [ ] Logs visibles (Vercel / Supabase).

---

## 1. `f_ensureUserByEmail` → versión v2 (MODIFICACIÓN)

Archivo: `lib/supabase/f_ensureUserByEmail.ts`

1.1. Cambio de contrato (interno; TS puede seguir devolviendo `{ userId }` si se envuelve):

- [ ] Introducir tipo interno `EnsureUserResult` (`success | transient_error | fatal_error`) tal como está en el diseño.
- [ ] Implementar función interna `f_ensureUserByEmail_core(email): EnsureUserResult` con la lógica del pseudocódigo:
  - [ ] Normalización y validación de email:
    - [ ] `EMAIL_REQUIRED` → `fatal_error`.
    - [ ] `EMAIL_INVALID` → `fatal_error`.
  - [ ] Checar `f_auth_get_user(p_email)`:
    - [ ] Si regresa ID → `success`.
  - [ ] Loop de reintentos `createUser` (3 intentos con backoff):
    - [ ] Caso `already exists` (422 / mensaje):
      - [ ] Re-checar `f_auth_get_user`.
      - [ ] Si no está, usar `listUsers` como fallback.
      - [ ] Si se encuentra → `success`.
      - [ ] Si no se encuentra → `transient_error`.
    - [ ] Errores 4xx no-422 → `fatal_error`.
    - [ ] Errores 5xx:
      - [ ] Re-checar `f_auth_get_user` antes de cada nuevo intento.
      - [ ] Si después de N intentos no hay usuario → `transient_error`.
    - [ ] Cualquier otro error → `transient_error`.

1.2. Capa de compatibilidad con código existente:

- [ ] Mantener `export default async function f_ensureUserByEmail(email: string): Promise<{ userId: string }>` como _wrapper_.
- [ ] Implementar el wrapper así:
  - [ ] Llama a `f_ensureUserByEmail_core`.
  - [ ] Si `kind === 'success'` → retorna `{ userId }`.
  - [ ] Si `kind === 'fatal_error'` o `kind === 'transient_error'`:
    - [ ] Lanza `Error` con mensaje que incluya `kind` y `reason` para que el caller pueda distinguir (ej. en `details` o en `name`).

> Nota: más adelante `h_stripe_webhook_process` dejará de depender de excepciones y podrá llamar a una versión que devuelva directamente `EnsureUserResult`.

---

## 2. `h_stripe_webhook_process` → versión v2 (MODIFICACIÓN)

Archivo: `lib/orch/h_stripe_webhook_process.ts`

2.1. Actualizar tipo de resultado:

- [ ] Reemplazar `TStripeWebhookResult` actual por el nuevo discriminated union:

  - [ ] `processed`
  - [ ] `ignored`
  - [ ] `error_transient`
  - [ ] `error_fatal`

2.2. Separar la lógica por función auxiliar:

- [ ] Crear helpers internos:
  - [ ] `handleCheckoutSessionCompleted_v2(input, email): TStripeWebhookResult`
  - [ ] `handleInvoicePaymentSucceeded_v2(input, email): TStripeWebhookResult`
  - [ ] `handlePaymentIntentSucceeded_v2(input): TStripeWebhookResult`

2.3. Punto central de entrada:

- [ ] Modificar `export default async function h_stripe_webhook_process(...)` para:
  - [ ] Validar `type` contra el `Set` de tipos soportados (como hoy).
  - [ ] Calcular `email` con `getEmail`.
  - [ ] Regresar `error_fatal` si:
    - [ ] `type != 'payment_intent.succeeded'` y `email == null`.
  - [ ] Hacer `switch`:
    - [ ] `payment_intent.succeeded` → `handlePaymentIntentSucceeded_v2`.
    - [ ] `checkout.session.completed` → `handleCheckoutSessionCompleted_v2`.
    - [ ] `invoice.payment_succeeded` → `handleInvoicePaymentSucceeded_v2`.
    - [ ] Otros → `ignored`.

2.4. Checkout: `handleCheckoutSessionCompleted_v2`

- [ ] Validar `session` no null.
- [ ] Llamar a `f_ensureUserByEmail` (wrapper v2):
  - [ ] Si lanza error con `kind = transient_error` → mapear a `error_transient`.
  - [ ] Si lanza error con `kind = fatal_error` → mapear a `error_fatal`.
  - [ ] (La forma concreta de transportar `kind` desde el wrapper se define en el paso 1.2).
- [ ] Validar expansiones (`hasPricePath` / `line_items`) como hoy:
  - [ ] Si faltan → `error_fatal` o `ignored` según se decida.
- [ ] Construir `session_payload` exactamente como hoy.
- [ ] Llamar `f_orch_orders_upsert`:
  - [ ] Si la RPC lanza error:
    - [ ] Mapear por defecto a `error_transient` (`reason = 'ORCH_UPSERT_FAILED'`).
- [ ] Si todo va bien → `outcome = 'processed'` + `details.orderId`.

2.5. Invoice: `handleInvoicePaymentSucceeded_v2`

- [ ] Igual patrón que checkout pero usando `invoice` y `hasPricePath(invoice)`.
- [ ] Mismo uso de `f_ensureUserByEmail`.
- [ ] Mismo comportamiento para `f_orch_orders_upsert`.

2.6. Payment Intent: `handlePaymentIntentSucceeded_v2`

- [ ] Eliminar el uso de `f_ensureUserByEmail` en esta rama.
- [ ] Validar `session` y `payment_intent` no null:
  - [ ] Si alguno falta → `error_fatal (MISSING_SESSION_OR_PI)`.
- [ ] Llamar `f_payments_upsert_by_session` como hoy:
  - [ ] Si la RPC lanza error:
    - [ ] Si el mensaje contiene `USER_NOT_FOUND_FROM_SESSION` → `error_transient`.
    - [ ] Otros errores DB → `error_transient`.
- [ ] Si la RPC regresa datos → `processed` con `paymentId`, `orderId`, `pi_id`.

2.7. Asegurar logging mínimo

- [ ] Mantener logs tipo `[orch] h_stripe_webhook_process` pero actualizar para incluir:
  - [ ] `outcome`.
  - [ ] `reason` para errores.

---

## 3. Route `/api/stripe/webhooks` → ajuste de HTTP y uso de outcome

Archivo: `app/api/stripe/webhooks/route.ts`

3.1. Conectar con nuevo resultado:

- [ ] Adaptar la llamada a `h_stripe_webhook_process` para esperar el nuevo `TStripeWebhookResult`.
- [ ] Remover el patrón “catch general → log + seguir como si nada” para la parte de orquestación:
  - [ ] En su lugar:
    - [ ] `try { result = await h_stripe_webhook_process(...) } catch (e) { result = { outcome: 'error_transient', reason: 'UNHANDLED_EXCEPTION', ... } }`.

3.2. Uso de `f_webhookEvents_mark*`:

- [ ] Modificar el bloque que marca estado en la tabla de Next:
  - [ ] Si `outcome === 'processed'`:
    - [ ] `f_webhookEvents_markProcessed`.
  - [ ] Si `outcome === 'ignored'`:
    - [ ] `f_webhookEvents_markIgnored`.
  - [ ] Si `outcome === 'error_transient'` o `error_fatal`:
    - [ ] No marcar como `processed` / `ignored`.
    - [ ] Solo se conserva como `received` + logs (para posible reproceso manual).

3.3. Respuesta HTTP:

- [ ] Al final del handler:
  - [ ] Si `outcome === 'error_transient'` → `status 500`.
  - [ ] Si `outcome === 'processed'` o `outcome === 'ignored'` → `status 200`.
  - [ ] Si `outcome === 'error_fatal'`:
    - [ ] `status 200` (o 4xx si decides, pero consistente).
- [ ] Mantener casos especiales:
  - [ ] Errores de firma / falta de secret → 400/500 como hoy.

3.4. Bloque de email post-compra

- [ ] Verificar que el bloque de envío de email:
  - [ ] Siga sólo dependiendo de:
    - [ ] `event.type === 'checkout.session.completed'`.
    - [ ] `session.payment_status` in `paid | no_payment_required`.
  - [ ] No dependa del nuevo `outcome` (es idempotente vía `receipt_sent_at`).

---

## 4. Validaciones mínimas en SQL (solo documentación / no cambios obligatorios)

4.1. `f_orch_orders_upsert`

- [ ] Confirmar que:
  - [ ] Para `INVALID_EVENT`, `NOT_FOUND_USER`, `INVALID_KEYS`, `INVALID_PAYMENT`, `INVALID_FULFILLMENT`:
    - [ ] Se hace `RAISE EXCEPTION` y se propaga al caller.
- [ ] Documentar (en comentarios o doc.md):
  - [ ] Que cualquier `RAISE` será tratado como error transitorio por defecto en TS.
  - [ ] Si más adelante se quiere diferenciar fatal vs transitorio, se hará por texto.

4.2. `f_payments_upsert_by_session`

- [ ] Confirmar que:
  - [ ] `USER_NOT_FOUND_FROM_SESSION` se lanza textual en excepciones.
- [ ] Documentar que:
  - [ ] Esta cadena se usará en TS para clasificar como `error_transient`.

---

## 5. Pruebas recomendadas

5.1. Pruebas unitarias / locales (si existen)

- [ ] Agregar pruebas de `f_ensureUserByEmail` simulando:
  - [ ] Email inválido.
  - [ ] Usuario ya existente.
  - [ ] `createUser` con 5xx que de todos modos crea usuario.
  - [ ] `createUser` con 5xx sin usuario visible tras N intentos.

5.2. Pruebas end-to-end en Preview

Escenarios mínimo indispensables (modo test de Stripe):

- [ ] `checkout.session.completed` normal:
  - [ ] Confirmar:
    - [ ] Usuario creado (si no existía).
    - [ ] Orden y entitlements en Supabase.
    - [ ] `webhook_events` (Next) marca `processed`.
    - [ ] Supabase `webhook_events` (si la usas) también.

- [ ] Forzar un 500 de Auth en `createUser` (si es posible simular):
  - [ ] Confirmar:
    - [ ] Stripe recibe 500 en webhook.
    - [ ] Stripe reintenta.
    - [ ] En un intento siguiente, cuando el usuario ya es visible, el evento se procesa bien.

- [ ] `payment_intent.succeeded` que llega antes del `checkout.session.completed`:
  - [ ] Confirmar:
    - [ ] Si `f_orders_resolve_user` no puede resolver usuario:
      - [ ] `USER_NOT_FOUND_FROM_SESSION` se traduce a `error_transient`.
      - [ ] HTTP 500 a Stripe.
    - [ ] Después de que `checkout.session.completed` se procese:
      - [ ] Reintento de Stripe en `payment_intent.succeeded` termina en `processed`.

- [ ] `invoice.payment_succeeded` para una invoice manual:
  - [ ] Confirmar:
    - [ ] Usuario existe / se crea.
    - [ ] Orden y entitlements correctos.

5.3. Verificación de no regresión

- [ ] Validar que eventos que antes se marcaban como `ignored` (tipos no soportados) siguen recibiendo 200 y no disparan reintentos innecesarios.

---

## 6. Cierre y documentación

- [ ] Actualizar documentación interna (md) del proyecto para:
  - [ ] Describir el nuevo contrato de `f_ensureUserByEmail`.
  - [ ] Documentar los nuevos `outcome` de `h_stripe_webhook_process`.
  - [ ] Incluir la tabla de decisiones HTTP vs reintentos de Stripe.
- [ ] Registrar en changelog:
  - [ ] Versión / tag donde se introduce este fix.
- [ ] Notificar al responsable de monitoreo que:
  - [ ] Los errores 500 en `/api/stripe/webhooks` ahora son esperados en algunos escenarios y deben interpretarse como reintentos controlados.