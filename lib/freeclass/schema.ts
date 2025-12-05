// lib/freeclass/schema.ts
// 1) Define el contrato de datos para las landings de clases gratuitas (FreeClassPage).
// 2) Provee schemas Zod y tipos TS para que loaders, APIs y páginas usen la misma fuente de verdad.

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Constantes y helpers locales                                               */
/* -------------------------------------------------------------------------- */

/**
 * Patrón de slug sencillo tipo "fin-freeintro".
 * Se alinea con el formato permitido en page_slug products_page_slug_format_chk.
 */
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* -------------------------------------------------------------------------- */
/* Sub-schemas: bloques reutilizables                                         */
/* -------------------------------------------------------------------------- */

/**
 * Imagen genérica con src/alt.
 * Se usa en hero e imágenes adicionales si se agregan a futuro.
 */
const ImageSchema = z.object({
  src: z.string(),
  alt: z.string(),
});

/**
 * Bloque principal del hero de la landing.
 * Copy 100% de marketing, sin datos operativos.
 */
const HeroSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  subtitle: z.string(),
  image: ImageSchema,
  ctaText: z.string(),
  note: z.string().optional(),
});

/**
 * Información del autor de la clase gratuita.
 * Separa rol y negocio para soportar distintos perfiles.
 * miniBio e imageAlt sirven para usos compactos y accesibles.
 */
const AutorSchema = z.object({
  name: z.string(),
  role: z.string(),
  business: z.string().nullable().optional(),
  bio: z.string(),
  miniBio: z.string(),
  imageSrc: z.string(),
  imageAlt: z.string(),
  personId: z.string().nullable().optional(),
});

/**
 * Sección "Cómo funciona".
 * Resume el flujo y los puntos clave en bullets.
 */
const ComoFuncionaSchema = z.object({
  resumen: z.string(),
  bullets: z.array(z.string()),
});

/**
 * Títulos cortos para secciones clave de la landing.
 * Permiten ajustar textos de headings sin tocar los bullets.
 */
const TitlesSchema = z.object({
  queAprenderas: z.string(),
  testimonios: z.string(),
});

/**
 * Testimonio de una persona específica.
 * Incluye negocio separado de rol y un link opcional (ej. Instagram).
 * photoSrc/photoAlt permiten mostrar la foto con accesibilidad básica.
 */
const TestimonioSchema = z.object({
  name: z.string(),
  role: z.string(),
  business: z.string().nullable().optional(),
  quote: z.string(),
  photoSrc: z.string(),
  photoAlt: z.string(),
  platform: z.string().optional(),
  link: z.string().optional(),
});

/**
 * Mensajes por estado de registro.
 * Estos textos se mapean desde registration_state/ui_state en frontend/backend.
 */
const MensajesEstadoSchema = z.object({
  open: z.string(),
  full: z.string(),
  waitlist: z.string(),
  closed: z.string(),
  proximamente: z.string(),
});

/**
 * Configuración de integraciones externas (Brevo, tracking).
 * leadContext está acotado a "free_class" para evitar desviaciones silenciosas.
 */
const IntegracionesSchema = z.object({
  brevoListId: z.string(),
  leadContext: z.literal("free_class"),
  tagsBrevo: z.array(z.string()),
});

/**
 * Configuración SEO específica para la landing.
 * canonical debe ser una URL válida absoluta.
 */
const SeoSchema = z.object({
  title: z.string(),
  description: z.string(),
  canonical: z.string().url(),
  ogImage: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

/* -------------------------------------------------------------------------- */
/* Schema principal: FreeClassPage                                            */
/* -------------------------------------------------------------------------- */

/**
 * Nodo de configuración de una landing de clase gratuita.
 * Clave en el JSONC: SKU del producto de free class.
 */
export const FreeClassPageSchema = z.object({
  // Identidad y routing
  sku: z.string(),
  slugLanding: z.string().regex(slugPattern, {
    message:
      "slugLanding debe usar solo minúsculas, números y guiones (ej. fin-freeintro)",
  }),
  prelobbyRoute: z.string().nullable().optional(),

  // Hero de la landing
  hero: HeroSchema,

  // Bloques de copy principales
  paraQuien: z.array(z.string()),
  queAprenderas: z.array(z.string()),
  queSeLlevan: z.array(z.string()),
  titles: TitlesSchema,

  // Autor de la clase
  autor: AutorSchema,

  // Cómo funciona la clase
  comoFunciona: ComoFuncionaSchema,

  // Testimonios (opcional, puede ser array vacío)
  testimonios: z.array(TestimonioSchema).optional(),

  // Mensajes por estado de registro
  mensajesEstado: MensajesEstadoSchema,

  // Mensajes auxiliares
  mensajeConfianza: z.string(),
  mensajePostRegistro: z.string(),
  mensajeErrorGenerico: z.string(),
  ctaVolverForm: z.string(),

  // Integraciones externas
  integraciones: IntegracionesSchema,

  // SEO específico de la landing
  seo: SeoSchema,
});

/**
 * Mapa de páginas de clase gratuita indexadas por SKU.
 * Clave = SKU exacto del producto; valor = FreeClassPage.
 */
export const FreeClassPageMapSchema = z.record(
  z.string(),
  FreeClassPageSchema,
);

/* -------------------------------------------------------------------------- */
/* Tipos TS inferidos                                                         */
/* -------------------------------------------------------------------------- */

export type FreeClassPage = z.infer<typeof FreeClassPageSchema>;
export type FreeClassPageMap = z.infer<typeof FreeClassPageMapSchema>;
