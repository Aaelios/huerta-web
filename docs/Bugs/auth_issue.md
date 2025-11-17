Diseño técnico fix definitivo — Webhooks Stripe / Supabase

Versión: design-v1
Ámbito: checkout.session.completed, invoice.payment_succeeded, payment_intent.succeeded, f_ensureUserByEmail, h_stripe_webhook_process, /api/stripe/webhooks

⸻

0. Contexto actual resumido
	•	Webhook /api/stripe/webhooks:
	•	Verifica firma.
	•	Guarda evento en tabla webhook_events (Next) vía f_webhookEvents_*.
	•	Refetchea objetos canónicos de Stripe (session, invoice, payment_intent).
	•	Llama a h_stripe_webhook_process({ type, stripeEventId, session, invoice, payment_intent }).
	•	Atrapa cualquier excepción, la loguea y SIEMPRE responde 200.
	•	h_stripe_webhook_process:
	•	Para cualquier tipo con email:
	•	Llama f_ensureUserByEmail(email) y deja propagar errores.
	•	checkout.session.completed / invoice.payment_succeeded:
	•	Construye session_payload.
	•	Llama f_orch_orders_upsert(session_payload) (Supabase SECURITY DEFINER).
	•	payment_intent.succeeded:
	•	Llama f_payments_upsert_by_session(p_payment_intent, p_session, null).
	•	f_ensureUserByEmail:
	•	Si f_auth_get_user no encuentra usuario:
	•	Llama supabase.auth.admin.createUser.
	•	Cualquier 500 de Auth sin flag “already exists” → lanza excepción.
	•	Stripe no ve nunca 500, así que no reintenta.
	•	f_orch_orders_upsert:
	•	Evento maestro para:
	•	checkout.session.completed
	•	invoice.payment_succeeded
	•	Crea / actualiza:
	•	order_headers, entitlements.
	•	Para invoices, también pagos.
	•	f_payments_upsert_by_session:
	•	No crea órdenes.
	•	Busca orden por session_id / payment_intent_id y llama f_payments_upsert.

⸻

1. Objetivo del fix
	1.	Garantizar que:
	•	Un fallo transitorio de Supabase Auth (500) no corte la creación de orden y entitlements.
	•	Stripe vea 500 cuando el fallo sea realmente transitorio y pueda reintentar.
	2.	Mantener un evento maestro de negocio:
	•	checkout.session.completed (Stripe Checkout).
	•	invoice.payment_succeeded (facturación manual / payment links con invoice).
	3.	Mantener payment_intent.succeeded como evento financiero complementario:
	•	No crea usuario ni orden.
	•	Solo registra pagos / ligas adicionales.
	4.	No duplicar lógica de órdenes en Next:
	•	f_orch_orders_upsert y f_payments_upsert_by_session siguen siendo la capa de negocio en Supabase.

⸻

2. Cambios de alto nivel
	1.	f_ensureUserByEmail → versión v2 (MODIFICACIÓN)
	•	Nuevo contrato: devuelve success | transient_error | fatal_error.
	•	Implementa retry + backoff en errores 5xx.
	•	Siempre re-checa existencia de usuario tras un 5xx antes de reintentar.
	•	Clasifica:
	•	Email inválido / 4xx de policy → fatal_error.
	•	5xx persistente sin usuario visible → transient_error.
	2.	h_stripe_webhook_process → versión v2 (MODIFICACIÓN)
	•	Solo llama a f_ensureUserByEmail_v2 en:
	•	checkout.session.completed.
	•	invoice.payment_succeeded.
	•	Deja de crear usuario en payment_intent.succeeded.
	•	Interpreta resultado de f_ensureUserByEmail_v2:
	•	success → continúa a RPC SQL.
	•	transient_error → reporta outcome transitorio (para que el route responda 500).
	•	fatal_error → outcome fatal pero no-reintentable.
	3.	/api/stripe/webhooks → route v2 (MODIFICACIÓN)
	•	Ya no ignora el resultado de h_stripe_webhook_process.
	•	Si el resultado es “transient_error”:
	•	Responde 500 a Stripe (reintentos automáticos).
	•	Si el resultado es “processed” o “fatal no recuperable”:
	•	Responde 200 (o 4xx para casos puntuales si se quiere).
	4.	payment_intent.succeeded → ajuste de rol (MODIFICACIÓN)
	•	No llama más a f_ensureUserByEmail.
	•	Delega en f_payments_upsert_by_session:
	•	Si esta función lanza USER_NOT_FOUND_FROM_SESSION o similar:
	•	Se tratará como error transitorio → 500 a Stripe.
	5.	SQL (f_orch_orders_upsert y f_payments_upsert_by_session)
	•	No requieren cambios para el fix mínimo.
	•	Solo se documenta cómo interpretar sus excepciones / retornos.

