# Runbook — Validación End-to-End Stripe ↔ Next.js ↔ Supabase

## Objetivo
Repetir y validar el flujo completo de webhooks Stripe en entorno TEST, incluyendo casos exitosos y de error.

---

## Prerrequisitos
- Next.js corriendo con variables:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Endpoint habilitado: `POST /api/stripe/webhooks`
- Precio en Stripe TEST:
  - `metadata.sku = sku-webhook-e2e-v001`
  - `price_1S1u5JQ8dpmAG0o2hPMnMy7l`
- Catálogo en Supabase:
  - `products.sku = 'sku-webhook-e2e-v001'`
  - `product_prices.sku = 'sku-webhook-e2e-v001'` con el mismo `stripe_price_id`

---

## Flujo OK (recomendado vía Dashboard)

1. Stripe Dashboard → **Customers** → usa `rhuerta.consulting@gmail.com`.
2. **Invoices** → Create invoice → Add item → selecciona **Price** `price_…My7l`.
3. Finalize → **Charge customer**.
4. Verifica en terminal:
   - `GET /v1/invoices/{id}` 200 con expand de `lines.data.price` y `price.product`.
   - `POST /api/stripe/webhooks 200`.
5. Verifica en DB (rápido):
   ```sql
   -- Orden
   select id,total_cents,currency,status,order_number,created_at
   from order_headers order by created_at desc limit 1;

   -- Pago
   select id,order_id,total_cents,status,stripe_invoice_id,created_at
   from payments order by created_at desc limit 1;

   -- Acceso
   select id,user_id,sku,fulfillment_type,active,created_at
   from entitlements order by created_at desc limit 1;
````

---

## Replay

* Reenvía el mismo `event_id` desde Stripe CLI o usa “Resend” en Events del Dashboard.
* Esperado:

  * Respuesta `200`.
  * **Sin** nuevos inserts.
  * `webhook_events`: primer evento con `processed_at` y `order_id`; replay marcado como replay sin duplicados.

---

## Firma inválida

* Enviar POST sin header `Stripe-Signature` o con secreto incorrecto.
* Ejemplo:

  ```bash
  curl -X POST http://localhost:3000/api/stripe/webhooks -d '{}' -H "Content-Type: application/json"
  ```
* Esperado:

  * Respuesta `400`.
  * **Sin** escrituras en DB ni marcas en `webhook_events`.

---

## Falla simulada en DB

* Induce error transitorio antes del upsert (ej. deshabilitar temporalmente la FK o lanzar `raise exception` en `f_orch_orders_upsert` en entorno de prueba).
* Esperado:

  * Log con error en servidor.
  * Respuesta externa `200` (el webhook no debe romperse).
  * `webhook_events` marcado como **failed** con el error.

---

## Dependencias críticas

* **Next.js**: `app/api/stripe/webhooks/route.ts`

  * Verificación de firma.
  * Idempotencia (`webhook_events_*`).
  * Refetch (`f_refetchInvoice` / `f_refetchSession`).
  * Orquestación (`h_stripe_webhook_process` → `f_orch_orders_upsert`).
  * Marca `processed / ignored / failed`.
* **Supabase** SQL estable:

  * `f_orders_parse_payment(jsonb)`
  * `f_orch_orders_upsert(jsonb)`
  * `f_payments_upsert(uuid,jsonb,uuid)`
* **Stripe**:

  * TEST mode activo.
  * Precio con `metadata.sku` consistente con catálogo.

---

## Cheat-sheet de comandos

```bash
# Escuchar webhooks localmente
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks

# Consultas rápidas (psql / SQL editor Supabase)
-- Orden
select id,total_cents,currency,status,order_number,created_at
from order_headers order by created_at desc limit 1;

-- Pago
select id,order_id,total_cents,status,stripe_invoice_id,created_at
from payments order by created_at desc limit 1;

-- Acceso
select id,user_id,sku,fulfillment_type,active,created_at
from entitlements order by created_at desc limit 1;

# Reenviar un evento desde CLI
stripe events resend evt_xxx --forward-to http://localhost:3000/api/stripe/webhooks
```

---

## Resultado esperado por escenario

* **OK** → Orden + Pago + Entitlement creados.
* **Replay** → 200 sin duplicados.
* **Firma inválida** → 400 sin efectos.
* **Falla DB** → 200 externo, evento marcado `failed`.

```
