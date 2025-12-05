//lib/brevo/errors.ts
// Normalización de errores provenientes del cliente HTTP de Brevo.
// - Traduce fallas de red y respuestas HTTP a BrevoHelperErrorCode.
// - Punto único de lógica para mantener consistencia en el helper Brevo.

import { BrevoHelperErrorCode } from "./types";

/* -------------------------------------------------------
 * Función principal de mapeo de errores
 * ----------------------------------------------------- */

export function mapBrevoErrorToCode(
  error: unknown,
  statusCode?: number | null,
): BrevoHelperErrorCode {
  // Log estructurado para diagnosticar la respuesta real de Brevo
  try {
    console.error(
      JSON.stringify({
        ns: "brevo_client",
        at: "api_error",
        statusCode: typeof statusCode === "number" ? statusCode : null,
        // error suele ser el body JSON devuelto por Brevo (si lo hay)
        body: error,
      }),
    );
  } catch {
    // Si por alguna razón falla el JSON.stringify, no rompemos el flujo.
  }

  // 1) Errores de red o fetch
  if (error instanceof TypeError) {
    // fetch típicamente lanza TypeError para fallas de red.
    return "network_error";
  }

  // 2) Errores HTTP si se conoce statusCode
  if (typeof statusCode === "number") {
    if (statusCode === 429) return "rate_limited";
    if (statusCode >= 500) return "api_5xx";
    if (statusCode >= 400) return "api_4xx";
  }

  // 3) Fallback defensivo
  return "api_4xx";
}


/* -------------------------------------------------------
 * Helper para validar email inválido explícito vía Brevo
 * ----------------------------------------------------- */

export function isInvalidEmailError(
  statusCode: number | null,
  brevoCode?: string | null,
): boolean {
  // Algunos proveedores devuelven códigos específicos; Brevo típicamente usa 400 + payload.
  if (statusCode === 400 && brevoCode === "invalid_email") return true;

  return false;
}