⸻

3. Contratos nuevos / modificados

3.1 f_ensureUserByEmail_v2 (MODIFICACIÓN)

Nombre: f_ensureUserByEmail_v2 (en código real puede mantener el nombre actual y cambiar implementación).
Tipo de cambio: Modificación (reemplaza la implementación actual).

Contrato funcional
	•	Entrada:
	•	email: string (texto libre, puede venir con espacios/mayúsculas).
	•	Salida (result object):

type EnsureUserResult =
  | {
      kind: 'success';
      userId: string;
      wasCreated: boolean; // true si se creó en esta llamada o tras un 5xx; false si ya existía
    }
  | {
      kind: 'transient_error';
      reason: string;   // código legible (e.g. 'auth_5xx_all_attempts_failed')
      details?: any;    // opcional, para logging
      retryable: true;  // siempre true en este branch
    }
  | {
      kind: 'fatal_error';
      reason: string;   // e.g. 'EMAIL_INVALID', 'auth_4xx'
      details?: any;
      retryable: false;
    };

	•	Reglas de clasificación (resumen):
	•	Email vacío → kind = 'fatal_error', reason = 'EMAIL_REQUIRED'.
	•	Email con formato inválido → kind = 'fatal_error', reason = 'EMAIL_INVALID'.
	•	f_auth_get_user encuentra usuario → success (wasCreated=false).
	•	createUser:
	•	Éxito → success (wasCreated=true).
	•	Error 422 / “already exists” → re-checar usuario:
	•	Si existe → success (wasCreated=false).
	•	Si no existe → tratar como transient_error.
	•	Error 4xx distinto de 422 → fatal_error (policy).
	•	Error 5xx:
	•	Retry N veces con backoff, re-checando usuario antes de cada retry.
	•	Si después de N intentos no hay usuario visible → transient_error.

⸻

3.2 h_stripe_webhook_process_v2 (MODIFICACIÓN)

Nombre: h_stripe_webhook_process_v2 (mismo archivo, nueva forma de resultado).
Tipo de cambio: Modificación.

Contrato funcional
Entrada (igual que hoy):

type TStripeWebhookInput = {
  type: string;                  // 'checkout.session.completed' | 'invoice.payment_succeeded' | 'payment_intent.succeeded'
  stripeEventId: string;
  session?: Stripe.Checkout.Session;
  invoice?: Stripe.Invoice;
  payment_intent?: Stripe.PaymentIntent;
};

Salida (nuevo discriminated union):

type TStripeWebhookResult =
  | {
      outcome: 'processed';
      details?: Record<string, any>;
    }
  | {
      outcome: 'ignored';
      reason: string;
      details?: Record<string, any>;
    }
  | {
      outcome: 'error_transient';
      reason: string;
      details?: Record<string, any>;
    }
  | {
      outcome: 'error_fatal';
      reason: string;
      details?: Record<string, any>;
    };

Semántica:
	•	processed:
	•	Evento de Stripe se considera aplicado correctamente a nivel de negocio.
	•	ignored:
	•	Evento no requiere acción (tipo no soportado, falta de expansiones, etc.).
	•	No hay beneficio en reintentar.
	•	error_transient:
	•	Falla en infraestructura o dependencia (Auth 5xx, DB 5xx, usuario aún no visible, etc.).
	•	Vale la pena que Stripe reintente (HTTP 500).
	•	error_fatal:
	•	Entrada irrecuperable automáticamente (metadata inválida, email imposible, configuración corrupta).
	•	Reintentar no resolverá el problema sin intervención manual.

⸻

3.3 Webhook /api/stripe/webhooks — route v2 (MODIFICACIÓN)

Nombre: POST /api/stripe/webhooks
Tipo de cambio: Modificación de comportamiento final.

Contrato funcional relevante
Cambio principal:
	•	Después de llamar a h_stripe_webhook_process_v2, ahora se interpreta el outcome:

