// lib/forms/h_validate_normalize.ts

/**
 * Normalización y safe-list para /api/forms/submit
 * - Aplica trims, lowercase de email y defaults por tipo.
 * - Normaliza `source` a catálogo y genera `warnings`.
 * - Registra `truncated_field:<name>` solo donde aplique.
 * - Construye el payload seguro para la RPC (solo campos permitidos).
 */

import {
  ALLOWED_SOURCES,
  SOURCE_NORMALIZATION,
  STRING_LIMITS,
  WARNING_KEYS,
  RPC_SAFE_FIELDS,
} from './constants';
import type { FormSource } from './constants';
import type { SubmitInput } from './schemas';
import { truncateByChars } from './schemas';

/* ===== Tipos de salida ===== */

export type NormalizedResult = {
  normalized: SubmitInput;             // shape validado por Zod ya normalizado
  source: FormSource;                  // fuente final en catálogo
  warnings: string[];                  // p. ej. ["source_normalized:web_form","truncated_field:full_name"]
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

  // 2) Source → catálogo
  const { value: source, normalized: sourceWasNormalized } = normalizeSource(input.source);
  if (sourceWasNormalized) pushWarning(warnings, WARNING_KEYS.sourceNormalized, source);

  // 3) Marketing opt-in por tipo
  let marketing_opt_in = input.marketing_opt_in;
  if (input.type === 'newsletter' && typeof marketing_opt_in !== 'boolean') {
    marketing_opt_in = true; // default para newsletter
  }

  // 4) Secciones opcionales (mantener shape si existen)
  const utm = input.utm ?? undefined;
  const context = input.context ?? undefined;
  const metadata = input.metadata ?? undefined;

  // 5) Construir objeto normalizado por rama del discriminante
  let normalized: SubmitInput;

  if (input.type === 'contact_form') {
    // `full_name` es requerido por contrato aquí; asegurar string truncado o el original trim.
    const full_name_cf =
      truncateWithWarning(warnings, 'full_name', input.full_name, STRING_LIMITS.fullNameMax) ??
      input.full_name.trim();

    const rawMsg = input.payload.message.trim(); // Zod ya valida longitudes; no truncar

    normalized = {
      ...input,
      type: 'contact_form',
      email,
      full_name: full_name_cf, // siempre string
      source,
      marketing_opt_in,
      utm,
      context,
      metadata,
      payload: { message: rawMsg },
    };
  } else {
    // newsletter: full_name es opcional
    const full_name_nl =
      typeof (input as any).full_name === 'string'
        ? truncateWithWarning(warnings, 'full_name', (input as any).full_name, STRING_LIMITS.fullNameMax)
        : undefined;

    normalized = {
      ...input,
      type: 'newsletter',
      email,
      ...(typeof full_name_nl !== 'undefined' ? { full_name: full_name_nl } : {}),
      source,
      marketing_opt_in,
      utm,
      context,
      metadata,
      ...(typeof input.payload !== 'undefined' ? { payload: input.payload } : {}),
    };
  }

  // 6) Safe-list hacia RPC
  const rpcPayload: Record<string, unknown> = {};
  const normIndex = normalized as unknown as Record<string, unknown>;
  for (const key of RPC_SAFE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(normIndex, key) && typeof normIndex[key as string] !== 'undefined') {
      rpcPayload[key as string] = normIndex[key as string];
    }
  }

  return { normalized, source, warnings, rpcPayload };
}
