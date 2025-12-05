// app/api/freeclass/register/route.ts
// Bloque 3.C v2 — HTTP handler para POST /api/freeclass/register.
// Conecta 3.A (validateRegisterPayload), 3.B v2 (handleRegistration),
// 2.A (createFreeClassLead) y 2.B (syncFreeClassLeadWithBrevo) con NextResponse:
// - Valida y normaliza el payload
// - Resuelve estado de registro (instancias, page, leadTracking)
// - Si es registrable: escribe contacto vía Supabase v2 y sincroniza marketing con Brevo
// - No rompe UX si falla Brevo (200 igualmente cuando el registro es válido)
// - Mapea errores a HTTP + JSON homogéneo
// - Expone DTO final para el frontend + Server-Timing

import { NextResponse } from 'next/server';
import type { FreeClassValidationError } from '../../../../lib/freeclass/validateRegisterPayload';
import {
  validateRegisterPayload,
} from '../../../../lib/freeclass/validateRegisterPayload';
import type {
  RegistrationOrchestrationResult,
  FreeClassRegistrationInput,
} from '../../../../lib/freeclass/handleRegistration';
import { handleRegistration } from '../../../../lib/freeclass/handleRegistration';
import {
  createFreeClassLead,
  type CreateFreeClassLeadInput,
} from '../../../../lib/freeclass/createFreeClassLead';
import { syncFreeClassLeadWithBrevo } from '../../../../lib/brevo/syncFreeClassLead';

// Config runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ===== Tipos públicos (para frontend/tests) =====

export type FreeClassRegisterResponse = {
  registration_state:
    | 'open'
    | 'full'
    | 'ended'
    | 'canceled'
    | 'upcoming'
    | 'no_instance'
    | 'closed'
    | null;
  result: 'registered' | 'waitlist' | 'rejected_closed' | null;
  ui_state: 'open' | 'waitlist' | 'closed' | null;
  leadTracking:
    | {
        class_sku: string;
        instance_slug: string | null;
        utm: Record<string, unknown> | null;
      }
    | null;
  nextStepUrl: string | null;
};

export type FreeClassErrorIssue = {
  path: string;
  code: string;
  message: string;
};

type ErrCode =
  | 'invalid_input'
  | 'payload_too_large'
  | 'turnstile_invalid'
  | 'method_not_allowed'
  | 'server_error';

// ===== Utils locales =====

function parseLang(req: Request): 'es' | 'en' {
  const raw = req.headers.get('accept-language') || 'es';
  return raw.toLowerCase().startsWith('en') ? 'en' : 'es';
}

function buildServerTiming(parts: Array<[string, number | undefined]>): string {
  const entries = parts
    .filter(([, dur]) => typeof dur === 'number' && Number.isFinite(dur as number))
    .map(([key, dur]) => `${key};dur=${Math.round(dur as number)}`);
  return entries.join(', ');
}

function mapErrCodeToStatus(code: ErrCode): number {
  switch (code) {
    case 'invalid_input':
      return 422;
    case 'payload_too_large':
      return 413;
    case 'turnstile_invalid':
      return 403;
    case 'method_not_allowed':
      return 405;
    case 'server_error':
    default:
      return 500;
  }
}

function getErrorMessage(code: ErrCode, lang: 'es' | 'en'): string {
  const msgsEs: Record<ErrCode, string> = {
    invalid_input: 'Los datos enviados no son válidos.',
    payload_too_large: 'El cuerpo de la solicitud es demasiado grande.',
    turnstile_invalid: 'No se pudo verificar que eres una persona real.',
    method_not_allowed: 'Método HTTP no permitido.',
    server_error: 'Ocurrió un error en el servidor. Intenta más tarde.',
  };

  const msgsEn: Record<ErrCode, string> = {
    invalid_input: 'Submitted data is not valid.',
    payload_too_large: 'Request body is too large.',
    turnstile_invalid: 'We could not verify you are a real person.',
    method_not_allowed: 'HTTP method not allowed.',
    server_error: 'A server error occurred. Please try again later.',
  };

  return lang === 'en' ? msgsEn[code] : msgsEs[code];
}

function errorResponse(
  code: ErrCode,
  lang: 'es' | 'en',
  options?: {
    requestId?: string | null;
    issues?: FreeClassErrorIssue[];
    serverTiming?: string;
  },
): NextResponse {
  const status = mapErrCodeToStatus(code);
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
  };
  if (options?.serverTiming && options.serverTiming.length > 0) {
    headers['Server-Timing'] = options.serverTiming;
  }

  const body: {
    error_code: ErrCode;
    message: string;
    request_id: string | null;
    issues?: FreeClassErrorIssue[];
  } = {
    error_code: code,
    message: getErrorMessage(code, lang),
    request_id: options?.requestId ?? null,
  };

  if (options?.issues && options.issues.length > 0 && code === 'invalid_input') {
    body.issues = options.issues;
  }

  return NextResponse.json(body, { status, headers });
}