outcome	HTTP a Stripe	Acciones recomendadas
processed	200	Marcar evento como processed (Next + Supabase).
ignored	200	Marcar evento como ignored (Next + Supabase si aplica).
error_transient	500	NO marcar como processed/ignored en Next.
error_fatal	200 (o 400)	Registrar error detallado. No esperar reintento automático.

Notas:
	•	La lógica de envío de correo post-compra permanece igual.
	•	Verificación de firma y storage del raw payload permanece igual.

⸻

4. Pseudocódigo por función / cambio

4.1 Pseudocódigo — f_ensureUserByEmail_v2

Tipo: MODIFICACIÓN (reemplaza la implementación actual)

Pseudocódigo — f_ensureUserByEmail_v2
Tipo: MODIFICACIÓN (reemplaza f_ensureUserByEmail actual)

function f_ensureUserByEmail_v2(email: string): EnsureUserResult
    pEmail = normalizeAndValidate(email)

    if pEmail is invalid_format:
        return { kind: 'fatal_error', reason: 'EMAIL_INVALID', retryable: false }

    // 1) Intento rápido vía f_auth_get_user (igual que hoy)
    maybeUserId = rpc_f_auth_get_user(pEmail)
    if maybeUserId is not null:
        return { kind: 'success', userId: String(maybeUserId), wasCreated: false }

    // 2) Intentar crear usuario con retries y backoff
    maxAttempts = 3
    backoffMs = [100, 300, 1000]

    for attempt in 1..maxAttempts:
        result = authAdminCreateUser(pEmail)

        if result.success AND result.user.id exists:
            return {
                kind: 'success',
                userId: result.user.id,
                wasCreated: true
            }

        error = result.error

        // 2.1 Caso "ya existe"
        if isAlreadyExistsError(error):   // status 422 OR msg contains "already"
            // Re-checar vía f_auth_get_user (más barato que listUsers)
            maybeUserId2 = rpc_f_auth_get_user(pEmail)
            if maybeUserId2 is not null:
                return { kind: 'success', userId: String(maybeUserId2), wasCreated: false }

            // fallback extremo: listar usuarios (como hoy)
            listed = authAdminListUsers(perPage=1000)
            if listed.error:
                // no podemos confirmar nada → tratamos como error transitorio
                return {
                    kind: 'transient_error',
                    reason: 'auth_list_users_failed_after_422',
                    details: listed.error,
                    retryable: true
                }
            fetched = findUserByEmail(listed.users, pEmail)
            if fetched exists:
                return { kind: 'success', userId: fetched.id, wasCreated: false }

            // si después de todo no lo encontramos, lo tratamos como transitorio
            return {
                kind: 'transient_error',
                reason: 'auth_422_but_user_not_found',
                retryable: true
            }

        // 2.2 Errores 4xx distintos de 422 (policy)
        if is4xxNot422(error):
            return {
                kind: 'fatal_error',
                reason: 'auth_4xx_non_422',
                details: error,
                retryable: false
            }

        // 2.3 Errores 5xx → transitorio pero con reintentos
        if is5xx(error):
            // Esperar backoff
            sleep(backoffMs[attempt - 1])

            // Antes de reintentar, checar de nuevo si el usuario ya existe
            maybeUserId3 = rpc_f_auth_get_user(pEmail)
            if maybeUserId3 is not null:
                return { kind: 'success', userId: String(maybeUserId3), wasCreated: false }

            // si no es el último intento, continuar el loop
            if attempt < maxAttempts:
                continue

            // si es el último y seguimos igual → error_transient
            return {
                kind: 'transient_error',
                reason: 'auth_5xx_all_attempts_failed',
                details: error,
                retryable: true
            }

        // 2.4 Cualquier otro error desconocido
        return {
            kind: 'transient_error',          // se puede ser más específico si se desea
            reason: 'auth_unknown_error',
            details: error,
            retryable: true
        }

    // En teoría nunca se llega aquí por los returns anteriores
end function


⸻

4.2 Pseudocódigo — h_stripe_webhook_process_v2

Tipo: MODIFICACIÓN (reemplaza la implementación actual)

Pseudocódigo — h_stripe_webhook_process_v2
Tipo: MODIFICACIÓN (reemplaza h_stripe_webhook_process actual)
Nota: incluye eliminar el uso de f_ensureUserByEmail en payment_intent.succeeded

