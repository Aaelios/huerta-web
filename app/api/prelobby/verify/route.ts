// app/api/prelobby/verify/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadWebinars } from "@/lib/webinars/loadWebinars";

/**
 * POST /api/prelobby/verify
 * Body: { slug: string, email: string }
 * Resp: { ok: true, hasEntitlement: boolean, __debug? }
 *
 * Prioridad:
 * 0) Apertura por webinar (shared.openAccess === true).
 * 1) Dominio permitido (PRELOBBY_TEST_DOMAIN).
 * 2) Allowlist por email (PRELOBBY_EMAIL_ALLOWLIST).
 * 3) Apertura local (ALLOW_ALL_LOCAL && NODE_ENV!=='production').
 * 4) Supabase RPC (si hay SERVICE ROLE).
 * 5) Default: no acceso.
 */

export async function POST(req: Request) {
  const isProd = process.env.NODE_ENV === "production";
  const wantDebug = !isProd && (process.env.PRELOBBY_DEBUG || "true") === "true";

  try {
    const { slug, email } = (await req.json()) as { slug?: string; email?: string };

    const normSlug = (slug || "").trim();
    const normEmail = (email || "").trim().toLowerCase();

    if (!normSlug) return j({ ok: true, hasEntitlement: false }, 400, "slug requerido");
    if (!isEmail(normEmail)) return j({ ok: true, hasEntitlement: false }, 200, "email inválido");

    // 0) Obtener webinar y SKU
    const webinars = await loadWebinars();
    const webinar = webinars[normSlug];
    if (!webinar) return j({ ok: true, hasEntitlement: false }, 404, "webinar no encontrado");
    const sku = webinar.shared.sku;

    // 0) Apertura por webinar (workaround temporal controlado por config)
    if (webinar.shared.openAccess === true) {
      return j(
        withDebug({ ok: true, hasEntitlement: true }, wantDebug, {
          step: "open_access",
          slug: normSlug,
          sku,
          email: normEmail,
        }),
        200,
        "open_access"
      );
    }

    // 1) Dominio permitido (acepta "lobra.net", "@lobra.net" o subdominios)
    const testDomainRaw = (process.env.PRELOBBY_TEST_DOMAIN || "").toLowerCase().trim();
    const testDomain = normalizeDomain(testDomainRaw);
    const userDomain = emailDomain(normEmail);
    const domainOk =
      !!testDomain && (userDomain === testDomain || userDomain.endsWith(`.${testDomain}`));
    if (domainOk)
      return j(
        withDebug({ ok: true, hasEntitlement: true }, wantDebug, {
          step: "domain",
          slug: normSlug,
          sku,
          email: normEmail,
        }),
        200,
        "domain bypass"
      );

    // 2) Allowlist explícita (CSV)
    const allowListEnv = process.env.PRELOBBY_EMAIL_ALLOWLIST || "";
    const allowList = allowListEnv
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allowList.includes(normEmail))
      return j(
        withDebug({ ok: true, hasEntitlement: true }, wantDebug, {
          step: "allowlist",
          slug: normSlug,
          sku,
          email: normEmail,
        }),
        200,
        "allowlist"
      );

    // 3) Apertura local controlada
    const allowAllLocal =
      process.env.ALLOW_ALL_LOCAL === "true" && process.env.NODE_ENV !== "production";
    if (allowAllLocal)
      return j(
        withDebug({ ok: true, hasEntitlement: true }, wantDebug, {
          step: "local",
          slug: normSlug,
          sku,
          email: normEmail,
        }),
        200,
        "allow_all_local"
      );

    // 4) Supabase RPC (best-effort; nunca rompe el flujo)
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceKey) {
      try {
        const client = createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data, error } = await client.rpc("f_entitlement_has_email", {
          p_email: normEmail,
          p_sku: sku,
        });

        if (wantDebug) {
          // Log a consola para inspección en Vercel logs
          console.log("prelobby.verify rpc", {
            slug: normSlug,
            sku,
            email: normEmail,
            data,
            error,
          });
        }

        // La función retorna jsonb {"has": boolean}
        if (!error && data?.has === true) {
          return j(
            withDebug({ ok: true, hasEntitlement: true }, wantDebug, {
              step: "rpc",
              slug: normSlug,
              sku,
              email: normEmail,
              rpcData: data,
            }),
            200,
            "rpc ok"
          );
        }
        // si error o !data?.has, continua a default
      } catch (e) {
        if (wantDebug) {
          console.log("prelobby.verify rpc exception", {
            slug: normSlug,
            sku,
            email: normEmail,
            exception: String(e),
          });
        }
        // ignora y sigue a default
      }
    }

    // 5) Default
    return j(
      withDebug({ ok: true, hasEntitlement: false }, wantDebug, {
        step: "default",
        slug: normSlug,
        sku,
        email: normEmail,
      }),
      200,
      "no match"
    );
  } catch (e) {
    if (!isProd) console.log("prelobby.verify fatal", String(e));
    return j({ ok: true, hasEntitlement: false }, 500, "error interno");
  }
}

// ---- Utilidades

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function emailDomain(e: string) {
  const at = e.lastIndexOf("@");
  return at >= 0 ? e.slice(at + 1).toLowerCase() : "";
}

function normalizeDomain(d: string) {
  return d.startsWith("@") ? d.slice(1) : d;
}

function withDebug<T extends Record<string, unknown>>(
  payload: T,
  include: boolean,
  dbg: Record<string, unknown>
): T {
  if (!include) return payload;
  return { ...payload, __debug: dbg } as T;
}

function j(payload: unknown, status = 200, reason?: string) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  });
  if (reason) headers.set("X-Reason", reason);
  return new NextResponse(JSON.stringify(payload), { status, headers });
}
