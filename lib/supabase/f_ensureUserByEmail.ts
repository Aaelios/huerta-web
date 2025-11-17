// lib/supabase/f_ensureUserByEmail.ts
// Versión v2 — core + wrapper (lanza error con {kind,reason})

import { m_getSupabaseService } from "./m_getSupabaseService";

//
// Tipos internos
//
type EnsureUserResult =
  | {
      kind: "success";
      userId: string;
      wasCreated: boolean;
    }
  | {
      kind: "transient_error";
      reason: string;
      details?: any;
      retryable: true;
    }
  | {
      kind: "fatal_error";
      reason: string;
      details?: any;
      retryable: false;
    };

function normalizeAndValidateEmail(email: string): string {
  const v = (email || "").trim().toLowerCase();
  if (!v) {
    return ""; // se evalúa en core
  }
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  return ok ? v : "__invalid__";
}

//
// CORE v2
//
async function f_ensureUserByEmail_core(
  email: string
): Promise<EnsureUserResult> {
  const pEmail = normalizeAndValidateEmail(email);

  if (!pEmail) {
    return {
      kind: "fatal_error",
      reason: "EMAIL_REQUIRED",
      retryable: false,
    };
  }

  if (pEmail === "__invalid__") {
    return {
      kind: "fatal_error",
      reason: "EMAIL_INVALID",
      retryable: false,
    };
  }

  const supabase = m_getSupabaseService();

  //
  // 1) lookup rápido
  //
  try {
    const { data: maybeUserId } = await supabase.rpc("f_auth_get_user", {
      p_email: pEmail,
    });
    if (maybeUserId) {
      return {
        kind: "success",
        userId: String(maybeUserId),
        wasCreated: false,
      };
    }
  } catch (e: any) {
    return {
      kind: "transient_error",
      reason: "auth_get_user_failed",
      details: e,
      retryable: true,
    };
  }

  //
  // 2) crear con retries 5xx, manejar 422, 4xx, etc.
  //
  const maxAttempts = 3;
  const backoff = [100, 300, 1000];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data: created, error: createErr } =
      await supabase.auth.admin.createUser({
        email: pEmail,
        email_confirm: true,
        user_metadata: { source: "stripe_webhook" },
      });

    // 2.a éxito directo
    if (!createErr && created?.user?.id) {
      return {
        kind: "success",
        userId: created.user.id,
        wasCreated: true,
      };
    }

    const err = createErr as any;
    const status = err?.status ?? err?.response?.status ?? null;
    const msg = String(
      err?.message || err?.error_description || ""
    ).toLowerCase();

    const isAlreadyExists =
      status === 422 || msg.includes("already") || msg.includes("exists");

    // 2.b Si es "ya existe"
    if (isAlreadyExists) {
      try {
        // re-check
        const { data: maybe } = await supabase.rpc("f_auth_get_user", {
          p_email: pEmail,
        });
        if (maybe) {
          return {
            kind: "success",
            userId: String(maybe),
            wasCreated: false,
          };
        }
      } catch {}

      // listar
      const { data: listed, error: listErr } =
        await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) {
        return {
          kind: "transient_error",
          reason: "auth_list_users_failed_after_422",
          details: listErr,
          retryable: true,
        };
      }
      const found =
        listed?.users?.find(
          (u) => (u.email || "").toLowerCase() === pEmail
        ) || null;
      if (found?.id) {
        return {
          kind: "success",
          userId: found.id,
          wasCreated: false,
        };
      }

      return {
        kind: "transient_error",
        reason: "auth_422_but_user_not_found",
        retryable: true,
      };
    }

    // 2.c Errores 4xx (no-422) → fatal
    if (status && status >= 400 && status < 500) {
      return {
        kind: "fatal_error",
        reason: "auth_4xx_non_422",
        details: err,
        retryable: false,
      };
    }

    // 2.d Errores 5xx → retry
    if (status && status >= 500) {
      // antes de retry, re-check usuario
      try {
        const { data: maybe } = await supabase.rpc("f_auth_get_user", {
          p_email: pEmail,
        });
        if (maybe) {
          return {
            kind: "success",
            userId: String(maybe),
            wasCreated: false,
          };
        }
      } catch {}

      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, backoff[attempt - 1]));
        continue;
      }

      return {
        kind: "transient_error",
        reason: "auth_5xx_all_attempts_failed",
        details: err,
        retryable: true,
      };
    }

    // 2.e error desconocido
    return {
      kind: "transient_error",
      reason: "auth_unknown_error",
      details: err,
      retryable: true,
    };
  }

  // no debería llegar aquí
  return {
    kind: "transient_error",
    reason: "unreachable_state",
    retryable: true,
  };
}

//
// WRAPPER legacy (mantiene firma actual)
// Lanza Error con {kind,reason} para que TS superior lo capture.
// 
export default async function f_ensureUserByEmail(
  email: string
): Promise<{ userId: string }> {
  const result = await f_ensureUserByEmail_core(email);

  if (result.kind === "success") {
    return { userId: result.userId };
  }

  // lanza excepción con shape controlado
  const err: any = new Error(result.reason || "ensureUser_failed");
  err.kind = result.kind;
  err.reason = result.reason;
  err.details = result.details;
  err.retryable = result.retryable;
  throw err;
}