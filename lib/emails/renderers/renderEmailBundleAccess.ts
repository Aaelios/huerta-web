// lib/emails/renderers/renderEmailBundleAccess.ts
// Renderer: variant "bundle" (módulo o paquete con varias clases o entregas)

import { renderBase, type EmailContext, absUrl, type Cta } from "./_base";

export type BundleItem = {
  title: string;
  when?: string | null;      // Fecha/hora descriptiva
  href?: string | null;      // URL o null si aún no disponible
  label?: string | null;     // Texto del botón
  type?: string | null;      // live_class | course | template
};

export type NextBundle = {
  variant: "bundle";
  items: BundleItem[];
};

export function renderEmailBundleAccess(
  next: NextBundle,
  ctx: EmailContext
): { subject: string; html: string; from?: string } {
  const title = "Tu acceso al módulo está listo";
  const intro =
    "Cada clase se abrirá en la fecha indicada. Desde aquí podrás ingresar a las sesiones o revisar su estado.";

    const ctas: Cta[] = next.items.map((it) => {
    const href = it.href ? absUrl(it.href, ctx) : null;
    const label = it.title + (it.when ? ` · ${it.when}` : "");
    return { label, href };
    });

  return renderBase({
    ctx,
    subject: "Tu acceso al módulo",
    title,
    intro,
    ctas,
    footerNote:
      "Los enlaces se activarán automáticamente según la fecha programada.",
  });
}