function h_stripe_webhook_process_v2(input: TStripeWebhookInput): TStripeWebhookResult
    supportedTypes = {
        'checkout.session.completed',
        'invoice.payment_succeeded',
        'payment_intent.succeeded'
    }

    if input.type not in supportedTypes:
        return { outcome: 'ignored', reason: 'UNHANDLED_EVENT_TYPE' }

    email = getEmail(input)  // misma función de hoy

    // 1) Validación básica por tipo
    if (input.type != 'payment_intent.succeeded') AND (email is null):
        return { outcome: 'error_fatal', reason: 'MISSING_EMAIL' }

    // 2) Branch por tipo de evento
    if input.type == 'payment_intent.succeeded':
        // IMPORTANTE: aquí ya NO se llama f_ensureUserByEmail
        return handlePaymentIntentSucceeded_v2(input)

    else if input.type == 'checkout.session.completed':
        return handleCheckoutSessionCompleted_v2(input, email)

    else if input.type == 'invoice.payment_succeeded':
        return handleInvoicePaymentSucceeded_v2(input, email)
end function

4.2.1 Pseudocódigo — handleCheckoutSessionCompleted_v2
Tipo: NUEVA función auxiliar (vive dentro de h_stripe_webhook_process_v2, pero concepto nuevo)

Pseudocódigo — handleCheckoutSessionCompleted_v2
Tipo: NUEVA (lógica reorganizada para checkout dentro de h_stripe_webhook_process)

function handleCheckoutSessionCompleted_v2(input: TStripeWebhookInput, email: string): TStripeWebhookResult
    session = input.session
    if session is null:
        return { outcome: 'error_fatal', reason: 'MISSING_SESSION_OBJECT' }

    // 1) Resolver usuario con f_ensureUserByEmail_v2
    userResult = f_ensureUserByEmail_v2(email)

    if userResult.kind == 'transient_error':
        return {
            outcome: 'error_transient',
            reason: 'AUTH_TRANSIENT',
            details: { email, auth: userResult }
        }

    if userResult.kind == 'fatal_error':
        return {
            outcome: 'error_fatal',
            reason: 'AUTH_FATAL',
            details: { email, auth: userResult }
        }

    userId = userResult.userId

    // 2) Validar expansiones de precios como hoy
    if not hasValidLineItemsForCheckout(session):
        return {
            outcome: 'error_fatal',           // o 'ignored', según preferencia
            reason: 'MISSING_EXPANSIONS',
            details: { need: 'line_items.data.price OR pricing.price_details.price' }
        }

    // 3) Construir session_payload exactamente como hoy
    priceIds = extractPriceIds(input)
    session_payload = {
        stripe_event_id: input.stripeEventId,
        type: input.type,
        data: {
            object: session,
            debug: {
                email,
                price_ids: priceIds,
                flags: hasPricePath(session)
            }
        }
    }

    // 4) Llamar f_orch_orders_upsert
    supabase = m_getSupabaseService()
    try
        orderId = supabase.rpc('f_orch_orders_upsert', { session_payload })
    catch dbError
        // Asumimos que cualquier excepción aquí es transitoria a nivel infraestructura
        return {
            outcome: 'error_transient',
            reason: 'ORCH_UPSERT_FAILED',
            details: { message: dbError.message }
        }

    // 5) Éxito
    return {
        outcome: 'processed',
        details: { type: input.type, orderId, priceIds }
    }
end function

Nota: internamente f_orch_orders_upsert seguirá haciendo sus propias validaciones (INVALID_PAYMENT, INVALID_FULFILLMENT, etc.). Si consideras que algunas de estas deben ser “fatal” y no “transient”, se puede diferenciar por texto del error más adelante.

4.2.2 Pseudocódigo — handleInvoicePaymentSucceeded_v2
Tipo: NUEVA función auxiliar (misma idea que checkout, pero para invoices)

Pseudocódigo — handleInvoicePaymentSucceeded_v2
Tipo: NUEVA (lógica reorganizada para invoices dentro de h_stripe_webhook_process)

