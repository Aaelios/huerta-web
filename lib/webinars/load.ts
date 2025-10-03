// lib/webinars/load.ts

import type { Webinar } from "@/lib/types/webinars";
import { loadWebinars as loadWebinarsRaw } from "@/lib/webinars/loadWebinars";
import { WebinarMapSchema, WebinarSchema } from "@/lib/webinars/schema";

/**
 * getWebinar
 * Carga el mapa desde data/webinars.jsonc, valida y retorna el webinar por slug.
 * Lanza errores claros si el slug no existe o si el nodo no cumple el esquema.
 */
export async function getWebinar(slug: string): Promise<Webinar> {
  // 1) Cargar el mapa bruto
  const map = await loadWebinarsRaw();

  // 2) Validar el mapa completo (estructura general)
  const parsedMap = WebinarMapSchema.safeParse(map);
  if (!parsedMap.success) {
    const msg = formatZodError("WebinarMapSchema", parsedMap.error);
    throw new Error(`webinars.jsonc inválido: ${msg}`);
  }

  // 3) Tomar el nodo por slug
  const node = parsedMap.data[slug];
  if (!node) {
    throw new Error(`Webinar no encontrado para slug: "${slug}"`);
  }

  // 4) Validar el nodo específico (defensa extra)
  const parsedNode = WebinarSchema.safeParse(node);
  if (!parsedNode.success) {
    const msg = formatZodError(`WebinarSchema[${slug}]`, parsedNode.error);
    throw new Error(`Nodo de webinar inválido para "${slug}": ${msg}`);
  }

  return parsedNode.data;
}

// ---- Helpers

function formatZodError(ctx: string, err: any): string {
  try {
    return err.errors
      .map((e: any) => {
        const path = e.path?.length ? `/${e.path.join("/")}` : "";
        return `${ctx}${path}: ${e.message}`;
      })
      .join("; ");
  } catch {
    return String(err?.message ?? err);
  }
}
