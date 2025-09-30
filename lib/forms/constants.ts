// lib/forms/constants.ts

/**
 * Constantes de negocio para el endpoint /api/forms/submit
 * Única fuente de verdad para límites, catálogos y textos de error.
 */

// ===== Versión de contrato =====
export const SCHEMA_VERSION = 'v1';

// ===== Tamaños máximos =====
export const MAX_BODY_BYTES = 64 * 1024;          // Límite absoluto del body JSON
export const MAX_MESSAGE_BYTES = 2 * 1024;        // Tamaño máximo de payload.message
export const MAX_SECTION_BYTES = 2 * 1024;        // Límite para utm/context/metadata

// Límites de strings comunes
export const STRING_LIMITS = Object.freeze({
  fullNameMax: 128,
  genericMax: 256,
});

// ===== Catálogos permitidos =====
// OJO: en SQL `f_contact_validate_v1` espera `contact_form` y `newsletter`.
export const ALLOWED_TYPES = ['contact_form', 'newsletter'] as const;
export type FormType = (typeof ALLOWED_TYPES)[number];

// En SQL `f_contact_validate_v1` espera: web_form, checkout, import, api.
export const ALLOWED_SOURCES = [
  'web_form',
  'checkout',
  'import',
  'api',
] as const;
export type FormSource = (typeof ALLOWED_SOURCES)[number];

// Catálogo único de motivos (v1)
export const MOTIVOS = ['pago', 'acceso', 'mejora', 'consulta', 'soporte'] as const;
export type Motivo = (typeof MOTIVOS)[number];

// Regex tolerante para teléfono (7–20 dígitos con símbolos comunes)
export const TELEFONO_REGEX = new RegExp(
  String.raw`^[+()\-\s]*\d[\d\s()\-\+]{5,18}\d$`
);

// ===== Rate limit recomendado =====
// Modelo de 2 niveles: burst (1 min) y sostenido (10 min).
export const RATE_LIMIT = Object.freeze({
  burst: { windowMinutes: 1, perIp: 3, perEmail: 2 },
  sustained: { windowMinutes: 10, perIp: 8, perEmail: 3 },
});

// ===== Turnstile =====
export const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// ===== Normalización de source =====
// Mapeos tolerantes para variantes que puedan llegar desde el cliente.
export const SOURCE_NORMALIZATION: Record<string, FormSource> = Object.freeze({
  contact: 'web_form',
  'web_form_contact': 'web_form',
  'web-form-contact': 'web_form',
  footer: 'web_form',
  'web_form_footer': 'web_form',
  newsletter: 'web_form',
  pay: 'checkout',
  payment: 'checkout',
  external: 'api',
});

// ===== Warnings estandarizados =====
// Claves que el servidor puede adjuntar en `warnings[]`.
export const WARNING_KEYS = Object.freeze({
  sourceNormalized: 'source_normalized', // se adjunta como `source_normalized:<valor>`
  truncatedField: 'truncated_field',     // `truncated_field:<nombre>`
});

// ===== Mensajes de error (ES) =====
// No incluyen datos sensibles. Preparados para i18n futuro.
export type ErrorCode =
  | 'invalid_input'
  | 'qa_forbidden'
  | 'turnstile_invalid'
  | 'rate_limited'
  | 'method_not_allowed'
  | 'payload_too_large'
  | 'server_error';

export const ERROR_MESSAGES_ES: Record<ErrorCode, string> = Object.freeze({
  invalid_input: 'Entrada inválida.',
  qa_forbidden: 'Acceso no permitido para QA.',
  turnstile_invalid: 'Verificación fallida.',
  rate_limited: 'Demasiados intentos. Intenta más tarde.',
  method_not_allowed: 'Método no permitido.',
  payload_too_large: 'El contenido es demasiado grande.',
  server_error: 'Error del servidor.',
});

// Helper simple para futuros idiomas
export function getErrorMessage(code: ErrorCode, lang: 'es' | 'en' = 'es'): string {
  if (lang === 'en') {
    const EN: Record<ErrorCode, string> = {
      invalid_input: 'Invalid input.',
      qa_forbidden: 'QA access forbidden.',
      turnstile_invalid: 'Verification failed.',
      rate_limited: 'Too many attempts. Try again later.',
      method_not_allowed: 'Method not allowed.',
      payload_too_large: 'Payload too large.',
      server_error: 'Server error.',
    };
    return EN[code];
  }
  return ERROR_MESSAGES_ES[code];
}

// ===== Logging =====
export const LOG_NAMESPACE = 'forms'; // Prefijo estable para logs estructurados

// ===== Utilidades de contrato =====
// Campos permitidos hacia la RPC (safe-list) para documentar el contrato interno.
export const RPC_SAFE_FIELDS = Object.freeze([
  'request_id',
  'type',
  'email',
  'full_name',
  'marketing_opt_in',
  'payload',
  'utm',
  'context',
  'source',
  'metadata',
] as const);