function handleInvoicePaymentSucceeded_v2(input: TStripeWebhookInput, email: string): TStripeWebhookResult
    invoice = input.invoice
    if invoice is null:
        return { outcome: 'error_fatal', reason: 'MISSING_INVOICE_OBJECT' }

    // 1) Resolver usuario con f_ensureUserByEmail_v2
    userResult = f_ensureUserByEmail_v2(email)

    if userResult.kind == 'transient_error':
        return {
            outcome: 'error_transient',
            reason: 'AUTH_TRANSIENT',
            details: { email, auth: userResult }
        }

    if userResult.kind == 'fatal_error':
        return {
            outcome: 'error_fatal',
            reason: 'AUTH_FATAL',
            details: { email, auth: userResult }
        }

    userId = userResult.userId

    // 2) Validar expansiones para invoice (igual que hoy)
    if not hasValidLineItemsForInvoice(invoice):
        return {
            outcome: 'error_fatal',
            reason: 'MISSING_EXPANSIONS',
            details: { need: 'lines.data.price OR pricing.price_details.price' }
        }

    // 3) Construir session_payload
    priceIds = extractPriceIds(input)
    session_payload = {
        stripe_event_id: input.stripeEventId,
        type: input.type,
        data: {
            object: invoice,
            debug: {
                email,
                price_ids: priceIds,
                flags: hasPricePath(invoice)
            }
        }
    }

    // 4) Llamar f_orch_orders_upsert (misma RPC que checkout)
    supabase = m_getSupabaseService()
    try
        orderId = supabase.rpc('f_orch_orders_upsert', { session_payload })
    catch dbError
        return {
            outcome: 'error_transient',
            reason: 'ORCH_UPSERT_FAILED',
            details: { message: dbError.message }
        }

    return {
        outcome: 'processed',
        details: { type: input.type, orderId, priceIds }
    }
end function

4.2.3 Pseudocódigo — handlePaymentIntentSucceeded_v2
Tipo: MODIFICACIÓN (misma función conceptual que hoy, pero sin crear usuario y con errores transitorios)

Pseudocódigo — handlePaymentIntentSucceeded_v2
Tipo: MODIFICACIÓN (reemplaza rama actual de payment_intent.succeeded)
Nota: elimina uso de f_ensureUserByEmail en esta ruta

function handlePaymentIntentSucceeded_v2(input: TStripeWebhookInput): TStripeWebhookResult
    session = input.session
    payment_intent = input.payment_intent

    if session is null OR payment_intent is null:
        return {
            outcome: 'error_fatal',
            reason: 'MISSING_SESSION_OR_PI'
        }

    supabase = m_getSupabaseService()

    try
        result = supabase.rpc('f_payments_upsert_by_session', {
            p_payment_intent: payment_intent,
            p_session: session,
            p_order_id: null
        })
    catch dbError
        // Distinción opcional por mensaje de error
        if dbError.message contains 'USER_NOT_FOUND_FROM_SESSION':
            return {
                outcome: 'error_transient',
                reason: 'USER_NOT_FOUND_FROM_SESSION',
                details: { message: dbError.message }
            }

        // Otros errores DB también considerados transitorios por defecto
        return {
            outcome: 'error_transient',
            reason: 'PAYMENTS_UPSERT_BY_SESSION_FAILED',
            details: { message: dbError.message }
        }

    // Si llegamos aquí, la RPC no lanzó error
    row = extractFirstRow(result.data)  // igual que hoy
    paymentId = row?.payment_id or row?.paymentId
    orderId   = row?.order_id   or row?.orderId

    return {
        outcome: 'processed',
        details: {
            type: input.type,
            paymentId,
            orderId,
            pi_id: payment_intent.id
        }
    }
end function


⸻

4.3 Pseudocódigo — /api/stripe/webhooks route v2

Tipo: MODIFICACIÓN (cambio en el tratamiento de result)

Pseudocódigo — POST /api/stripe/webhooks (route.v8 hipotético)
Tipo: MODIFICACIÓN (ajusta la respuesta HTTP según outcome)

