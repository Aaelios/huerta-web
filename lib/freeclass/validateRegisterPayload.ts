// lib/freeclass/validateRegisterPayload.ts
//
// Bloque 3.A — Validación + Turnstile para /api/freeclass/register.
// Módulo puro: parseo seguro, Zod, normalización, Turnstile y DTO interno.
// No toca Supabase ni orquestadoras; pensado para consumo directo por 3.B/3.C.

import { z } from 'zod';
import { h_parse_body } from '../forms/h_parse_body';
import { assertMaxBodyBytes } from '../forms/schemas';
import { h_verify_turnstile } from '../security/h_verify_turnstile';

// ===== Utilidades locales =====

function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0];
    return first ? first.trim() : null;
  }
  const xr = req.headers.get('x-real-ip');
  return xr ? xr.trim() : null;
}

function normalizeName(value: string | undefined | null): string | null {
  if (!value) return null;
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function cleanString(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseLang(req: Request): 'es' | 'en' {
  const raw = req.headers.get('accept-language') || 'es';
  return raw.toLowerCase().startsWith('en') ? 'en' : 'es';
}

// ===== Zod schema =====

const UTMShape = z
  .record(z.string(), z.unknown())
  .optional();

/**
 * Turnstile token:
 * - Si hay bypass: string vacío permitido.
 * - Si no hay bypass: longitud mínima razonable.
 */
function buildTurnstileSchema() {
  const disable =
    process.env.FREECLASS_DISABLE_TURNSTILE === 'true' ||
    process.env.FORMS_DISABLE_TURNSTILE === 'true';
  if (disable) {
    return z.string().max(0);
  }
  return z.string().min(10);
}

const BodySchema = z.object({
  email: z.string().min(3).max(254).email(),
  full_name: z.string().min(1).max(200).optional(),
  sku: z.string().min(1).max(200),
  instanceSlug: z.string().min(1).max(200).optional(),
  consent: z.boolean(),
  utm: UTMShape,
  turnstile_token: buildTurnstileSchema(),
});

// ===== Tipos públicos =====

export type FreeClassValidatedInput = {
  requestId: string;
  email: string;
  fullName: string | null;
  sku: string;
  instanceSlug: string | null;
  consent: boolean;
  utm: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
    content?: string | null;
    term?: string | null;
    raw?: Record<string, unknown>;
  } | null;
  client: {
    ip: string | null;
    userAgent: string | null;
    lang: 'es' | 'en';
  };
  turnstile: {
    token: string;
    verified: true;
  };
};

export type FreeClassValidationError =
  | {
      kind: 'invalid_input';
      httpStatus: 422;
      requestId?: string;
      issues: Array<{ path: string; code: string; message: string }>;
    }
  | {
      kind: 'payload_too_large';
      httpStatus: 413;
      requestId?: string;
    }
  | {
      kind: 'turnstile_invalid';
      httpStatus: 403;
      requestId?: string;
    };

// ===== Mapeo Zod → issues estándar =====

type ZodIssueLike = {
  path?: unknown;
  code?: unknown;
  message?: unknown;
};

function mapZodIssues(zErr: unknown): Array<{ path: string; code: string; message: string }> {
  const maybe = zErr as { issues?: ZodIssueLike[] };
  const issues = Array.isArray(maybe.issues) ? maybe.issues : [];
  return issues.map((it) => {
    const path =
      Array.isArray(it.path) ? it.path.join('.') : String(it.path ?? '');
    const code = String(it.code ?? 'custom');
    const message = String(it.message ?? 'Invalid');
    return { path, code, message };
  });
}

// ===== Función principal =====

export async function validateRegisterPayload(
  req: Request,
): Promise<
  | { ok: true; data: FreeClassValidatedInput; timings: { parse?: number; zod?: number; ts?: number } }
  | { ok: false; error: FreeClassValidationError; timings?: { parse?: number; zod?: number; ts?: number } }
> {
  let tParse: number | undefined;
  let tZod: number | undefined;
  let tTs: number | undefined;

  const lang = parseLang(req);

  // 1) Parseo seguro
  let json: unknown = {};
  try {
    const t1 = Date.now();
    const read = await h_parse_body(req);
    json = read.json;
    assertMaxBodyBytes(read.raw);
    tParse = Date.now() - t1;
  } catch (err: unknown) {
    const errorObj = err as { code?: unknown };
    const code =
      errorObj.code === 'payload_too_large' ? 'payload_too_large' : 'invalid_input';

    if (code === 'payload_too_large') {
      return {
        ok: false,
        error: {
          kind: 'payload_too_large',
          httpStatus: 413,
        },
        timings: { parse: tParse },
      };
    }

    return {
      ok: false,
      error: {
        kind: 'invalid_input',
        httpStatus: 422,
        issues: [],
      },
      timings: { parse: tParse },
    };
  }

  // 2) Validación Zod
  let parsed: z.infer<typeof BodySchema>;
  try {
    const t1 = Date.now();
    parsed = BodySchema.parse(json);
    tZod = Date.now() - t1;
  } catch (zErr: unknown) {
    return {
      ok: false,
      error: {
        kind: 'invalid_input',
        httpStatus: 422,
        issues: mapZodIssues(zErr),
      },
      timings: { parse: tParse, zod: tZod },
    };
  }

  // 3) Normalización
  const email = normalizeEmail(parsed.email);
  const fullName = normalizeName(parsed.full_name ?? null);
  const sku = parsed.sku.trim();
  const instanceSlug = cleanString(parsed.instanceSlug ?? null);
  const consent = parsed.consent;

  const utmRaw = parsed.utm ?? null;
  const utm =
    utmRaw === null
      ? null
      : {
          source:
            typeof utmRaw.utm_source === 'string'
              ? utmRaw.utm_source.trim() || null
              : null,
          medium:
            typeof utmRaw.utm_medium === 'string'
              ? utmRaw.utm_medium.trim() || null
              : null,
          campaign:
            typeof utmRaw.utm_campaign === 'string'
              ? utmRaw.utm_campaign.trim() || null
              : null,
          content:
            typeof utmRaw.utm_content === 'string'
              ? utmRaw.utm_content.trim() || null
              : null,
          term:
            typeof utmRaw.utm_term === 'string'
              ? utmRaw.utm_term.trim() || null
              : null,
          raw: utmRaw as Record<string, unknown>,
        };

  const token = parsed.turnstile_token;

  // 4) Turnstile (con bypass por env)
  const disableTurnstile =
    process.env.FREECLASS_DISABLE_TURNSTILE === 'true' ||
    process.env.FORMS_DISABLE_TURNSTILE === 'true';

  if (!disableTurnstile) {
    try {
      const t1 = Date.now();
      const ipForTs = getClientIp(req) || undefined;
      const ver = await h_verify_turnstile(token, ipForTs);
      tTs = Date.now() - t1;

      if (!ver.ok) {
        return {
          ok: false,
          error: {
            kind: 'turnstile_invalid',
            httpStatus: 403,
          },
          timings: { parse: tParse, zod: tZod, ts: tTs },
        };
      }
    } catch {
      // Desde la capa 3.A, se mapea como fallo de Turnstile genérico.
      return {
        ok: false,
        error: {
          kind: 'turnstile_invalid',
          httpStatus: 403,
        },
        timings: { parse: tParse, zod: tZod },
      };
    }
  }

  // 5) DTO interno para 3.B
  const requestId = crypto.randomUUID();
  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent');

  const data: FreeClassValidatedInput = {
    requestId,
    email,
    fullName,
    sku,
    instanceSlug,
    consent,
    utm,
    client: {
      ip,
      userAgent: ua,
      lang,
    },
    turnstile: {
      token,
      verified: true,
    },
  };

  return {
    ok: true,
    data,
    timings: {
      parse: tParse,
      zod: tZod,
      ts: tTs,
    },
  };
}
