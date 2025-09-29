// app/api/forms/submit/route.ts

/**
 * Endpoint público POST /api/forms/submit
 * Flujo:
 * 1) Método y parseo seguro (límite bytes)
 * 2) Validación Zod por `type`
 * 3) Normalización + safe-list (warnings)
 * 4) Verificación Turnstile (si no está deshabilitado)
 * 5) Rate limit (IP/email) vía RPC (si no está deshabilitado)
 * 6) Llamada RPC orquestadora (f_orch_contact_write)
 * 7) Respuesta 200 ok|duplicate o error mapeado (4xx/5xx)
 * 8) Log estructurado sin PII en claro
 */

import { NextResponse } from 'next/server';
import { h_parse_body } from '../../../../lib/forms/h_parse_body';
import { SubmitInputSchema, assertMaxBodyBytes } from '../../../../lib/forms/schemas';
import { h_validate_normalize } from '../../../../lib/forms/h_validate_normalize';
import { h_verify_turnstile } from '../../../../lib/security/h_verify_turnstile';
import { h_rate_limit_touch } from '../../../../lib/rate_limit/h_rate_limit_touch';
import { h_call_orch_contact_write } from '../../../../lib/orch/h_call_orch_contact_write';
import {
  LOG_NAMESPACE,
  getErrorMessage,
} from '../../../../lib/forms/constants';
import { sha256Hex } from '../../../../lib/security/h_hash';

// ----- Config de runtime (Node) y no cache -----
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ===== Utilidades locales =====

/** Extrae la IP del request usando headers típicos en Vercel/Edge */
function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const ip = xff.split(',')[0]?.trim();
    return ip || null;
  }
  const xReal = req.headers.get('x-real-ip');
  if (xReal) return xReal.trim();
  return null;
}

/** Clasifica IP (solo informativo en metadata/logs) */
function classifyIp(ip: string | null): 'ipv4' | 'ipv6' | 'private' | 'unknown' {
  if (!ip) return 'unknown';
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) return 'private';
  return ip.includes(':') ? 'ipv6' : 'ipv4';
}

// ===== Mapeo de errores a HTTP =====

function errorResponse(
  code:
    | 'invalid_input'
    | 'turnstile_invalid'
    | 'rate_limited'
    | 'method_not_allowed'
    | 'payload_too_large'
    | 'server_error',
  request_id?: string,
  lang: 'es' | 'en' = 'es',
) {
  const http =
    code === 'invalid_input'
      ? 422
      : code === 'turnstile_invalid'
      ? 403
      : code === 'rate_limited'
      ? 429
      : code === 'method_not_allowed'
      ? 405
      : code === 'payload_too_large'
      ? 413
      : 500;

  return NextResponse.json(
    { error_code: code, message: getErrorMessage(code, lang), request_id },
    { status: http, headers: { 'Cache-Control': 'no-store' } },
  );
}

// ===== Handler principal =====

