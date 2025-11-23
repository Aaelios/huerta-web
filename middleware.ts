// middleware.ts
// Middleware global para LOBRÁ (lobra.net).
// - Bloquea probes comunes (WordPress, Joomla, Drupal, backups, archivos sensibles).
// - Aplica cabecera X-Robots-Tag según entorno y dominio:
//   * Solo indexable si es producción y host lobra.net / www.lobra.net.
//   * Incluso en producción, rutas sensibles llevan siempre: X-Robots-Tag: noindex,nofollow.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Rutas sensibles que deben ser siempre noindex,nofollow vía header,
 * incluso en producción:
 * - /checkout, /checkout/*
 * - /gracias
 * - /webinars/[slug]/prelobby
 * - /mi-cuenta
 * - /mis-compras
 */
function isSensitiveNoIndexPath(p: string): boolean {
  // Checkout (dinámico por slug de webinar/precio)
  if (/^\/checkout(\/|$)/.test(p)) return true;

  // Página de gracias
  if (/^\/gracias(\/|$)/.test(p)) return true;

  // Prelobby de webinars
  if (/^\/webinars\/[^/]+\/prelobby(\/|$)/.test(p)) return true;

  // Área privada (futuro): mi cuenta
  if (/^\/mi-cuenta(\/|$)/.test(p)) return true;

  // Área privada (futuro): mis compras
  if (/^\/mis-compras(\/|$)/.test(p)) return true;

  return false;
}

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname.toLowerCase();

  /* -------------------------------------------------------------------------- */
  /* 1) Bloqueo 404 para probes comunes                                        */
  /* -------------------------------------------------------------------------- */
  if (
    // WordPress
    /^\/wp(\/|$)/.test(p) ||
    /^\/wordpress(\/|$)/.test(p) ||
    /^\/wp-includes(\/|$)/.test(p) ||
    /^\/wp-content(\/|$)/.test(p) ||
    /^\/wp-admin(\/|$)/.test(p) ||
    /^\/wp-json(\/|$)/.test(p) ||
    p === "/xmlrpc.php" ||
    p === "/wp-login.php" ||

    // Joomla
    /^\/administrator(\/|$)/.test(p) ||
    /^\/media\/system(\/|$)/.test(p) ||
    /^\/templates(\/|$)/.test(p) ||

    // Drupal
    /^\/sites\/default(\/|$)/.test(p) ||
    p === "/user/login" ||
    /^\/misc\//.test(p) ||

    // Archivos sensibles
    /^\/\.env/.test(p) ||
    /^\/\.git/.test(p) ||
    /^\/\.svn/.test(p) ||
    /^\/\.hg/.test(p) ||
    p === "/.ds_store" ||
    p === "/phpinfo.php" ||
    /^\/vendor\/phpunit(\/|$)/.test(p) ||
    /^\/config(\.php)?$/.test(p) ||

    // Backups comunes
    /^\/[^/]+\.(zip|tar|gz|tgz|sql|bak|7z)$/.test(p) ||

    // CGI y status
    /^\/cgi-bin(\/|$)/.test(p) ||
    p === "/server-status"
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  /* -------------------------------------------------------------------------- */
  /* 2) Lógica de indexación por entorno y dominio                             */
  /* -------------------------------------------------------------------------- */
  const host = req.headers.get("host")?.toLowerCase() || "";
  const isProdEnv = process.env.VERCEL_ENV === "production";

  const isProdHost =
    host === "lobra.net" || host === "www.lobra.net";

  const isIndexable = isProdEnv && isProdHost;

  // Si NO es indexable, forzamos noindex/nofollow para todo
  if (!isIndexable) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex,nofollow");
    return res;
  }

  /* -------------------------------------------------------------------------- */
  /* 3) Producción real: solo endurecer rutas sensibles                         */
  /* -------------------------------------------------------------------------- */
  const res = NextResponse.next();

  if (isSensitiveNoIndexPath(p)) {
    res.headers.set("X-Robots-Tag", "noindex,nofollow");
  }

  return res;
}

/* -------------------------------------------------------------------------- */
/* Se ejecuta solo en rutas de páginas (excluye _next, assets, APIs, files)   */
/* -------------------------------------------------------------------------- */
export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
