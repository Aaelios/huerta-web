// app/api/prelobby/verify/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadWebinars } from "@/lib/webinars/loadWebinars";

/**
 * POST /api/prelobby/verify
 * Body: { slug: string, email: string }
 * Resp: { ok: true, hasEntitlement: boolean }
 *
 * Prioridad:
 * 1) Dominio permitido (PRELOBBY_TEST_DOMAIN).
 * 2) Allowlist por email (PRELOBBY_EMAIL_ALLOWLIST).
 * 3) Apertura local (ALLOW_ALL_LOCAL && NODE_ENV!=='production').
 * 4) Supabase RPC (si hay SERVICE ROLE).
 * 5) Default: no acceso.
 */

export async function POST(req: Request) {
  try {
    const { slug, email } = (await req.json()) as { slug?: string; email?: string };

    const normSlug = (slug || "").trim();
    const normEmail = (email || "").trim().toLowerCase();

    if (!normSlug) return j({ ok: true, hasEntitlement: false }, 400, "slug requerido");
    if (!isEmail(normEmail))
      return j({ ok: true, hasEntitlement: false }, 200, "email inválido");

    // 0) Obtener webinar y SKU
    const webinars = await loadWebinars();
    const webinar = webinars[normSlug];
    if (!webinar) return j({ ok: true, hasEntitlement: false }, 404, "webinar no encontrado");
    const sku = webinar.sku;

    // 1) Dominio permitido (acepta "lobra.net", "@lobra.net" o subdominios)
    const testDomainRaw = (process.env.PRELOBBY_TEST_DOMAIN || "").toLowerCase().trim();
    const testDomain = normalizeDomain(testDomainRaw);
    const userDomain = emailDomain(normEmail);
    const domainOk =
      !!testDomain && (userDomain === testDomain || userDomain.endsWith(`.${testDomain}`));
    if (domainOk) return j({ ok: true, hasEntitlement: true }, 200, "domain bypass");

    // 2) Allowlist explícita (CSV)
    const allowListEnv = process.env.PRELOBBY_EMAIL_ALLOWLIST || "";
    const allowList = allowListEnv
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allowList.includes(normEmail))
      return j({ ok: true, hasEntitlement: true }, 200, "allowlist");

    // 3) Apertura local controlada
    const allowAllLocal =
      process.env.ALLOW_ALL_LOCAL === "true" && process.env.NODE_ENV !== "production";
    if (allowAllLocal) return j({ ok: true, hasEntitlement: true }, 200, "allow_all_local");

    // 4) Supabase RPC (best-effort; nunca rompe el flujo)
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceKey) {
      try {
        const supabase = createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await supabase.rpc("f_entitlement_has_email", {
          v_email: normEmail,
          v_sku: sku,
        });
        if (!error && data === true) {
          return j({ ok: true, hasEntitlement: true }, 200, "rpc ok");
        }
        // si error o data!==true, continua a default
      } catch {
        // ignora y sigue a default
      }
    }

    // 5) Default
    return j({ ok: true, hasEntitlement: false }, 200, "no match");
  } catch {
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

function j(payload: unknown, status = 200, reason?: string) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  });
  if (reason) headers.set("X-Reason", reason);
  return new NextResponse(JSON.stringify(payload), { status, headers });
}