function logValidationError(
  error: FreeClassValidationError,
  timings?: { parse?: number; zod?: number; ts?: number },
): void {
  const base = {
    ns: 'freeclass_register',
    at: 'validation_error',
    http_status: error.httpStatus,
    kind: error.kind,
  };

  const payload: Record<string, unknown> = {
    ...base,
    timings: {
      parse: timings?.parse,
      zod: timings?.zod,
      ts: timings?.ts,
    },
  };

  if (error.kind === 'invalid_input') {
    payload.issues_count = error.issues.length;
  }

  console.log(JSON.stringify(payload));
}

function logTurnstileFail(
  timings?: { parse?: number; zod?: number; ts?: number },
): void {
  console.log(
    JSON.stringify({
      ns: 'freeclass_register',
      at: 'turnstile_fail',
      timings: {
        parse: timings?.parse,
        zod: timings?.zod,
        ts: timings?.ts,
      },
    }),
  );
}

function logOrchestrationOk(
  out: RegistrationOrchestrationResult,
  totalMs: number,
  meta?: {
    contactId?: string | null;
    brevoOk?: boolean;
    brevoErrorCode?: string | null;
  },
): void {
  console.log(
    JSON.stringify({
      ns: 'freeclass_register',
      at: 'orchestration_ok',
      contact_id: meta?.contactId ?? null,
      sku: out.sku,
      instance_slug: out.instanceSlug,
      registration_state: out.registrationState,
      result: out.result,
      ui_state: out.ui_state,
      brevo_ok: typeof meta?.brevoOk === 'boolean' ? meta.brevoOk : null,
      brevo_error_code: meta?.brevoErrorCode ?? null,
      timings: out.timings,
      latency_ms_total: totalMs,
    }),
  );
}

function logOrchestrationError(err: unknown, totalMs: number): void {
  console.error(
    JSON.stringify({
      ns: 'freeclass_register',
      at: 'orchestration_error',
      err: String(
        (err as { message?: string }).message ?? err,
      ),
      latency_ms_total: totalMs,
    }),
  );
}

function logUnhandledException(err: unknown, totalMs: number): void {
  console.error(
    JSON.stringify({
      ns: 'freeclass_register',
      at: 'unhandled_exception',
      err: String(
        (err as { message?: string }).message ?? err,
      ),
      latency_ms_total: totalMs,
    }),
  );
}

function logContactWriteError(
  code: string,
  message: string,
  totalMs: number,
): void {
  console.error(
    JSON.stringify({
      ns: 'freeclass_register',
      at: 'contact_write_error',
      error_code: code,
      error_message: message,
      latency_ms_total: totalMs,
    }),
  );
}

function logBrevoSyncError(err: unknown, totalMs: number): void {
  console.error(
    JSON.stringify({
      ns: 'freeclass_register',
      at: 'brevo_sync_error',
      err: String(
        (err as { message?: string }).message ?? err,
      ),
      latency_ms_total: totalMs,
    }),
  );
}

// ===== Handler principal =====

