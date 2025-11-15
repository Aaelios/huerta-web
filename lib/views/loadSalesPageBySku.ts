// lib/views/loadSalesPageBySku.ts
// Propósito: Cargar y validar las páginas de venta (sales pages) desde
// data/views/sales_pages.jsonc. Ofrece acceso seguro por SKU.

import { promises as fs } from "fs";
import path from "path";
import { parse as parseJsonc } from "jsonc-parser";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Estructura de una página de venta para un SKU específico.
 * Solo contiene copy/UI, no verdad de negocio.
 */
export type SalesPage = {
  sku: string;

  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    image: {
      src: string;
      alt: string;
    };
    ctaText: string;
    note?: string;
  };

  beneficios?: string[];
  incluye?: string[];
  paraQuien?: string[];
  aprendizaje?: string[];

  seccionesExtras?: Array<{
    id: string;
    titulo: string;
    texto?: string;
    bullets?: string[];
    imagen?: {
      src: string;
      alt: string;
    };
  }>;

  testimonios?: Array<{
    nombre: string;
    cita: string;
    rol?: string;
    fotoSrc?: string;
  }>;

  faqs?: Array<{
    pregunta: string;
    respuesta: string;
  }>;

  seo?: {
    title: string;
    description: string;
    canonical: string;
    ogImage?: string;
    keywords?: string[];
  };

  ctaMid?: {
    title: string;
    body: string;
  };

  statement?: {
  text: string;
};

};

/**
 * Mapa de páginas de venta indexadas por SKU.
 */
export type SalesPageMap = Record<string, SalesPage>;

/* -------------------------------------------------------------------------- */
/* Zod Schema                                                                 */
/* -------------------------------------------------------------------------- */

const SalesPageSchema: z.ZodType<SalesPage> = z.object({
  sku: z.string(),

  hero: z.object({
    eyebrow: z.string(),
    title: z.string(),
    subtitle: z.string(),
    image: z.object({
      src: z.string(),
      alt: z.string(),
    }),
    ctaText: z.string(),
    note: z.string().optional(),
  }),

  beneficios: z.array(z.string()).optional(),
  incluye: z.array(z.string()).optional(),
  paraQuien: z.array(z.string()).optional(),
  aprendizaje: z.array(z.string()).optional(),

  seccionesExtras: z
    .array(
      z.object({
        id: z.string(),
        titulo: z.string(),
        texto: z.string().optional(),
        bullets: z.array(z.string()).optional(),
        imagen: z
          .object({
            src: z.string(),
            alt: z.string(),
          })
          .optional(),
      })
    )
    .optional(),

  testimonios: z
    .array(
      z.object({
        nombre: z.string(),
        cita: z.string(),
        rol: z.string().optional(),
        fotoSrc: z.string().optional(),
      })
    )
    .optional(),

  faqs: z
    .array(
      z.object({
        pregunta: z.string(),
        respuesta: z.string(),
      })
    )
    .optional(),

  seo: z
    .object({
      title: z.string(),
      description: z.string(),
      canonical: z.string(),
      ogImage: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),

  ctaMid: z
    .object({
      title: z.string(),
      body: z.string(),
    })
    .optional(),

  statement: z.object({
  text: z.string(),
}).optional(),

});

const SalesPageMapSchema: z.ZodType<SalesPageMap> = z.record(
  z.string(),
  SalesPageSchema
);

/* -------------------------------------------------------------------------- */
/* Utilidad local: formatZodError                                             */
/* -------------------------------------------------------------------------- */

/**
 * Formatea un ZodError a un string legible para logs.
 */
function formatZodError(error: z.ZodError<unknown>): string {
  return error.issues
    .map((issue: z.ZodIssue) => {
      const pathString = issue.path.join(".");
      return `- ${pathString}: ${issue.message}`;
    })
    .join("\n");
}

/* -------------------------------------------------------------------------- */
/* Loader interno: carga el mapa completo                                     */
/* -------------------------------------------------------------------------- */

/**
 * Carga y valida el mapa completo de páginas de venta desde JSONC.
 * Errores de estructura se consideran errores de configuración y lanzan excepción.
 */
async function loadSalesPagesMap(): Promise<SalesPageMap> {
  const filePath = path.join(
    process.cwd(),
    "data",
    "views",
    "sales_pages.jsonc"
  );

  const raw = await fs.readFile(filePath, "utf8");
  const parsed = parseJsonc(raw);

  const result = SalesPageMapSchema.safeParse(parsed);
  if (!result.success) {
    const formatted = formatZodError(result.error);
    throw new Error(
      `Error al validar data/views/sales_pages.jsonc:\n${formatted}`
    );
  }

  return result.data;
}

/* -------------------------------------------------------------------------- */
/* Loader público: cargar por SKU                                             */
/* -------------------------------------------------------------------------- */

/**
 * Devuelve la página de venta asociada a un SKU.
 * Si el SKU no existe en el JSONC, retorna null.
 */
export async function loadSalesPageBySku(
  sku: string
): Promise<SalesPage | null> {
  const map = await loadSalesPagesMap();
  const page = map[sku];

  if (!page) {
    return null;
  }

  return page;
}
