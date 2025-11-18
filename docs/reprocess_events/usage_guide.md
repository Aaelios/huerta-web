Aquí va la guía en formato Markdown, lista para pegar en docs/ops/webhooks-reprocess.md o similar.

⸻

Guía de uso · Reprocesamiento de webhooks Stripe

Esta ruta permite reprocesar un evento de Stripe ya registrado en webhook_events usando el mismo orquestador del webhook real:
	•	Endpoint: /api/admin/stripe/reprocess-event
	•	Método: POST
	•	Cuerpo JSON:
	•	Por webhook_event_id interno:
{"mode": "webhook_event_id", "id": "<uuid de webhook_events.id>"}
	•	Por stripe_event_id:
{"mode": "stripe_event_id", "id": "<evt_xxx de Stripe>"}

Recomendado: usar siempre primero webhook_event_id para no equivocarse de evento.

⸻

1. Requisitos

1.1 Variable de entorno
	•	ADMIN_REPROCESS_KEY
	•	Si está definida:
	•	La llamada debe incluir el header: x-admin-key: <valor>
	•	Si NO está definida:
	•	El endpoint acepta llamadas sin autenticación adicional
(solo se permite esto en dev / preview).

Recomendado:
	•	Dev/local:
ADMIN_REPROCESS_KEY=dev-reprocess-123
	•	Preview:
ADMIN_REPROCESS_KEY=preview-reprocess-<algo>
	•	Prod:
ADMIN_REPROCESS_KEY=prod-reprocess-<valor-seguro>

Nunca loggear el valor real.

1.2 Dónde correr los comandos
	•	Local: terminal de VS Code o cualquier terminal con curl.
	•	Prod / Preview: desde cualquier equipo con curl, apuntando al dominio correspondiente.

⸻

2. Formato del body

Modo 1: por webhook_event_id (UUID de la tabla webhook_events):
	•	mode: "webhook_event_id"
	•	id: valor de webhook_events.id (uuid)

Modo 2: por stripe_event_id (evt_xxx):
	•	mode: "stripe_event_id"
	•	id: valor de webhook_events.stripe_event_id o del evento en Stripe.

El endpoint valida tipos. Si los campos clave vienen null o mal formados, responde 422 invalid_row.

⸻

3. Ejemplos de uso con curl

# =========================================================
# 3.1 Dev local — por webhook_event_id (recomendado)
# =========================================================
# Precondiciones:
# - APP corriendo en http://localhost:3000
# - .env.local incluye: ADMIN_REPROCESS_KEY=dev-reprocess-123
# - Tienes un id en webhook_events.id, por ejemplo:
#   ed7d3699-64f2-4c7a-a3c2-5925d106bf9f

curl -X POST http://localhost:3000/api/admin/stripe/reprocess-event \
  -H "Content-Type: application/json" \
  -H "x-admin-key: dev-reprocess-123" \
  -d '{
    "mode": "webhook_event_id",
    "id": "ed7d3699-64f2-4c7a-a3c2-5925d106bf9f"
  }'


# =========================================================
# 3.2 Dev local — por stripe_event_id (evt_xxx)
# =========================================================
# Útil cuando copias el id directo de los logs de Stripe.
# Ejemplo: stripe_event_id = "evt_3SUccfQ8dpmAG0o206WhwC01"

curl -X POST http://localhost:3000/api/admin/stripe/reprocess-event \
  -H "Content-Type: application/json" \
  -H "x-admin-key: dev-reprocess-123" \
  -d '{
    "mode": "stripe_event_id",
    "id": "evt_3SUccfQ8dpmAG0o206WhwC01"
  }'


# =========================================================
# 3.3 Preview (Vercel) — por webhook_event_id
# =========================================================
# Reemplaza:
# - https://huerta-web-preview.vercel.app por el dominio real del preview
# - preview-reprocess-XYZ por la clave configurada en el entorno Preview
# - id por el uuid real de webhook_events

