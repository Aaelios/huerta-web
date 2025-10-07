// lib/emails/renderers/_base.ts
// Base de render de correos HTML simples y consistentes.
// Expone utilidades para sujetos, URLs absolutas y layout estándar.

export type EmailContext = {
  appUrl: string;             // Ej. https://lobra.net  | http://localhost:3000
  supportEmail: string;       // Ej. soporte@lobra.net
  from?: string;              // Ej. 'LOBRÁ <no-reply@mail.lobra.net>'
  subjectPrefix?: string|null; // Ej. '[Test]' en preview; vacío en prod
};

export type Cta = { label: string; href: string|null };

export type BaseLayoutInput = {
  subject: string;
  title: string;
  intro?: string;
  cta?: Cta|null;
  ctas?: Cta[];               // Si viene, se ignora `cta`
  footerNote?: string;
  ctx: EmailContext;
};

/** Escapa HTML básico para evitar inyección en texto. */
export function escapeHtml(s: string = ''): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Prefijo opcional de asunto vía env (p. ej. preview). */
export function buildSubject(base: string, ctx: EmailContext): string {
  const p = (ctx.subjectPrefix || '').trim();
  return p ? `${p} ${base}` : base;
}

/** Convierte una URL relativa en absoluta con base en appUrl. */
export function absUrl(href: string, ctx: EmailContext): string {
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  const base = (ctx.appUrl || '').replace(/\/+$/, '');
  const rel = href.startsWith('/') ? href : `/${href}`;
  return `${base}${rel}`;
}

/** Renderiza un botón HTML compatible con clientes de correo. */
function renderButton(label: string, url: string): string {
  const lab = escapeHtml(label);
  const href = escapeHtml(url);
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0">
      <tr>
        <td bgcolor="#000000" style="border-radius:8px;">
          <a href="${href}" style="display:inline-block;padding:12px 18px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;line-height:1.2;color:#ffffff;text-decoration:none;">${lab}</a>
        </td>
      </tr>
    </table>
  `;
}

/** Renderiza lista de CTAs vertical. Si href=null, muestra “Próximamente”. */
function renderCtas(ctas: Cta[], ctx: EmailContext): string {
  const rows = ctas.map((c) => {
    const label = escapeHtml(c.label || 'Ver');
    if (!c.href) {
      return `
        <tr>
          <td style="padding:8px 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:#111">Próximamente</td>
          <td style="padding:8px 0;text-align:right">${renderBadge('Pronto')}</td>
        </tr>
      `;
    }
    const url = absUrl(c.href, ctx);
    return `
      <tr>
        <td style="padding:8px 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:#111">${label}</td>
        <td style="padding:8px 0;text-align:right">${renderButton('Abrir', url)}</td>
      </tr>
    `;
  });
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0">
      ${rows.join('')}
    </table>
  `;
}

function renderBadge(text: string): string {
  const t = escapeHtml(text);
  return `
    <span style="display:inline-block;padding:6px 10px;border:1px solid #999;border-radius:999px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:#555">${t}</span>
  `;
}

/** Layout base. Devuelve { subject, html }. */
export function renderBase(input: BaseLayoutInput): { subject: string; html: string; from?: string } {
  const { ctx } = input;
  const subject = buildSubject(input.subject, ctx);
  const support = escapeHtml(ctx.supportEmail || 'soporte@lobra.net');

  // Header
  const header = `
    <tr>
      <td style="padding:24px 0;text-align:center;">
        <span style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-weight:700;font-size:18px;letter-spacing:0.5px;color:#000">LOBRÁ</span>
      </td>
    </tr>
  `;

  // Title + intro
  const title = escapeHtml(input.title);
  const intro = input.intro ? `<p style="margin:8px 0 0 0;font-size:15px;color:#333;line-height:1.5">${escapeHtml(input.intro)}</p>` : '';

  // CTA(s)
  let ctasBlock = '';
  if (input.ctas && input.ctas.length) {
    ctasBlock = renderCtas(input.ctas, ctx);
  } else if (input.cta && input.cta.href) {
    ctasBlock = renderButton(input.cta.label, absUrl(input.cta.href, ctx));
  } else if (input.cta && input.cta.href === null) {
    ctasBlock = renderBadge('Próximamente');
  }

  // Footer
  const note = input.footerNote ? `<p style="margin:0;font-size:12px;color:#666">${escapeHtml(input.footerNote)}</p>` : '';
  const footer = `
    <tr>
      <td style="padding:24px 0 0 0">
        <p style="margin:0 0 4px 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:#666">¿Necesitas ayuda? escribe a <a href="mailto:${support}" style="color:#111;text-decoration:none">${support}</a></p>
        ${note}
        <p style="margin:12px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:11px;color:#888">Recibiste este correo por una compra en LOBRÁ.</p>
      </td>
    </tr>
  `;

  const html = `
<!doctype html>
<html lang="es">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f6f6f6;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f6f6;padding:24px 0">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;padding:0 24px 24px 24px;">
            ${header}
            <tr>
              <td>
                <h1 style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:22px;line-height:1.3;color:#000">${title}</h1>
                ${intro}
                ${ctasBlock}
              </td>
            </tr>
            ${footer}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  return { subject, html, from: ctx.from };
}