export async function POST(req: Request) {
  const t0 = Date.now();
  const lang = (req.headers.get('accept-language') || 'es')
    .toLowerCase()
    .startsWith('en')
    ? 'en'
    : 'es';

  if (req.method !== 'POST') return errorResponse('method_not_allowed', undefined, lang);

  // QA guard en producción: requiere header secreto
  const QA_GUARD = process.env.FORMS_QA_GUARD === 'true';
  if (QA_GUARD) {
    const token = req.headers.get('x-forms-qa-token') || '';
    if (!token || token !== process.env.FORMS_QA_TOKEN) {
      return NextResponse.json(
        { error_code: 'forbidden', message: 'Forbidden' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }

  // 1) Parseo seguro
  let raw = '';
  let body: unknown = {};
  try {
    const read = await h_parse_body(req);
    raw = read.raw;
    assertMaxBodyBytes(raw);
    body = read.json;
  } catch (e: any) {
    const code =
      e?.code === 'payload_too_large' ? 'payload_too_large' : 'invalid_input';
    return errorResponse(code, undefined, lang);
  }

  // 2) Validación Zod
  let parsed: any;
  try {
    parsed = SubmitInputSchema.parse(body);
  } catch (err: any) {
    console.error(
      JSON.stringify({
        ns: LOG_NAMESPACE,
        event: 'zod_invalid_input',
        request_id: (body as any)?.request_id,
        issues: err?.issues,
      }),
    );
    return errorResponse('invalid_input', (body as any)?.request_id, lang);
  }

  // 3) Normalización
  const { normalized, source, warnings, rpcPayload } = h_validate_normalize(parsed);

  // 4) Turnstile (skip si FORMS_DISABLE_TURNSTILE=true)
  if (process.env.FORMS_DISABLE_TURNSTILE !== 'true') {
    try {
      const token = normalized.turnstile_token as string;
      const ip = getClientIp(req) || undefined;
      const turn = await h_verify_turnstile(token, ip);
      if (!turn.ok) {
        console.log(
          JSON.stringify({
            ns: LOG_NAMESPACE,
            at: 'turnstile_fail',
            request_id: normalized.request_id,
            type: normalized.type,
            source,
            latency_ms_turnstile: turn.latencyMs,
          }),
        );
        return errorResponse('turnstile_invalid', normalized.request_id, lang);
      }
    } catch {
      return errorResponse('server_error', normalized.request_id, lang);
    }
  }

  // 5) Rate limit (skip si FORMS_DISABLE_RL=true)
  const ip = getClientIp(req);
  const ipHash = ip ? sha256Hex(ip) : sha256Hex('unknown');
  const emailHash = sha256Hex(normalized.email);

  if (process.env.FORMS_DISABLE_RL !== 'true') {
    try {
      const rl = await h_rate_limit_touch({
        ipHash,
        emailHash,
        type: normalized.type,
      });

      if (rl.limited) {
        console.log(
          JSON.stringify({
            ns: LOG_NAMESPACE,
            at: 'rate_limited',
            request_id: normalized.request_id,
            type: normalized.type,
            source,
            reason: rl.reason,
            ip_burst: rl.ipCountBurst,
            email_burst: rl.emailCountBurst,
            ip_sustained: rl.ipCountSustained,
            email_sustained: rl.emailCountSustained,
            latency_ms_rl: rl.latencyMs,
          }),
        );
        return errorResponse('rate_limited', normalized.request_id, lang);
      }
    } catch (e: any) {
      console.error(
        JSON.stringify({
          ns: LOG_NAMESPACE,
          at: 'rate_limit_error',
          request_id: normalized.request_id,
          type: normalized.type,
          source,
          err: String(e?.message || e),
        }),
      );
      return errorResponse('server_error', normalized.request_id, lang);
    }
  }

  // 6) Llamada RPC principal
  const ip_class = classifyIp(ip);
  rpcPayload.context = {
    ...(rpcPayload.context as any),
    ua: req.headers.get('user-agent') || undefined,
    lang,
  };
  rpcPayload.metadata = {
    ...(rpcPayload.metadata as any),
    ip_class,
    ip_hash: ipHash,
    request_ts: new Date().toISOString(),
    form_version: 'v1',
  };

  const orch = await h_call_orch_contact_write(rpcPayload);

  // 7) Respuestas RPC
  if (!orch.ok) {
    console.error(
      JSON.stringify({
        ns: LOG_NAMESPACE,
        at: 'rpc_error',
        request_id: normalized.request_id,
        type: normalized.type,
        source,
        code: orch.code,
        msg: orch.message,
        latency_ms_rpc: orch.latencyMs,
      }),
    );
    return errorResponse('server_error', normalized.request_id, lang);
  }

  // 8) Log 2xx
  const latency = Date.now() - t0;
  console.log(
    JSON.stringify({
      ns: LOG_NAMESPACE,
      at: 'submit_ok',
      request_id: normalized.request_id,
      type: normalized.type,
      source,
      status: orch.status,
      latency_ms_total: latency,
    }),
  );

  // 9) Respuesta estable
  return NextResponse.json(
    {
      submission_id: orch.submission_id,
      contact_id: orch.contact_id,
      message_id: orch.message_id,
      type: normalized.type,
      status: orch.status,
      warnings,
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
