// lib/modules/loadModuleDetail.ts
// Propósito: Loader tipado de detalle de módulo (bundle) combinando Supabase (products + RPCs) y SalesPage.

/* -------------------------------------------------------------------------- */
/* Imports                                                                     */
/* -------------------------------------------------------------------------- */

import type {
  PostgrestError,
  PostgrestSingleResponse,
} from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/supabase/callRpc";
import {
  loadSalesPageBySku,
  type SalesPage,
} from "@/lib/views/loadSalesPageBySku";

/* -------------------------------------------------------------------------- */
/* Tipos propios del módulo                                                   */
/* -------------------------------------------------------------------------- */

type ChildFulfillmentType =
  | "course"
  | "template"
  | "live_class"
  | "one_to_one"
  | "subscription_grant";

type ModuleDetailPricing = {
  amountCents: number;
  currency: "MXN" | "USD";
  stripePriceId: string;
};

export type ModuleDetailChild = {
  sku: string;
  fulfillmentType: ChildFulfillmentType;
  nextStartAt: string | null;
  pageSlug: string | null;
  title: string;
  cover: string | null;
  level: Level | null;
  topics: string[];
};

export type ModuleDetail = {
  sku: string;
  pageSlug: string;
  title: string;
  fulfillmentType: "bundle";
  pricing: ModuleDetailPricing;
  nextStartAt: string | null;
  children: ModuleDetailChild[];
  sales: SalesPage;
};

type Level = 'Fundamentos' | 'Profundización' | 'Impacto';

interface ProductMeta {
  topics?: unknown;
  level?: unknown;
  purchasable?: unknown;
  is_featured?: unknown;
  fulfillment_type?: unknown;
  module_sku?: unknown;
  cover?: unknown;
  product_slug?: unknown;
}

type DbProductChildRow = {
  sku: string;
  name: string;
  metadata: ProductMeta | null;
  page_slug: string | null;
};

function toStringArray(val: unknown): string[] {
  return Array.isArray(val) ? val.map((t) => String(t)) : [];
}

function toStringOrNull(val: unknown): string | null {
  return typeof val === "string" ? val : null;
}

