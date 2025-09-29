// lib/forms/h_validate_normalize.ts

/**
 * Normalización y safe-list para /api/forms/submit
 * - Aplica trims, lowercase de email y defaults por tipo.
 * - Normaliza `source` a catálogo y genera `warnings`.
 * - Trunca strings largos y registra `truncated_field:<name>`.
 * - Construye el payload seguro para la RPC (solo campos permitidos).
 */

import {
  ALLOWED_SOURCES,
  SOURCE_NORMALIZATION,
  STRING_LIMITS,
  MAX_MESSAGE_BYTES,
  WARNING_KEYS,
  RPC_SAFE_FIELDS,
} from './constants';
import type { FormSource } from './constants';
import type { SubmitInput } from './schemas';
import { byteSize, truncateByChars } from './schemas';

/* ===== Tipos de salida ===== */

export type NormalizedResult = {
  normalized: SubmitInput;             // shape validado por Zod ya normalizado
  source: FormSource;                  // fuente final en catálogo
  warnings: string[];                  // p. ej. ["source_normalized:web_form_contact","truncated_field:full_name"]
  rpcPayload: Record<string, unknown>; // safe-list para f_orch_contact_write
};

/* ===== Utilidades internas ===== */

/** Normaliza el `source` a uno del catálogo permitido. */
function normalizeSource(original: string): { value: FormSource; normalized: boolean } {
  if ((ALLOWED_SOURCES as readonly string[]).includes(original)) {
    return { value: original as FormSource, normalized: false };
  }
  const mapped = SOURCE_NORMALIZATION[original];
  if (mapped) return { value: mapped, normalized: true };
  // Fallback defensivo
  return { value: 'api', normalized: true };
}

/** Inserta warning con clave fija y valor dinámico. */
function pushWarning(warnings: string[], key: string, value: string) {
  warnings.push(`${key}:${value}`);
}

/** Trunca string si excede `maxChars` y agrega warning. */
function truncateWithWarning(
  warnings: string[],
  fieldName: string,
  value: string | undefined,
  maxChars: number,
): string | undefined {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  const { value: out, truncated } = truncateByChars(trimmed, maxChars);
  if (truncated) pushWarning(warnings, WARNING_KEYS.truncatedField, fieldName);
  return out;
}

/* ===== Normalizador principal ===== */

export function h_validate_normalize(input: SubmitInput): NormalizedResult {
  const warnings: string[] = [];

  // 1) Email a lowercase + trim
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : input.email;

  // 2) Full name truncado
  const full_name = truncateWithWarning(warnings, 'full_name', input.full_name, STRING_LIMITS.fullNameMax);

  // 3) Source → catálogo
  const { value: source, normalized: sourceWasNormalized } = normalizeSource(input.source);
  if (sourceWasNormalized) pushWarning(warnings, WARNING_KEYS.sourceNormalized, source);

  // 4) Marketing opt-in por tipo
  let marketing_opt_in = input.marketing_opt_in;
  if (input.type === 'newsletter' && typeof marketing_opt_in !== 'boolean') {
    marketing_opt_in = true; // default para newsletter
  }

  // 5) Secciones opcionales (mantener shape si existen)
  const utm = input.utm ?? undefined;
  const context = input.context ?? undefined;
  const metadata = input.metadata ?? undefined;

  // 6) Construir objeto normalizado por rama del discriminante para satisfacer el tipo
  let normalized: SubmitInput;

  if (input.type === 'contact') {
    // Sanitizar y reforzar tamaño de message
    const rawMsg = (input.payload as { message: string }).message?.trim();
    let finalMsg = rawMsg;

    if (byteSize(rawMsg) > MAX_MESSAGE_BYTES) {
      // Heurística segura para evitar desbordes por multibyte
      const approxChars = Math.max(1, Math.floor(MAX_MESSAGE_BYTES / 2));
      finalMsg = truncateByChars(rawMsg, approxChars).value;
      pushWarning(warnings, WARNING_KEYS.truncatedField, 'payload.message');
    }

    normalized = {
      ...input,
      type: 'contact',
      email,
      full_name,
      source,
      marketing_opt_in,
      utm,
      context,
      metadata,
      payload: { message: finalMsg },
    };
  } else {
    // newsletter: payload es opcional y de tipo unknown
    normalized = {
      ...input,
      type: 'newsletter',
      email,
      full_name,
      source,
      marketing_opt_in,
      utm,
      context,
      metadata,
      // payload se preserva tal cual si vino definido
      ...(typeof input.payload !== 'undefined' ? { payload: input.payload } : {}),
    };
  }

  // 7) Safe-list hacia RPC
  const rpcPayload: Record<string, unknown> = {};
  const normIndex = normalized as unknown as Record<string, unknown>;
  for (const key of RPC_SAFE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(normIndex, key) && typeof normIndex[key as string] !== 'undefined') {
      rpcPayload[key as string] = normIndex[key as string];
    }
  }

  return { normalized, source, warnings, rpcPayload };
}
