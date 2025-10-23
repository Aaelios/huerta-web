// /lib/format.ts
/**
 * Módulo — Utilidades de Formato (Infra común)
 * Funciones determinísticas y puras para precio y fechas próximas.
 * No renderiza UI, no toca rutas. Compatible con Next.js 15.5 y ESLint (TS/ESM).
 *
 * Regla base: “proveer datos, no mostrarlos”.
 */

import type { IsoUtcString } from '@/lib/dto/catalog';

/* ============================================================================
 * Bloque A — formatPriceMXN
 * Objetivo: Formatear centavos MXN a string legible en es-MX.
 * Entradas: número de centavos o null.
 * Salida: string como "$1,234.00" o "" si no hay precio.
 * ========================================================================== */

export function formatPriceMXN(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return '';
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
      cents / 100
    );
  } catch {
    // Fallback simple en caso de entornos sin Intl completo
    const n = Math.round(Number(cents)) / 100;
    return `$${n.toFixed(2)}`;
  }
}

/* ============================================================================
 * Bloque B — resolveNextStartAt
 * Objetivo: Proveer un valor seguro para "próxima fecha".
 * - value: ISO UTC o null (para lógica aguas arriba).
 * - label: string para uso directo en UI cuando no exista fecha ("Próximamente").
 * Nota: mantiene separación de datos (value) y presentación mínima (label).
 * ========================================================================== */

export function resolveNextStartAt(
  iso: IsoUtcString | null | undefined,
  opts?: { fallbackLabel?: string }
): { value: IsoUtcString | null; label: string } {
  const fallback = opts?.fallbackLabel ?? 'Próximamente';

  if (!iso || typeof iso !== 'string' || iso.length < 10) {
    return { value: null, label: fallback };
  }

  // Validación laxa a ISO y normalización a toISOString() para estabilidad
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { value: null, label: fallback };
  }

  // Devolvemos el ISO normalizado (UTC); la UI decide cómo formatearlo.
  return { value: d.toISOString() as IsoUtcString, label: '' };
}
