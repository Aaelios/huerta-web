// lib/forms/h_parse_body.ts
/**
 * Parseo seguro del body para /api/forms/submit
 * - Usa Request.json() en runtime Node (Next.js App Router).
 * - Enforce 64KB poste-parse con JSON.stringify (suficiente para este endpoint).
 * - Acepta solo application/json.
 * - Devuelve { raw, json } o lanza errores con .code estandarizados.
 */

import { MAX_BODY_BYTES } from './constants';

function makeErr(code: 'payload_too_large' | 'invalid_input', msg: string) {
  const e = new Error(msg) as Error & { code: string };
  e.code = code;
  return e;
}

export async function h_parse_body(req: Request): Promise<{ raw: string; json: unknown }> {
  const ctype = req.headers.get('content-type') || '';
  if (!ctype.toLowerCase().includes('application/json')) {
    throw makeErr('invalid_input', 'Content-Type must be application/json');
  }

  let obj: unknown = {};
  try {
    // si no hay body, req.json() lanza; capturamos y tratamos como {}
    obj = await req.json();
  } catch {
    obj = {};
  }

  let raw = '';
  try {
    raw = JSON.stringify(obj ?? {});
  } catch {
    throw makeErr('invalid_input', 'Malformed JSON');
  }

  const byteLen = Buffer.byteLength(raw, 'utf8');
  if (byteLen > MAX_BODY_BYTES) {
    throw makeErr('payload_too_large', `Body exceeds ${MAX_BODY_BYTES} bytes`);
  }

  return { raw, json: obj };
}