function POST_webhook(req: Request): Response
    // 0) Verificación de firma y lectura de raw (igual que hoy)
    sig = req.headers['stripe-signature']
    secret = STRIPE_WEBHOOK_SECRET
    raw = await req.text()

    try
        event = stripe.webhooks.constructEvent(raw, sig, secret)
    catch err
        return Response('Webhook Error: ' + err.message, 400)

    // 1) Idempotencia en tabla de Next (igual que hoy)
    existing = f_webhookEvents_getByStripeId(event.id)
    if existing:
        return Response.json({ ok: true, replay: true, id: event.id, type: event.type }, 200)

    f_webhookEvents_markReceived({ stripeEventId: event.id, type: event.type, payload: raw })

    // 2) Refetch canónico (session, invoice, payment_intent) — igual que hoy

    session = maybeRefetchSessionForEvent(event)
    invoice = maybeRefetchInvoiceForEvent(event)
    payment_intent = maybeRefetchPaymentIntentForEvent(event)

    // 3) Orquestación core
    result = null
    try
        result = h_stripe_webhook_process_v2({
            type: event.type,
            stripeEventId: event.id,
            session,
            invoice,
            payment_intent
        })
    catch e
        // Si h_stripe_webhook_process_v2 lanza algo inesperado, tratamos como error_transient genérico
        logError('orchestrate error', e)
        result = {
            outcome: 'error_transient',
            reason: 'UNHANDLED_EXCEPTION',
            details: { message: String(e) }
        }

    // 4) Marcar estado en tabla de events de Next según outcome
    if result.outcome == 'processed':
        f_webhookEvents_markProcessed({ stripeEventId: event.id, orderId: result.details?.orderId })
    else if result.outcome == 'ignored':
        f_webhookEvents_markIgnored({ stripeEventId: event.id })
    else
        // error_transient o error_fatal → no marcar como processed/ignored
        // se queda solo como received + logs

    // 5) Email post-compra (solo en checkout.session.completed pagado) — igual que hoy
    if event.type == 'checkout.session.completed' AND sessionPaid(session):
        sendReceiptIfNotSentYet(session)

    // 6) Respuesta HTTP según outcome
    if result.outcome == 'error_transient':
        return new Response('temporary_error', 500)

    // processed / ignored / error_fatal
    return new Response('ok', 200)
end function


⸻

5. Tabla de decisiones (matriz de errores → acción)

5.1 Matriz resumida

Condición / error origen	Evento	Outcome en h_stripe_webhook_process_v2	HTTP a Stripe	¿Stripe reintenta?	Notas clave
Auth 5xx al crear usuario, sin usuario visible tras N	checkout / invoice	error_transient	500	Sí	f_ensureUserByEmail_v2 → transient_error. No se llama f_orch_orders_upsert.
Email vacío / inválido	checkout / invoice	error_fatal	200 (o 400)	No	Error de entrada; se requiere intervención manual.
f_orch_orders_upsert lanza excepción (DB, timeout…)	checkout / invoice	error_transient	500	Sí	Se asume fallo transitorio. Idempotencia interna evita duplicados.
f_orch_orders_upsert valida INVALID_* (negocio)	checkout / invoice	error_transient o error_fatal según clasificación futura	500/200	Depende	Se puede afinar distinguiendo por mensaje.
f_payments_upsert_by_session lanza USER_NOT_FOUND…	payment_intent	error_transient	500	Sí	Espera a que evento maestro cree usuario.
f_payments_upsert_by_session lanza otros errores DB	payment_intent	error_transient	500	Sí	Fallo infraestructura.
payment_intent sin session o pi	payment_intent	error_fatal	200	No	Metadata/entrada inconsistente; no reintentar.
Evento tipo no soportado	cualquier	ignored	200	No	Misma lógica que hoy para tipos no manejados.
Falta de expansiones line_items/lines	checkout / invoice	error_fatal	200	No	Configuración de webhook / expansión; se corrige fuera.


⸻

6. Cambios que eliminan comportamiento existente

Para que el programador tenga claro qué se elimina o deja de usarse:
	1.	Eliminar creación de usuario en payment_intent.succeeded a nivel TS
	•	Antes:
	•	h_stripe_webhook_process llamaba await f_ensureUserByEmail(email) para todos los tipos, incluido payment_intent.succeeded.
	•	Después:
	•	handlePaymentIntentSucceeded_v2 no llama a f_ensureUserByEmail_v2.
	•	El usuario se asume creado por checkout.session.completed / invoice.payment_succeeded y resoluble en Supabase por f_orders_resolve_user.
	2.	Eliminar el patrón “cualquier error → log + HTTP 200” en el route
	•	Antes:
	•	Cualquier excepción en h_stripe_webhook_process se logueaba y se respondía 200.
	•	Después:
	•	h_stripe_webhook_process_v2 clasifica errores.
	•	El route responde 500 para error_transient.
	3.	Eliminar uso directo del Error.message de f_ensureUserByEmail como semántica
	•	Antes:
	•	f_ensureUserByEmail lanzaba errores diversos (EMAIL_INVALID, Database error creating new user, etc.).
	•	El handler no interpretaba semántica, solo logueaba.
	•	Después:
	•	f_ensureUserByEmail_v2 no se usa por side effects de excepción, sino por su kind.
	•	Las excepciones deberían ser la excepción real, no el mecanismo normal de control.

