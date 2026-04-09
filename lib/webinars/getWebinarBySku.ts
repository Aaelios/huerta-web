// lib/webinars/getWebinarBySku.ts

/**
 * Módulo — getWebinarBySku
 * Wrapper público de resolución por SKU para construir el view model Webinar.
 *
 * Responsabilidad:
 * - Resolver primero el producto operativo desde Supabase por SKU
 * - Derivar slug desde products.page_slug
 * - Cargar después el nodo editorial desde JSON legacy
 * - Delegar la composición final a f_composeWebinar
 *
 * Reglas:
 * - JSON NO se usa como fuente operativa
 * - Supabase manda en identidad y pricing
 * - Se mantiene cache por SKU del Webinar ya compuesto
 * - No hay fallback silencioso
 *
 * Cambio actual — 2026-04-08:
 * - getWebinarBySku deja de indexar el JSON como fuente operativa
 * - ahora resuelve primero producto operativo por SKU
 * - luego compone Webinar vía f_composeWebinar
 */

import type { Webinar } from "@/lib/types/webinars";
import { loadWebinars } from "@/lib/webinars/loadWebinars";
import { WebinarMapSchema, WebinarSchema } from "@/lib/webinars/schema";
import {
  f_composeWebinar,
  type ProductOperationalData,
} from "@/lib/webinars/f_composeWebinar";
import { m_getSupabaseService } from "@/lib/supabase/m_getSupabaseService";
import { f_precioVigentePorSku } from "@/src/server/modules/webinars/m_precios";
import type { SupabaseClient as PriceClient } from "@/src/server/modules/webinars/m_precios";
import type { ZodError } from "zod";

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
 * Contrato mínimo de lectura para products por SKU.
 */
type SelectProductsBySkuResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type ProductsReaderBySku = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (col: string, val: unknown) => {
        limit: (n: number) => Promise<SelectProductsBySkuResult<TypedProductRow>>;
      };
    };
  };
};

type TypedProductRow = ProductRow;

type CacheShape = {
  bySku: Map<string, Webinar>;
  builtAt: number;
  ttlMs: number;
};

const TTL_SECONDS = Number(process.env.CACHE_WEBINARS_TTL ?? 120);

const cache: CacheShape = {
  bySku: new Map<string, Webinar>(),
  builtAt: 0,
  ttlMs: TTL_SECONDS * 1000,
};

function cacheExpired(): boolean {
  return Date.now() - cache.builtAt > cache.ttlMs;
}

/**
 * getWebinarBySku
 *
 * Comportamiento contractual:
 * - sku vacío o no string -> null
 * - sku válido no encontrado -> null
 * - sku válido encontrado pero datos inválidos/incompletos -> error explícito
 */
export async function getWebinarBySku(sku: string): Promise<Webinar | null> {
  if (!sku || typeof sku !== "string") {
    return null;
  }

  const normalizedSku = sku.trim();
  if (!normalizedSku) {
    return null;
  }

  if (cache.bySku.size > 0 && !cacheExpired()) {
    return cache.bySku.get(normalizedSku) ?? null;
  }

  const webinar = await f_buildWebinarBySku(normalizedSku);

  cache.bySku.clear();
  if (webinar) {
    cache.bySku.set(normalizedSku, webinar);
  }
  cache.builtAt = Date.now();

  return webinar;
}

// ---- Helpers privados

/**
 * Construye Webinar por SKU usando flujo operativo-first.
 */
async function f_buildWebinarBySku(sku: string): Promise<Webinar | null> {
  const operational = await f_getOperationalBySku(sku);

  if (!operational) {
    return null;
  }

  const slug = f_getSlugFromPageSlug(operational.page_slug);
  const editorial = await f_getEditorialBySlug(slug);

  return f_composeWebinar(operational, editorial);
}

/**
 * Resuelve producto operativo por SKU exacto.
 * Si no existe, regresa null.
 * Si existe pero está incompleto, lanza error.
 */
async function f_getOperationalBySku(sku: string): Promise<ProductOperationalData | null> {
  const supabase = m_getSupabaseService();
  const reader = supabase as unknown as ProductsReaderBySku;
  const priceClient = supabase as unknown as PriceClient;

  const { data, error } = await reader
    .from("products")
    .select("sku, name, status, page_slug")
    .eq("sku", sku)
    .limit(1);

  if (error) {
    throw new Error(`Error leyendo product por sku "${sku}": ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0];

  if (!row.sku) {
    throw new Error(`Producto operativo sin sku para lookup "${sku}"`);
  }

  if (!row.name) {
    throw new Error(`Producto operativo sin name para sku "${sku}"`);
  }

  if (!row.page_slug) {
    throw new Error(`Producto operativo sin page_slug para sku "${sku}"`);
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
  const raw = await loadWebinars();

  const parsedMap = WebinarMapSchema.safeParse(raw);
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