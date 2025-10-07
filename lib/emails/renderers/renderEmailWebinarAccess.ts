// lib/emails/renderers/renderEmailWebinarAccess.ts
// Renderer: variant "prelobby" (acceso a webinar / clase en vivo)

import { renderBase, type EmailContext, absUrl, escapeHtml } from "./_base";

export type NextPrelobby = {
  variant: "prelobby";
  href: string;               // Ruta relativa o URL absoluta al prelobby
  label?: string;             // Texto del botón
  title?: string;             // Título del webinar
  startAt?: string;           // ISO con zona o UTC (opcional, se muestra “texto crudo”)
};

export function renderEmailWebinarAccess(
  next: NextPrelobby,
  ctx: EmailContext
): { subject: string; html: string; from?: string } {
  const title = next.title || "Acceso a tu clase en vivo";
  const btnLabel = next.label || "Ir al prelobby";
  const href = absUrl(next.href, ctx);

  const introLines = [
    "Tu pago fue confirmado.",
    "Desde aquí podrás preparar tu acceso a la sala.",
    next.startAt ? `Horario de la sesión: ${escapeHtml(next.startAt)}` : null,
  ].filter(Boolean);

  return renderBase({
    ctx,
    subject: `Tu acceso al webinar: ${title}`,
    title: title,
    intro: introLines.join(" "),
    cta: { label: btnLabel, href },
    footerNote: `Si el botón no funciona, copia y pega este enlace en tu navegador: ${href}`,
  });
}
