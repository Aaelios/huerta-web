// lib/emails/renderers/renderEmailGeneric.ts
// Renderer: variantes genéricas ("generic" | "download" | "schedule" | "community")

import { renderBase, type EmailContext, absUrl } from "./_base";

export type GenericVariant = "generic" | "download" | "schedule" | "community";

export type NextGeneric = {
  variant: GenericVariant;
  href?: string | null;   // Ruta relativa o URL absoluta
  label?: string | null;  // Texto del botón
  title?: string | null;  // Título opcional del contenido
};

const SUBJECT_BY_VARIANT: Record<GenericVariant, string> = {
  generic: "Tu compra está confirmada",
  download: "Tu descarga está lista",
  schedule: "Agenda tu sesión",
  community: "Acceso a la comunidad",
};

const TITLE_BY_VARIANT: Record<GenericVariant, string> = {
  generic: "Pago confirmado",
  download: "Tu descarga está lista",
  schedule: "Agenda tu sesión",
  community: "Bienvenido a la comunidad",
};

export function renderEmailGeneric(
  next: NextGeneric,
  ctx: EmailContext
): { subject: string; html: string; from?: string } {
  const subject = SUBJECT_BY_VARIANT[next.variant] || SUBJECT_BY_VARIANT.generic;
  const title = next.title || TITLE_BY_VARIANT[next.variant] || TITLE_BY_VARIANT.generic;

  const href = next.href ? absUrl(next.href, ctx) : null;
  const label = next.label || (next.variant === "download" ? "Descargar" : "Continuar");

  return renderBase({
    ctx,
    subject,
    title,
    intro: "Gracias por tu compra. Aquí está tu siguiente paso.",
    cta: { label, href },
    footerNote: href ? `Si el botón no funciona, copia y pega este enlace: ${href}` : undefined,
  });
}
