// app/api/forms/submit/route.ts

/**
 * POST /api/forms/submit
 * Flujo:
 * 1) Método + QA guard opcional
 * 2) Parseo seguro (límite bytes)
 * 3) Validación Zod
 * 4) Normalización + warnings
 * 5) Turnstile (bypass por env)
 * 6) Rate limit (bypass por env)
 * 7) RPC orquestadora (bypass por env)
 * 8) Respuesta 200 ok|duplicate o error mapeado
 * 9) Logs estructurados sin PII cruda
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
  SCHEMA_VERSION,
} from '../../../../lib/forms/constants';
import { sha256Hex } from '../../../../lib/security/h_hash';

// ----- Config runtime -----
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ===== Utils locales =====

function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const ip = xff.split(',')[0]?.trim();
    return ip || null;
  }
  const xReal = req.headers.get('x-real-ip');
  return xReal ? xReal.trim() : null;
}

function classifyIp(ip: string | null): 'ipv4' | 'ipv6' | 'private' | 'unknown' {
  if (!ip) return 'unknown';
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) return 'private';
  return ip.includes(':') ? 'ipv6' : 'ipv4';
}

type ErrCode =
  | 'invalid_input'
  | 'qa_forbidden'
  | 'turnstile_invalid'
  | 'rate_limited'
  | 'method_not_allowed'
  | 'payload_too_large'
  | 'server_error';

function mapZodIssues(zErr: any, lang: 'es' | 'en') {
  const msgsES: Record<string, string> = {
    too_small: 'Muy corto.',
    too_big: 'Muy largo.',
    invalid_type: 'Tipo inválido.',
    invalid_string: 'Formato inválido.',
    regex: 'Formato inválido.',
    custom: 'Valor inválido.',
  };
  const msgsEN: Record<string, string> = {
    too_small: 'Too short.',
    too_big: 'Too long.',
    invalid_type: 'Invalid type.',
    invalid_string: 'Invalid format.',
    regex: 'Invalid format.',
    custom: 'Invalid value.',
  };
  const dict = lang === 'en' ? msgsEN : msgsES;

  const issues = Array.isArray(zErr?.issues) ? zErr.issues : [];
  return issues.map((it: any) => {
    const path = Array.isArray(it?.path) ? it.path.join('.') : String(it?.path || '');
    const code = String(it?.code || 'custom');
    const message = String(it?.message || dict[code] || dict.custom);
    return { path, code, message };
  });
}

function buildServerTiming(parts: Array<[string, number | undefined]>) {
  const entries = parts
    .filter(([, dur]) => typeof dur === 'number' && isFinite(dur) && (dur as number) >= 0)
    .map(([k, dur]) => `${k};dur=${Math.round(dur as number)}`);
  return entries.join(', ');
}

function errorResponse(
  code: ErrCode,
  request_id?: string,
  lang: 'es' | 'en' = 'es',
  serverTiming?: string,
  extraBody?: Record<string, unknown>,
) {
  const http =
    code === 'invalid_input' ? 422 :
    code === 'qa_forbidden' ? 403 :
    code === 'turnstile_invalid' ? 403 :
    code === 'rate_limited' ? 429 :
    code === 'method_not_allowed' ? 405 :
    code === 'payload_too_large' ? 413 : 500;

  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  if (serverTiming && serverTiming.length) headers['Server-Timing'] = serverTiming;

  return NextResponse.json(
    { error_code: code, message: getErrorMessage(code, lang), request_id, ...(extraBody || {}) },
    { status: http, headers },
  );
}

// ===== Handler =====

export async function POST(req: Request) {
  const t0 = Date.now();
  let tParse: number | undefined;
  let tZod: number | undefined;
  let tTs: number | undefined;
  let tRl: number | undefined;
  let tRpc: number | undefined;

  const lang = (req.headers.get('accept-language') || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  if (req.method !== 'POST') {
    const st = buildServerTiming([['total', Date.now() - t0]]);
    return errorResponse('method_not_allowed', undefined, lang, st);
  }

  // QA guard opcional en prod
  const QA_GUARD = process.env.FORMS_QA_GUARD === 'true';
  if (QA_GUARD) {
    const token = req.headers.get('x-forms-qa-token') || '';
    if (!token || token !== (process.env.FORMS_QA_TOKEN || '')) {
      console.log(JSON.stringify({
        ns: LOG_NAMESPACE, at: 'qa_forbidden',
        schema_version: SCHEMA_VERSION,
      }));
      const st = buildServerTiming([['total', Date.now() - t0]]);
      return errorResponse('qa_forbidden', undefined, lang, st);
    }
  }

  try {
    // 1) Parseo seguro
    let raw = '';
    let body: any = {};
    try {
      const t1 = Date.now();
      const read = await h_parse_body(req);
      raw = read.raw;
      assertMaxBodyBytes(raw);
      body = read.json;
      tParse = Date.now() - t1;
    } catch (e: any) {
      const code = e?.code === 'payload_too_large' ? 'payload_too_large' : 'invalid_input';
      console.log(JSON.stringify({
        ns: LOG_NAMESPACE, event: 'parse_body_error', code,
        ctype: req.headers.get('content-type') || '', raw_len: raw.length || 0,
        schema_version: SCHEMA_VERSION,
      }));
      const st = buildServerTiming([['parse', tParse], ['total', Date.now() - t0]]);
      return errorResponse(code as ErrCode, body?.request_id, lang, st);
    }

    // 1.1) Honeypot explícito antes de Zod (log dedicado)
    if (typeof body?.company === 'string' && body.company.trim() !== '') {
      console.log(JSON.stringify({
        ns: LOG_NAMESPACE, event: 'honeypot_blocked',
        honeypot_filled: true, schema_version: SCHEMA_VERSION,
      }));
      const st = buildServerTiming([['parse', tParse], ['total', Date.now() - t0]]);
      return errorResponse(
        'invalid_input',
        body?.request_id,
        lang,
        st,
        { issues: [{ path: 'company', code: 'custom', message: lang === 'en' ? 'Must be empty.' : 'Debe estar vacío.' }] },
      );
    }

    // 2) Validación Zod
    let parsed: any;
    try {
      const t1 = Date.now();
      parsed = SubmitInputSchema.parse(body);
      tZod = Date.now() - t1;
    } catch (z: any) {
      const issues = mapZodIssues(z, lang);
      console.log(JSON.stringify({
        ns: LOG_NAMESPACE, event: 'zod_invalid_input',
        issues_count: Array.isArray(issues) ? issues.length : 0,
        schema_version: SCHEMA_VERSION,
      }));
      const st = buildServerTiming([['parse', tParse], ['zod', tZod], ['total', Date.now() - t0]]);
      return errorResponse('invalid_input', body?.request_id, lang, st, { issues });
    }

    // 3) Normalización
    const { normalized, source, warnings, rpcPayload } = h_validate_normalize(parsed);

    // 4) Turnstile (bypass opcional)
    const DISABLE_TS = process.env.FORMS_DISABLE_TURNSTILE === 'true';
    if (!DISABLE_TS) {
      const token = normalized.turnstile_token as string;
      const ipForTs = getClientIp(req) || undefined;
      try {
        const t1 = Date.now();
        const ver = await h_verify_turnstile(token, ipForTs);
        tTs = Date.now() - t1;
        if (!ver.ok) {
          console.log(JSON.stringify({
            ns: LOG_NAMESPACE, at: 'turnstile_fail',
            request_id: normalized.request_id, type: normalized.type, source,
            turnstile_invalid: true, latency_ms_turnstile: ver.latencyMs,
            warning_codes: warnings, schema_version: SCHEMA_VERSION,
          }));
          const st = buildServerTiming([['parse', tParse], ['zod', tZod], ['turnstile', tTs], ['total', Date.now() - t0]]);
          return errorResponse('turnstile_invalid', normalized.request_id, lang, st);
        }
      } catch {
        const st = buildServerTiming([['parse', tParse], ['zod', tZod], ['turnstile', tTs], ['total', Date.now() - t0]]);
        return errorResponse('server_error', normalized.request_id, lang, st);
      }
    }

    // 5) Rate limit (bypass opcional)
    const DISABLE_RL = process.env.FORMS_DISABLE_RL === 'true';
    const ip = getClientIp(req);
    const ipHash = ip ? sha256Hex(ip) : sha256Hex('unknown');
    const emailHash = sha256Hex(normalized.email);

    if (!DISABLE_RL) {
      try {
        const t1 = Date.now();
        const rl = await h_rate_limit_touch({ ipHash, emailHash, type: normalized.type });
        tRl = Date.now() - t1;
        if (rl.limited) {
          console.log(JSON.stringify({
            ns: LOG_NAMESPACE, at: 'rate_limited',
            request_id: normalized.request_id, type: normalized.type, source,
            reason: rl.reason,
            ip_burst: rl.ipCountBurst, email_burst: rl.emailCountBurst,
            ip_sustained: rl.ipCountSustained, email_sustained: rl.emailCountSustained,
            latency_ms_rl: rl.latencyMs, warning_codes: warnings,
            schema_version: SCHEMA_VERSION,
          }));
          const st = buildServerTiming([['parse', tParse], ['zod', tZod], ['turnstile', tTs], ['rl', tRl], ['total', Date.now() - t0]]);
          return errorResponse('rate_limited', normalized.request_id, lang, st);
        }
      } catch (e: any) {
        console.error(JSON.stringify({
          ns: LOG_NAMESPACE, at: 'rate_limit_error',
          request_id: normalized.request_id, type: normalized.type, source,
          err: String(e?.message || e), warning_codes: warnings,
          schema_version: SCHEMA_VERSION,
        }));
        const st = buildServerTiming([['parse', tParse], ['zod', tZod], ['turnstile', tTs], ['rl', tRl], ['total', Date.now() - t0]]);
        return errorResponse('server_error', normalized.request_id, lang, st);
      }
    }

    // 6) RPC principal (bypass opcional)
    const DISABLE_RPC = process.env.FORMS_DISABLE_RPC === 'true';
    let orchStatus: 'ok' | 'duplicate' = 'ok';
    let submission_id = normalized.request_id as string;
    let contact_id: string | undefined;
    let message_id: string | undefined;

    if (!DISABLE_RPC) {
      // Enriquecer contexto/metadata antes de la RPC
      const ip_class = classifyIp(ip);
      rpcPayload.context = {
        ...(rpcPayload.context as any),
        ua: req.headers.get('user-agent') || undefined,
        lang,
      };
      rpcPayload.metadata = {
        ...(rpcPayload.metadata as any),
        ip_class, ip_hash: ipHash,
        request_ts: new Date().toISOString(),
        form_version: SCHEMA_VERSION,
      };

      const t1 = Date.now();
      const orch = await h_call_orch_contact_write(rpcPayload);
      tRpc = Date.now() - t1;

      if (!orch.ok) {
        console.error(JSON.stringify({
          ns: LOG_NAMESPACE, at: 'rpc_error',
          request_id: normalized.request_id, type: normalized.type, source,
          code: orch.code, msg: orch.message, latency_ms_rpc: orch.latencyMs,
          warning_codes: warnings, schema_version: SCHEMA_VERSION,
        }));
        const st = buildServerTiming([['parse', tParse], ['zod', tZod], ['turnstile', tTs], ['rl', tRl], ['rpc', tRpc], ['total', Date.now() - t0]]);
        return errorResponse('server_error', normalized.request_id, lang, st);
      }

      orchStatus = orch.status;
      submission_id = orch.submission_id;
      contact_id = orch.contact_id;
      message_id = orch.message_id;
    }

    // 7) Log final y respuesta
    const latency = Date.now() - t0;
    console.log(JSON.stringify({
      ns: LOG_NAMESPACE, at: 'submit_ok',
      request_id: normalized.request_id, type: normalized.type, source,
      status: orchStatus, latency_ms_total: latency,
      warning_codes: warnings, schema_version: SCHEMA_VERSION,
    }));

    const serverTiming = buildServerTiming([
      ['parse', tParse],
      ['zod', tZod],
      ['turnstile', tTs],
      ['rl', tRl],
      ['rpc', tRpc],
      ['total', latency],
    ]);

    return NextResponse.json(
      {
        submission_id,
        contact_id: contact_id ?? null,
        message_id: message_id ?? null,
        type: normalized.type,
        status: orchStatus,
        warnings,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store', 'Server-Timing': serverTiming } },
    );
  } catch (e: any) {
    // Catch global para troubleshooting en prod
    console.error(JSON.stringify({
      ns: LOG_NAMESPACE, at: 'unhandled_exception',
      err: String(e?.message || e), schema_version: SCHEMA_VERSION,
    }));
    const st = buildServerTiming([['total', Date.now() - t0]]);
    return errorResponse('server_error', undefined, lang, st);
  }
}