curl -X POST https://huerta-web-preview.vercel.app/api/admin/stripe/reprocess-event \
  -H "Content-Type: application/json" \
  -H "x-admin-key: preview-reprocess-XYZ" \
  -d '{
    "mode": "webhook_event_id",
    "id": "REEMPLAZAR-CON-UUID-DE-WEBHOOK_EVENTS"
  }'


# =========================================================
# 3.4 Producción — por webhook_event_id
# =========================================================
# Uso real en producción. Máximo cuidado:
# - Solo usar cuando se tenga claro el impacto del evento.
# - Ideal: documentar cada uso en docs/ops/incidents.md.

curl -X POST https://lobra.net/api/admin/stripe/reprocess-event \
  -H "Content-Type: application/json" \
  -H "x-admin-key: prod-reprocess-SECRET" \
  -d '{
    "mode": "webhook_event_id",
    "id": "REEMPLAZAR-CON-UUID-DE-WEBHOOK_EVENTS"
  }'


# =========================================================
# 3.5 Producción — por stripe_event_id
# =========================================================
# Alternativa cuando solo tienes el id de Stripe (evt_xxx).
# Útil si copias desde el Dashboard de Stripe o logs del webhook.

curl -X POST https://lobra.net/api/admin/stripe/reprocess-event \
  -H "Content-Type: application/json" \
  -H "x-admin-key: prod-reprocess-SECRET" \
  -d '{
    "mode": "stripe_event_id",
    "id": "evt_xxx_REEMPLAZAR"
  }'


⸻

4. Respuestas esperadas

Ejemplo de respuesta exitosa:

{
  "status": "ok",
  "outcome": "processed",
  "stripe_event_id": "evt_3SUccfQ8dpmAG0o206WhwC01",
  "webhook_event_id": "ed7d3699-64f2-4c7a-a3c2-5925d106bf9f",
  "type": "payment_intent.succeeded"
}

Campos:
	•	status:
	•	"ok" → el endpoint corrió sin errores de sistema.
	•	outcome (orquestador):
	•	"processed":
	•	Se ejecutó la lógica de negocio y se considera ya consistente.
	•	En webhook_events se marca processed_at y (si aplica) order_id.
	•	"ignored":
	•	El evento se consideró irrelevante para la lógica de negocio.
	•	En webhook_events se marca como ignorado.
	•	"error_fatal":
	•	El orquestador decidió no procesar el evento (caso estructural o definitivo).
	•	type:
	•	Tipo de evento de Stripe (checkout.session.completed, payment_intent.succeeded, invoice.payment_succeeded).

En caso de error transitorio:
	•	HTTP 500
	•	Body:

{
  "status": "error",
  "kind": "error_transient",
  "stripe_event_id": "evt_xxx",
  "webhook_event_id": "uuid"
}



⸻

5. Checklist rápido después de reprocesar

Para cada reproceso:
	1.	Revisar en webhook_events:
	•	Fila con ese id o stripe_event_id.
	•	processed_at no nulo si outcome = processed.
	•	order_id correcto si el evento crea / vincula orden.
	2.	Revisar en tablas de negocio:
	•	order_headers: no hay órdenes duplicadas.
	•	payments (o equivalente): solo un pago por payment_intent.
	•	entitlements: sin duplicados para el mismo usuario + sku.
	3.	En incidentes relevantes de prod:
	•	Documentar en docs/ops/incidents.md:
	•	Fecha.
	•	Evento reprocesado (webhook_event_id, stripe_event_id).
	•	Motivo.
	•	Resultado (qué se corrigió).


Necesito ayuda para reprocesar un webhook Stripe.

Dime qué comando curl debo ejecutar y valida que no rompa nada.
Aquí están los datos:

– Entorno: <dev | preview | prod>
– Clave ADMIN_REPROCESS_KEY disponible: <sí/no> y valor si aplica
– Tipo de identificación: <webhook_event_id | stripe_event_id>
– ID: <pegar aquí>
– ¿Qué espero que haga el reproceso? <crear orden / solo marcar processed / asociar order_id / validar pago / otro>

Pídeme cualquier otro dato que necesites antes de generarlo.celar