// lib/forms/schemas.ts

/**
 * Esquemas Zod y utilidades de validación para /api/forms/submit
 * - Define contratos por `type`: contact_form | newsletter
 * - Valida formatos (email, uuid v4, tamaños en bytes)
 * - Normalización profunda vive en h_validate_normalize.ts
 */

import { z } from 'zod';
import {
  ALLOWED_TYPES,
  ALLOWED_SOURCES,
  SOURCE_NORMALIZATION,
  MAX_BODY_BYTES,
  MAX_MESSAGE_BYTES,
  MAX_SECTION_BYTES,
  STRING_LIMITS,
  MOTIVOS,
  TELEFONO_REGEX,
} from './constants';

// ===== Utilidades comunes =====

/** Tamaño en bytes de string o JSON serializado. */
export function byteSize(input: unknown): number {
  try {
    if (typeof input === 'string') return Buffer.byteLength(input, 'utf8');
    return Buffer.byteLength(JSON.stringify(input ?? ''), 'utf8');
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/** Recorta por longitud de caracteres y reporta truncamiento. */
export function truncateByChars(value: string, maxChars: number): { value: string; truncated: boolean } {
  if (value.length <= maxChars) return { value, truncated: false };
  return { value: value.slice(0, maxChars), truncated: true };
}

/** Patrón UUID v4. */
export const uuidV4Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ===== Esquemas atómicos =====

const EmailSchema = z.string().min(3).max(254).email();

const RequestIdSchema = z
  .string()
  .regex(uuidV4Regex, { message: 'request_id must be a UUID v4' });

/**
 * `source` aceptado:
 *  - alguno de ALLOWED_SOURCES
 *  - o variante presente en SOURCE_NORMALIZATION (se normaliza después)
 */
const SourceSchema = z
  .string()
  .min(2)
  .max(64)
  .refine(
    (s: string) =>
      (ALLOWED_SOURCES as readonly string[]).includes(s) ||
      Object.prototype.hasOwnProperty.call(SOURCE_NORMALIZATION, s),
    { message: 'source not allowed' },
  );

/** Sección opcional con tope de tamaño. */
const OptionalSectionSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .refine(
    (obj: Record<string, unknown> | undefined) => (obj ? byteSize(obj) <= MAX_SECTION_BYTES : true),
    { message: `section exceeds ${MAX_SECTION_BYTES} bytes` },
  );

/** Turnstile schema dinámico con bypass */
function buildTurnstileTokenSchema() {
  if (process.env.FORMS_DISABLE_TURNSTILE === 'true') {
    // En bypass: aceptar string vacío
    return z.string().max(0);
  }
  return z.string().min(10);
}
const TurnstileTokenSchema = buildTurnstileTokenSchema();

// ===== Esquema Metadata =====
const MetadataSchema = z
  .object({
    motivo: z.enum(MOTIVOS),
    telefono: z.string().regex(TELEFONO_REGEX).optional(),
  })
  .strict()
  .optional();

// ===== Esquema base y variantes por type =====

/** Campos comunes a ambos tipos. */
const BaseSchema = z.object({
  type: z.enum(ALLOWED_TYPES),
  turnstile_token: TurnstileTokenSchema,
  request_id: RequestIdSchema,
  email: EmailSchema,
  source: SourceSchema,
  // Secciones opcionales con límite
  utm: OptionalSectionSchema,
  context: OptionalSectionSchema,
  metadata: MetadataSchema,
  // Campos generales opcionales
  marketing_opt_in: z.boolean().optional(),
  // Honeypot
  company: z
    .string()
    .optional()
    .refine((val) => val === undefined || val === '', {
      message: 'company must be empty',
    }),
});

/** `contact_form` requiere `payload.message`. */
const ContactPayloadSchema = z
  .object({
    message: z
      .string()
      .min(20, { message: 'message must have at least 20 characters' })
      .refine((val: string) => byteSize(val) <= MAX_MESSAGE_BYTES, {
        message: `message exceeds ${MAX_MESSAGE_BYTES} bytes`,
      }),
  })
  .strict();

export const ContactInputSchema = BaseSchema.extend({
  type: z.literal('contact_form'),
  full_name: z.string().min(2).max(STRING_LIMITS.fullNameMax),
  payload: ContactPayloadSchema,
});

/** `newsletter` no requiere payload; si viene, respeta tope de sección. */
export const NewsletterInputSchema = BaseSchema.extend({
  type: z.literal('newsletter'),
  full_name: z.string().max(STRING_LIMITS.fullNameMax).optional(),
  payload: z
    .unknown()
    .optional()
    .refine(
      (v: unknown) => (v === undefined ? true : byteSize(v) <= MAX_SECTION_BYTES),
      { message: `payload exceeds ${MAX_SECTION_BYTES} bytes` },
    ),
});

/** Unión discriminada por `type`. */
export const SubmitInputSchema = z.discriminatedUnion('type', [
  ContactInputSchema,
  NewsletterInputSchema,
]);

// ===== Guardas complementarias =====

/** Verifica que el body bruto no exceda MAX_BODY_BYTES. */
export function assertMaxBodyBytes(rawBody: string) {
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    const err = new Error('payload_too_large');
    (err as any).code = 'payload_too_large';
    throw err;
  }
}

/** ¿El `source` requiere normalización posterior? */
export function needsSourceNormalization(source: string): boolean {
  return !(ALLOWED_SOURCES as readonly string[]).includes(source);
}

// ===== Tipos derivados =====
export type SubmitInput = z.infer<typeof SubmitInputSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
