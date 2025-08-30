```md
# Objetivo 4 — Stripe + Next.js + Supabase + Resend

Este documento controla las tareas y chats derivados para completar la integración de pagos.

## Bloques de trabajo

### Bloque 1 — Configuración Stripe
Chat: **"Stripe configuración precios y metadata"**  
Prompt base:
```

### Bloque 2 — Supabase soporte para Stripe
Chat: **"Supabase integración con Stripe"**  
Prompt base:
```

Quiero trabajar en la parte Supabase del Objetivo 4.
Contexto: ya existen tablas `orders`, `entitlements` y vista `v_prices_active`.
Necesito validar que están listas para integrarse con Stripe webhooks:

* `orders.stripe_session_id` como unique.
* Índices en `orders.user_id` y `entitlements.user_id`.
* Tabla `webhook_events` o `order_events` para idempotencia.
* Funciones auxiliares: `getOrCreateUser`, `grantEntitlement`, `revokeEntitlement`.
  Pídeme esquemas actuales antes de inventar columnas. Guíame con convenciones ya definidas.

```

---

### Bloque 3 — Vercel y variables de entorno
Chat: **"Vercel configuración entorno Stripe"**  
Prompt base:
```

Quiero trabajar en la configuración de Vercel para Objetivo 4.
Contexto: usaré GitHub → Vercel para desplegar Next.js.
Necesito checklist de variables de entorno (Stripe, Supabase, Resend, NEXT\_PUBLIC\_SITE\_URL), cómo nombrarlas y dónde poner `STRIPE_WEBHOOK_SECRET`.
Pídeme confirmación antes de asumir valores o nombres de variables.
No necesito código, solo la guía de setup.

```

---

### Bloque 4 — Endpoints en Next.js
Chat: **"Endpoints Stripe en Next.js"**  
Prompt base:
```

Quiero implementar los endpoints de Objetivo 4 en Next.js (App Router).
Contexto: crear `/api/stripe/create-checkout-session` y `/api/stripe/webhooks`.
Requerimientos:

* Mantener convención de nombres de funciones y módulos definida en el proyecto.
* `create-checkout-session`: recibe {sku, currency}, busca en Supabase, crea sesión Embedded, devuelve {client\_secret, sessionId}.
* `webhooks`: maneja checkout.session.completed, invoice.payment\_succeeded, customer.subscription.deleted, con lógica de órdenes y entitlements.
  Antes de darme código completo, pídeme si quiero empezar por un archivo entero o solo una sección (ej. consulta Supabase).

```

---

### Bloque 5 — Página `/gracias` y pruebas E2E
Chat: **"Página gracias y pruebas E2E"**  
Prompt base:
```

Quiero trabajar en la página `/gracias` y pruebas end-to-end del Objetivo 4.
Contexto: Stripe regresa `session_id`, debo validarlo en el servidor y mostrar CTA según `success_slug`.
Necesito guía para:

1. Construir página `/gracias` que consulte `session_id` y muestre CTA.
2. Definir pruebas sandbox: tarjeta de prueba, OXXO, suscripción.
3. Validar flujo webhook → Supabase → Resend → render `/gracias`.
   Antes de dar código, pídeme si quiero solo la parte de validación del session\_id o toda la página.

```
```
