# docs/tests/forms_e2e.md

# Plan de Pruebas E2E — Endpoint /api/forms/submit

Versión: 2025-09-28

## 0) Setup

- Endpoint: `POST https://lobra.net/api/forms/submit`
- Headers: `Content-Type: application/json`
- Requiere `turnstile_token` válido desde el widget de Cloudflare.
- Variables de ejemplo:
  - `EMAIL1=user@example.com`
  - `EMAIL2=lead@example.com`
  - `RID1=111e4567-e89b-42d3-a456-426614174000`
  - `RID2=222e4567-e89b-42d3-a456-426614174000`
  - `TURNSTILE_TOKEN=<pegado-del-widget>`

---

## 1) Éxito — newsletter

**Request**
```bash
curl -i -X POST https://lobra.net/api/forms/submit \
  -H "Content-Type: application/json" \
  -d "{
    \"type\":\"newsletter\",
    \"email\":\"$EMAIL1\",
    \"source\":\"web_form_footer\",
    \"request_id\":\"$RID1\",
    \"turnstile_token\":\"$TURNSTILE_TOKEN\",
    \"marketing_opt_in\": true
  }"
````

**Expected**

* HTTP 200
* Body:

```json
{ "submission_id":"$RID1","contact_id":"<uuid>","message_id":null,"type":"newsletter","status":"ok","warnings":[] }
```

* Log `submit_ok` con `status:"ok"`.

---

## 2) Éxito — contact con mensaje

**Request**

```bash
curl -i -X POST https://lobra.net/api/forms/submit \
  -H "Content-Type: application/json" \
  -d "{
    \"type\":\"contact\",
    \"email\":\"$EMAIL2\",
    \"full_name\":\"Cliente Demo\",
    \"source\":\"web_form_contact\",
    \"request_id\":\"$RID2\",
    \"turnstile_token\":\"$TURNSTILE_TOKEN\",
    \"marketing_opt_in\": false,
    \"payload\": { \"message\":\"Quiero más información\" }
  }"
```

**Expected**

* HTTP 200
* Body:

```json
{ "submission_id":"$RID2","contact_id":"<uuid>","message_id":"<uuid>","type":"contact","status":"ok","warnings":[] }
```

---

## 3) Idempotencia — reintento mismo `request_id`

**Request**: repetir caso 2 con el **mismo** `RID2`.

**Expected**

* HTTP 200
* Body:

```json
{ "submission_id":"$RID2","contact_id":"<uuid>","message_id":"<uuid>","type":"contact","status":"duplicate","warnings":[] }
```

* Log `submit_ok` con `status:"duplicate"`.

---

## 4) Turnstile inválido

**Request**: usar `turnstile_token:"invalid"` en el caso 1.

**Expected**

* HTTP 403
* Body:

```json
{ "error_code":"turnstile_invalid","message":"Verificación fallida.","request_id":"$RID1" }
```

* Log `turnstile_fail`.

---

## 5) Validación — email inválido

**Request**: como caso 1 pero `email:"not-an-email"`.

**Expected**

* HTTP 422
* Body:

```json
{ "error_code":"invalid_input","message":"Entrada inválida.","request_id":"$RID1" }
```

---

## 6) Validación — UUID inválido

**Request**: como caso 2 pero `request_id:"abc"`.

**Expected**

* HTTP 422
* Body con `error_code:"invalid_input"`.

---

## 7) Tamaño — `payload.message` > 2 KB

**Request**: como caso 2 pero con `payload.message` de ~3000 chars.

**Expected**

* HTTP 422
* Body con `error_code:"invalid_input"`.

*(Si se prueba con truncamiento en normalización, el warning esperado sería `truncated_field:payload.message`, pero por contrato actual el tope lo aplica Zod y debe fallar.)*

---

## 8) Tamaño — body > 64 KB

**Request**: enviar `metadata` con campo de ~70 KB.

**Expected**

* HTTP 413
* Body con `error_code:"payload_too_large"`.

---

## 9) Rate limit — burst por IP

**Procedimiento**

* Enviar **4** requests `newsletter` con `RID` distintos en **<60s** desde la misma IP.

**Expected**

* Los primeros **3** → 200.
* El 4º → 429:

```json
{ "error_code":"rate_limited","message":"Demasiados intentos. Intenta más tarde.","request_id":"<RID>" }
```

* Log `rate_limited` con `reason:"ip_burst"`.

---

## 10) Rate limit — burst por email

**Procedimiento**

* Enviar **3** requests con el **mismo email** y `type:"newsletter"` en <60s.

**Expected**

* Los primeros **2** → 200.
* El 3º → 429 con `reason:"email_burst"` en logs.

---

## 11) Rate limit — sostenido

**Procedimiento**

* Exceder **8** por IP o **3** por email en una ventana de 10 min.

**Expected**

* 429 con `reason:"ip_sustained"` o `email_sustained` en logs.

---

## 12) Simular error RPC

**Preparación**

* Configurar temporalmente la RPC para devolver `status:"error"` o provocar un error controlado.

**Expected**

* HTTP 500
* Body:

```json
{ "error_code":"server_error","message":"Error del servidor.","request_id":"<RID>" }
```

* Log `rpc_error`.

---

## 13) Warnings de normalización de `source`

**Request**

```bash
curl -i -X POST https://lobra.net/api/forms/submit \
  -H "Content-Type: application/json" \
  -d "{
    \"type\":\"newsletter\",
    \"email\":\"$EMAIL1\",
    \"source\":\"footer\",
    \"request_id\":\"$RID1\",
    \"turnstile_token\":\"$TURNSTILE_TOKEN\"
  }"
```

**Expected**

* HTTP 200
* `status:"ok"`
* `warnings` contiene `["source_normalized:web_form_footer"]`.

---

## 14) Observabilidad mínima esperada

* `turnstile_fail` con `request_id`, `type`, `source`, `latency_ms_turnstile`.
* `rate_limited` con `reason`, conteos y `latency_ms_rl`.
* `rpc_error` con `code`, `msg`, `latency_ms_rpc`.
* `submit_ok` con `status`, `latency_ms_total`.

---

## 15) Notas de QA

* Usar `RID`s únicos por intento salvo en caso de idempotencia.
* No incluir PII cruda en capturas de pantalla de logs.
* Documentar tiempo total por caso; alertar si > 2 s de mediana en preview.

```
```
