// lib/emails/renderers/index.ts
// Dispatcher de renderers de correo. Expone renderEmail(next, ctx).

import type { EmailContext } from "./_base";
import { renderEmailWebinarAccess, type NextPrelobby } from "./renderEmailWebinarAccess";
import { renderEmailBundleAccess, type NextBundle } from "./renderEmailBundleAccess";
import { renderEmailGeneric, type NextGeneric } from "./renderEmailGeneric";

export type NextAny = NextPrelobby | NextBundle | NextGeneric;

export function renderEmail(
  next: NextAny,
  ctx: EmailContext
): { subject: string; html: string; from?: string } {
  switch (next.variant) {
    case "prelobby":
      return renderEmailWebinarAccess(next as NextPrelobby, ctx);
    case "bundle":
      return renderEmailBundleAccess(next as NextBundle, ctx);
    case "download":
    case "schedule":
    case "community":
    case "generic":
    default:
      return renderEmailGeneric(next as NextGeneric, ctx);
  }
}