export async function POST(req: Request): Promise<NextResponse> {
  const t0 = Date.now();
  const lang = parseLang(req);

  // Aunque Next ya mapea por método, se mantiene guard explícito.
  if (req.method !== 'POST') {
    const serverTiming = buildServerTiming([['total', Date.now() - t0]]);
    return errorResponse('method_not_allowed', lang, {
      requestId: null,
      serverTiming,
    });
  }

  try {
    // 1) Validación + Turnstile (3.A)
    const v = await validateRegisterPayload(req);

    if (!v.ok) {
      const err = v.error;
      const timings = v.timings;

      if (err.kind === 'turnstile_invalid') {
        logTurnstileFail(timings);
      } else {
        logValidationError(err, timings);
      }

      const code: ErrCode =
        err.kind === 'invalid_input'
          ? 'invalid_input'
          : err.kind === 'payload_too_large'
          ? 'payload_too_large'
          : 'turnstile_invalid';

      const serverTiming = buildServerTiming([
        ['parse', timings?.parse],
        ['zod', timings?.zod],
        ['turnstile', timings?.ts],
        ['total', Date.now() - t0],
      ]);

      return errorResponse(code, lang, {
        requestId: err.requestId ?? null,
        issues: err.kind === 'invalid_input' ? err.issues : undefined,
        serverTiming,
      });
    }

    const input: FreeClassRegistrationInput = {
      ...v.data,
      timings: v.timings,
    };

    // 2) Orquestación de registro (3.B v2)
    let out: RegistrationOrchestrationResult;
    try {
      out = await handleRegistration(input);
    } catch (err) {
      const totalMs = Date.now() - t0;
      logOrchestrationError(err, totalMs);
      const serverTiming = buildServerTiming([
        ['parse', v.timings?.parse],
        ['zod', v.timings?.zod],
        ['turnstile', v.timings?.ts],
        ['total', totalMs],
      ]);
      return errorResponse('server_error', lang, {
        requestId: v.data.requestId,
        serverTiming,
      });
    }

    const totalMs = Date.now() - t0;

    // Determinar si es registrable según resultado de dominio.
    const isRegistrable =
      out.result === 'registered' || out.result === 'waitlist';

    // 3) Si NO es registrable, respondemos UX sin Supabase v2 ni Brevo.
    if (!isRegistrable) {
      const serverTiming = buildServerTiming([
        ['parse', out.timings.parse],
        ['zod', out.timings.zod],
        ['turnstile', out.timings.ts],
        ['load_page', out.timings.load_page],
        ['load_instances', out.timings.load_instances],
        ['total', totalMs],
      ]);

      logOrchestrationOk(out, totalMs);

      const body: FreeClassRegisterResponse = {
        registration_state: out.registrationState,
        result: out.result,
        ui_state: out.ui_state,
        leadTracking: out.leadTracking,
        nextStepUrl: null,
      };

      return NextResponse.json(body, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'Server-Timing': serverTiming,
        },
      });
    }

    // 4) Si ES registrable, encadenamos Supabase v2 + Brevo.

    // 4.1 Supabase v2: contacto + free_class vía f_orch_contact_write_v2
    const leadInput: CreateFreeClassLeadInput = {
      email: v.data.email,
      fullName: v.data.fullName,
      sku: out.sku,
      instanceSlug: out.instanceSlug,
      consent: v.data.consent,
    };

    const tContact = Date.now();
    const contactRes = await createFreeClassLead(leadInput);
    const contactWriteMs = Date.now() - tContact;

    if (!contactRes.ok) {
      const totalMsWithError = Date.now() - t0;
      logContactWriteError(contactRes.code, contactRes.message, totalMsWithError);

      const serverTiming = buildServerTiming([
        ['parse', out.timings.parse],
        ['zod', out.timings.zod],
        ['turnstile', out.timings.ts],
        ['load_page', out.timings.load_page],
        ['load_instances', out.timings.load_instances],
        ['contact_write', contactWriteMs],
        ['total', totalMsWithError],
      ]);

      return errorResponse('server_error', lang, {
        requestId: v.data.requestId,
        serverTiming,
      });
    }

    // 4.2 Brevo + RPC marketing: no rompe UX si falla
    let brevoOk = false;
    let brevoErrorCode: string | null = null;
    let brevoMs: number | undefined;

    const brevoInput = {
      contactId: contactRes.contactId,
      currentBrevoContactId: contactRes.brevoContactId,
      email: v.data.email,
      fullName: v.data.fullName,
      sku: out.sku,
      instanceSlug: out.instanceSlug,
      cohortListId: out.brevoCohortListId, // ← nuevo
    };

    try {
      const tBrevo = Date.now();
      const brevoRes = await syncFreeClassLeadWithBrevo(brevoInput);
      brevoMs = Date.now() - tBrevo;
      brevoOk = brevoRes.ok;
      brevoErrorCode = brevoRes.errorCode;
    } catch (err) {
      const totalMsWithError = Date.now() - t0;
      logBrevoSyncError(err, totalMsWithError);
      brevoOk = false;
      brevoErrorCode = 'marketing_sync_failed';
    }

    const serverTiming = buildServerTiming([
      ['parse', out.timings.parse],
      ['zod', out.timings.zod],
      ['turnstile', out.timings.ts],
      ['load_page', out.timings.load_page],
      ['load_instances', out.timings.load_instances],
      ['contact_write', contactWriteMs],
      ['brevo_sync', brevoMs],
      ['total', Date.now() - t0],
    ]);

    logOrchestrationOk(out, Date.now() - t0, {
      contactId: contactRes.contactId,
      brevoOk,
      brevoErrorCode,
    });

    const body: FreeClassRegisterResponse = {
      registration_state: out.registrationState,
      result: out.result,
      ui_state: out.ui_state,
      leadTracking: out.leadTracking,
      nextStepUrl: null,
    };

    return NextResponse.json(body, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Server-Timing': serverTiming,
      },
    });
  } catch (err) {
    const totalMs = Date.now() - t0;
    logUnhandledException(err, totalMs);
    const serverTiming = buildServerTiming([['total', totalMs]]);
    return errorResponse('server_error', lang, {
      requestId: null,
      serverTiming,
    });
  }
}
