// lib/webinars/load.ts

/**
 * Módulo — load
 * Wrapper público de resolución por slug para construir el view model Webinar.
 *
 * Responsabilidad:
 * - Resolver primero el producto operativo desde Supabase usando page_slug canónico
 * - Cargar después el nodo editorial desde JSON legacy
 * - Delegar la composición final a f_composeWebinar
 *
 * Reglas:
 * - JSON NO se usa para descubrir SKU ni identidad operativa
 * - Supabase manda en identidad y pricing
 * - JSON aporta solo contenido editorial temporal
 * - No hay fallback silencioso
 *
 * Cambio actual — 2026-04-08:
 * - getWebinar deja de depender operativamente del JSON
 * - se resuelve producto por slug derivado desde products.page_slug
 * - se compone Webinar vía f_composeWebinar
 */

import type { Webinar } from "@/lib/types/webinars";
import { loadWebinars as loadWebinarsRaw } from "@/lib/webinars/loadWebinars";
import { WebinarMapSchema, WebinarSchema } from "@/lib/webinars/schema";
import {
  f_composeWebinar,
  type ProductOperationalData,
} from "@/lib/webinars/f_composeWebinar";
import { m_getSupabaseService } from "@/lib/supabase/m_getSupabaseService";
import { f_precioVigentePorSku } from "@/src/server/modules/webinars/m_precios";
import type { ZodError } from "zod";
import type { SupabaseClient as PriceClient } from "@/src/server/modules/webinars/m_precios";

/**
 * Fila mínima requerida desde products para resolver el producto operativo.
 */
type ProductRow = {
  sku: string;
  name: string;
  status: string | null;
  page_slug: string | null;
};

/**
 * Contrato mínimo de lectura para products.
 * Se tipa localmente para evitar depender de métodos no confirmados fuera de este archivo.
 */
type SelectProductsResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type ProductsReader = {
  from: (table: string) => {
    select: (columns: string) => Promise<SelectProductsResult<ProductRow>>;
  };
};

/**
 * getWebinar
 * Resuelve un Webinar por slug corto.
 *
 * Flujo:
 * 1) Resolver producto operativo por slug derivado desde products.page_slug
 * 2) Cargar mapa editorial legacy desde JSON
 * 3) Buscar nodo editorial por slug derivado
 * 4) Componer Webinar final con f_composeWebinar
 */
export async function getWebinar(slug: string): Promise<Webinar> {
  // ---------------------------
  // Validación de entrada
  // ---------------------------

  if (!slug || typeof slug !== "string") {
    throw new Error('Slug inválido');
  }

  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    throw new Error('Slug vacío');
  }

  // ---------------------------
  // Resolución operativa
  // ---------------------------

  const operational = await f_getOperationalBySlug(normalizedSlug);

  // ---------------------------
  // Carga editorial legacy
  // ---------------------------

  const editorial = await f_getEditorialBySlug(normalizedSlug);

  // ---------------------------
  // Composición final
  // ---------------------------

  return f_composeWebinar(operational, editorial);
}

// ---- Helpers privados

/**
 * Resuelve el producto operativo buscando en products
 * y comparando el último segmento de page_slug con el slug recibido.
 *
 * Regla:
 * - 0 matches  -> error explícito
 * - >1 matches -> error explícito
 */
async function f_getOperationalBySlug(slug: string): Promise<ProductOperationalData> {
  const supabase = m_getSupabaseService();
  const reader = supabase as unknown as ProductsReader;
  const priceClient = supabase as unknown as PriceClient;

  const { data, error } = await reader
    .from("products")
    .select("sku, name, status, page_slug");

  if (error) {
    throw new Error(`Error leyendo products: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("No se encontraron productos en Supabase");
  }

  const matches = data.filter((row) => {
    if (!row.page_slug) return false;
    try {
      return f_getSlugFromPageSlug(row.page_slug) === slug;
    } catch {
      return false;
    }
  });

  if (matches.length === 0) {
    throw new Error(`Producto operativo no encontrado para slug: "${slug}"`);
  }

  if (matches.length > 1) {
    throw new Error(`Slug ambiguo en products para "${slug}"`);
  }

  const row = matches[0];

  if (!row.sku) {
    throw new Error(`Producto operativo sin sku para slug "${slug}"`);
  }

  if (!row.name) {
    throw new Error(`Producto operativo sin name para slug "${slug}"`);
  }

  if (!row.page_slug) {
    throw new Error(`Producto operativo sin page_slug para slug "${slug}"`);
  }

  const pricing = await f_precioVigentePorSku(priceClient, row.sku, "MXN");

  if (pricing.price_cents == null || pricing.currency == null) {
    throw new Error(`Pricing no resuelto para sku "${row.sku}"`);
  }

  return {
    sku: row.sku,
    name: row.name,
    page_slug: row.page_slug,
    status: row.status,
    pricing: {
      price_cents: pricing.price_cents,
      currency: pricing.currency,
    },
  };
}

/**
 * Carga y valida el mapa editorial completo.
 */
async function f_loadEditorialMap(): Promise<Record<string, Webinar>> {
  const map = await loadWebinarsRaw();

  const parsedMap = WebinarMapSchema.safeParse(map);
  if (!parsedMap.success) {
    const msg = formatZodError("WebinarMapSchema", parsedMap.error);
    throw new Error(`webinars.jsonc inválido: ${msg}`);
  }

  return parsedMap.data;
}

/**
 * Resuelve y valida un nodo editorial por slug.
 */
async function f_getEditorialBySlug(slug: string): Promise<Webinar> {
  const map = await f_loadEditorialMap();
  const node = map[slug];

  if (!node) {
    throw new Error(`Nodo editorial no encontrado para slug: "${slug}"`);
  }

  const parsedNode = WebinarSchema.safeParse(node);
  if (!parsedNode.success) {
    const msg = formatZodError(`WebinarSchema[${slug}]`, parsedNode.error);
    throw new Error(`Nodo editorial inválido para "${slug}": ${msg}`);
  }

  return parsedNode.data;
}

/**
 * Extrae el slug corto desde page_slug canónico.
 * Ej:
 * - webinars/w-ingresos -> w-ingresos
 * - servicios/1a1-rhd -> 1a1-rhd
 */
function f_getSlugFromPageSlug(pageSlug: string): string {
  if (!pageSlug || typeof pageSlug !== "string") {
    throw new Error("Invalid page_slug");
  }

  const parts = pageSlug.split("/").filter(Boolean);

  if (parts.length === 0) {
    throw new Error(`Cannot derive slug from page_slug: "${pageSlug}"`);
  }

  return parts[parts.length - 1];
}

/**
 * Normaliza errores de Zod para mensajes legibles.
 */
function formatZodError(ctx: string, err: ZodError): string {
  try {
    return err.issues
      .map((issue) => {
        const path = issue.path.length ? `/${issue.path.join("/")}` : "";
        return `${ctx}${path}: ${issue.message}`;
      })
      .join("; ");
  } catch {
    return err.message;
  }
}