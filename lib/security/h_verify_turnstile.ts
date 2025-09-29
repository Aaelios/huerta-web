// lib/security/h_verify_turnstile.ts

/**
 * Verificación server-side de Cloudflare Turnstile
 * - Envía el token recibido del cliente a la API oficial de Cloudflare.
 * - Usa TURNSTILE_SECRET_KEY desde env (solo en servidor).
 * - Devuelve { ok:boolean, latencyMs:number }.
 * - No filtra errores internos; siempre responde determinista.
 */

import { TURNSTILE_VERIFY_URL } from '../forms/constants';

function makeErr(code: 'turnstile_invalid' | 'server_error', msg: string) {
  const e = new Error(msg) as Error & { code: string };
  e.code = code;
  return e;
}

export async function h_verify_turnstile(token: string, ip?: string): Promise<{ ok: boolean; latencyMs: number }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw makeErr('server_error', 'TURNSTILE_SECRET_KEY not set');

  const start = Date.now();

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) return { ok: false, latencyMs };

    const data = (await res.json()) as { success?: boolean };
    return { ok: !!data.success, latencyMs };
  } catch {
    const latencyMs = Date.now() - start;
    return { ok: false, latencyMs };
  }
}