function toLevel(val: unknown): Level | null {
  if (val === "Fundamentos" || val === "Profundización" || val === "Impacto") {
    return val;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Tipos de acceso a Supabase                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Producto base usado como discriminador de módulo.
 * Solo incluye las columnas necesarias para este loader.
 */
type DbProductBundleRow = {
  sku: string;
  name: string;
  description: string | null;
  status: string;
  fulfillment_type: string;
  page_slug: string | null;
};

/**
 * f_bundles_expand_items(p_bundle_sku text)
 * RETURNS TABLE (sku text, fulfillment_type text)
 */
type FBundlesExpandItemsArgs = {
  p_bundle_sku: string;
};

type FBundlesExpandItemsRow = {
  sku: string;
  fulfillment_type: ChildFulfillmentType;
};

type FBundlesExpandItemsOutput = FBundlesExpandItemsRow[];

/**
 * f_bundle_schedule(bundle_sku text)
 * RETURNS jsonb:
 * {
 *   "bundle_sku": "<bundle_sku>",
 *   "next_start_at": "<timestamp or null>",
 *   "children": [
 *     { "child_sku": "<sku>", "next_start_at": "<timestamp or null>" }
 *   ]
 * }
 */
type FBundleScheduleArgs = {
  bundle_sku: string;
};

type FBundleScheduleChild = {
  child_sku: string;
  next_start_at: string | null;
};

type FBundleScheduleOutput = {
  bundle_sku: string;
  next_start_at: string | null;
  children: FBundleScheduleChild[];
} | null;

/**
 * f_catalog_price_by_sku(p_sku text)
 * RETURNS TABLE (sku text, stripe_price_id text, amount_cents integer, currency text, metadata jsonb)
 * Por diseño, 1 precio vigente por SKU.
 */
type FCatalogPriceBySkuArgs = {
  p_sku: string;
};

type FCatalogPriceBySkuRow = {
  sku: string;
  stripe_price_id: string;
  amount_cents: number;
  currency: "MXN" | "USD";
  metadata: unknown;
};

type FCatalogPriceBySkuOutput = FCatalogPriceBySkuRow[];

/* -------------------------------------------------------------------------- */
/* Loader principal                                                            */
/* -------------------------------------------------------------------------- */

/**
 * loadModuleDetail
 *
 * - Resuelve el producto por `page_slug`.
 * - Valida que sea un bundle visible (status IN active/sunsetting).
 * - En caso contrario, retorna `null` (equivalente a 404).
 * - En caso de inconsistencias de configuración (sin precio, sin
 *   sales page, RPCs con error),
 *   lanza errores que deben tratarse como 500.
 */
export async function loadModuleDetail(
  pageSlug: string
): Promise<ModuleDetail | null> {
  const client = getServiceClient();

  /* ---------------------------------------------------------------------- */
  /* 1) Resolver producto por page_slug                                     */
  /* ---------------------------------------------------------------------- */

  const { data, error } = (await client
    .from("products")
    .select("sku,name,description,status,fulfillment_type,page_slug")
    .eq("page_slug", pageSlug)
    .in("status", ["active", "sunsetting"])
    .maybeSingle()) as PostgrestSingleResponse<DbProductBundleRow>;

  if (error) {
    // Error de Supabase debe tratarse como 500.
    throw new Error(
      `Error al cargar producto bundle por page_slug="${pageSlug}": ${error.message}`
    );
  }

  const product = data;

  if (!product) {
    // No existe producto para este slug → equivalente a 404.
    return null;
  }

  if (product.fulfillment_type !== "bundle") {
    // El discriminador indica que solo módulos tipo bundle son válidos aquí.
    return null;
  }

  const bundleSku = product.sku;
  const effectivePageSlug = product.page_slug ?? pageSlug;

  /* ---------------------------------------------------------------------- */
  /* 2) Expandir hijos del bundle                                           */
  /* ---------------------------------------------------------------------- */

  const bundleChildren = await callRpc<
    FBundlesExpandItemsArgs,
    FBundlesExpandItemsOutput
  >("f_bundles_expand_items", { p_bundle_sku: bundleSku });

  /* ---------------------------------------------------------------------- */
  /* 2.1) Cargar productos de hijos para enriquecer DTO                     */
  /* ---------------------------------------------------------------------- */

  const childSkus = bundleChildren.map((child) => child.sku);

  const childrenProductsBySku = new Map<string, DbProductChildRow>();

  if (childSkus.length > 0) {
    const {
      data: childProducts,
      error: childProductsError,
    } = (await client
      .from("products")
      .select("sku,name,metadata,page_slug")
      .in("sku", childSkus)) as PostgrestSingleResponse<DbProductChildRow[]>;

    if (childProductsError) {
      throw new Error(
        `Error al cargar productos hijos para bundle sku="${bundleSku}": ${childProductsError.message}`
      );
    }

    if (Array.isArray(childProducts)) {
      for (const row of childProducts) {
        childrenProductsBySku.set(row.sku, row);
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 3) Obtener schedule del bundle                                         */
  /* ---------------------------------------------------------------------- */

  const rawSchedule = await callRpc<FBundleScheduleArgs, FBundleScheduleOutput>(
    "f_bundle_schedule",
    { bundle_sku: bundleSku }
  );

  const bundleNextStartAt: string | null = rawSchedule?.next_start_at ?? null;

  const childrenNextStarts = new Map<string, string | null>();

  if (rawSchedule?.children && Array.isArray(rawSchedule.children)) {
    for (const child of rawSchedule.children) {
      childrenNextStarts.set(child.child_sku, child.next_start_at);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 4) Obtener precio del bundle                                           */
  /* ---------------------------------------------------------------------- */

  const priceRows = await callRpc<
    FCatalogPriceBySkuArgs,
    FCatalogPriceBySkuOutput
  >("f_catalog_price_by_sku", {
    p_sku: bundleSku,
  });

  if (!Array.isArray(priceRows) || priceRows.length !== 1) {
    throw new Error(
      `Configuración de precio inválida para bundle sku="${bundleSku}". Se esperaba exactamente 1 fila, se obtuvo ${priceRows.length}.`
    );
  }

  const price = priceRows[0];

  const pricing: ModuleDetailPricing = {
    amountCents: price.amount_cents,
    currency: price.currency,
    stripePriceId: price.stripe_price_id,
  };

  /* ---------------------------------------------------------------------- */
  /* 5) Cargar SalesPage                                                    */
  /* ---------------------------------------------------------------------- */

  const sales = await loadSalesPageBySku(bundleSku);

  if (!sales) {
    throw new Error(
      `Sales page no configurada para bundle sku="${bundleSku}".`
    );
  }

  /* ---------------------------------------------------------------------- */
  /* 6) Construir DTO final ModuleDetail                                    */
  /* ---------------------------------------------------------------------- */

  const children: ModuleDetailChild[] = bundleChildren.map((child) => {
    const nextStartAt = childrenNextStarts.get(child.sku) ?? null;
    const productChild = childrenProductsBySku.get(child.sku);

    const meta = (productChild?.metadata ?? null) as ProductMeta | null;
    const level = meta ? toLevel(meta.level) : null;
    const topics = meta ? toStringArray(meta.topics) : [];
    const cover = meta ? toStringOrNull(meta.cover) : null;

    return {
      sku: child.sku,
      fulfillmentType: child.fulfillment_type,
      nextStartAt,
      pageSlug: productChild?.page_slug ?? null,
      title: productChild?.name ?? child.sku,
      cover,
      level,
      topics,
    };
  });

  const detail: ModuleDetail = {
    sku: bundleSku,
    pageSlug: effectivePageSlug,
    title: product.name,
    fulfillmentType: "bundle",
    pricing,
    nextStartAt: bundleNextStartAt,
    children,
    sales,
  };

  return detail;
}
