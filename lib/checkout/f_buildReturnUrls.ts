// lib/checkout/f_buildReturnUrls.ts

export type BuildReturnUrlInput = {
  appUrl?: string;      // opcional, por defecto process.env.APP_URL
  successPath?: string; // opcional, por defecto '/gracias'
};

/**
 * f_buildReturnUrl
 * Construye la return_url para Stripe Embedded:
 *   {APP_URL}/{successPath}?session_id={CHECKOUT_SESSION_ID}
 * Lanza CONFIG_ERROR si no hay APP_URL.
 */
export function f_buildReturnUrl(input: BuildReturnUrlInput = {}): string {
  const appUrl = (input.appUrl ?? process.env.APP_URL ?? '').trim();
  if (!appUrl) {
    const err: any = new Error('Missing APP_URL');
    err.code = 'CONFIG_ERROR';
    throw err;
  }

  const base = stripTrailingSlash(appUrl);
  const path = normalizePath(input.successPath ?? '/gracias');

  // Placeholder requerido por Stripe Embedded
  const returnUrl = `${base}${path}?session_id={CHECKOUT_SESSION_ID}`;
  return returnUrl;
}

function stripTrailingSlash(u: string) {
  return u.endsWith('/') ? u.slice(0, -1) : u;
}

function normalizePath(p: string) {
  if (!p.startsWith('/')) return '/' + p;
  return p;
}
