// lib/rate_limit/h_rate_limit_touch.ts

/**
 * Rate limit vía RPC en Supabase para /api/forms/submit
 * - Sin estado en memoria. Consistencia entre instancias.
 * - Llama a `f_rate_limit_touch_v1(jsonb)` (o fallback `f_rate_limit_touch`).
 * - Lee umbrales desde ENV con fallback a constants.ts.
 */

import { RATE_LIMIT, LOG_NAMESPACE } from '../forms/constants';
import { getServiceClient } from '../supabase/server';

type RpcPayload = {
  scope: 'forms';
  type: string;
  ip_hash: string;
  email_hash?: string | null;
  burst: { window_minutes: number; thresholds: { ip: number; email: number } };
  sustained: { window_minutes: number; thresholds: { ip: number; email: number } };
};

export type RateLimitResult = {
  limited: boolean;
  reason: 'ip_burst' | 'email_burst' | 'ip_sustained' | 'email_sustained' | null;
  ipCountBurst: number;
  emailCountBurst: number | null;
  ipCountSustained: number;
  emailCountSustained: number | null;
  latencyMs: number;
};

// ===== Helpers de config (ENV → número con fallback) =====
function envInt(name: string, def: number): number {
  const raw = process.env[name];
  if (!raw) return def;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

function effectiveLimits() {
  // ENV en segundos, constants en minutos
  return {
    burst: {
      windowMinutes: envInt('RL_WINDOW_S', RATE_LIMIT.burst.windowMinutes * 60) / 60,
      perIp: envInt('RL_IP_BURST', RATE_LIMIT.burst.perIp),
      perEmail: envInt('RL_EMAIL_BURST', RATE_LIMIT.burst.perEmail),
    },
    sustained: {
      windowMinutes: envInt('RL_WINDOW_SUSTAINED_S', RATE_LIMIT.sustained.windowMinutes * 60) / 60,
      perIp: envInt('RL_IP_SUSTAINED', RATE_LIMIT.sustained.perIp),
      perEmail: envInt('RL_EMAIL_SUSTAINED', RATE_LIMIT.sustained.perEmail),
    },
  } as const;
}

function computeLimitedFallback(res: Partial<RateLimitResult>): RateLimitResult {
  const ipBurst = res.ipCountBurst ?? 0;
  const emBurst = res.emailCountBurst ?? 0;
  const ipSus = res.ipCountSustained ?? 0;
  const emSus = res.emailCountSustained ?? 0;

  const { burst, sustained } = effectiveLimits();

  let limited = false as boolean;
  let reason: RateLimitResult['reason'] = null;

  if (ipBurst > burst.perIp) {
    limited = true;
    reason = 'ip_burst';
  } else if (emBurst > burst.perEmail) {
    limited = true;
    reason = 'email_burst';
  } else if (ipSus > sustained.perIp) {
    limited = true;
    reason = 'ip_sustained';
  } else if (emSus > sustained.perEmail) {
    limited = true;
    reason = 'email_sustained';
  }

  return {
    limited,
    reason,
    ipCountBurst: ipBurst,
    emailCountBurst: emBurst,
    ipCountSustained: ipSus,
    emailCountSustained: emSus,
    latencyMs: res.latencyMs ?? 0,
  };
}

/**
 * Llama la RPC de rate limit y retorna conteos + decisión de bloqueo.
 * Lanza Error con .code='server_error' si la RPC falla.
 */
export async function h_rate_limit_touch(args: {
  ipHash: string;
  emailHash?: string;
  type: string;
}): Promise<RateLimitResult> {
  const supabase = getServiceClient(); // requiere SUPABASE_SERVICE_ROLE_KEY
  const limits = effectiveLimits();

  const payload: RpcPayload = {
    scope: 'forms',
    type: args.type,
    ip_hash: args.ipHash,
    email_hash: args.emailHash ?? null,
    burst: {
      window_minutes: limits.burst.windowMinutes,
      thresholds: { ip: limits.burst.perIp, email: limits.burst.perEmail },
    },
    sustained: {
      window_minutes: limits.sustained.windowMinutes,
      thresholds: { ip: limits.sustained.perIp, email: limits.sustained.perEmail },
    },
  };

  const start = Date.now();
  const fnCandidates = ['f_rate_limit_touch_v1', 'f_rate_limit_touch'] as const;

  let lastErr: unknown = null;

  for (const fn of fnCandidates) {
    try {
      const { data, error } = (await supabase.rpc(fn, { v_input: payload })) as {
        data: null | {
          limited?: boolean;
          reason?: RateLimitResult['reason'] | null;
          ip_burst?: number;
          email_burst?: number | null;
          ip_sustained?: number;
          email_sustained?: number | null;
        };
        error: null | { message: string };
      };

      const latencyMs = Date.now() - start;

      if (error) {
        lastErr = error;
        continue;
      }

      const base = {
        ipCountBurst: data?.ip_burst ?? 0,
        emailCountBurst: data?.email_burst ?? 0,
        ipCountSustained: data?.ip_sustained ?? 0,
        emailCountSustained: data?.email_sustained ?? 0,
        latencyMs,
      };

      if (typeof data?.limited === 'boolean') {
        return {
          limited: data.limited,
          reason: (data.reason ?? null) as RateLimitResult['reason'],
          ...base,
        };
      }

      return computeLimitedFallback(base);
    } catch (e) {
      lastErr = e;
      // intenta siguiente variante
    }
  }

  const err = new Error(`[${LOG_NAMESPACE}] rate-limit RPC failed`) as Error & { code: string; cause?: unknown };
  err.code = 'server_error';
  (err as any).cause = lastErr;
  throw err;
}
