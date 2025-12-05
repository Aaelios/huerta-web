// lib/brevo/freeclass.ts
// Stub V1 de integración con Brevo para registros de free class.
// No envía correos reales. No crea listas. No lanza errores.
// Devuelve siempre { ok: true }. Consumido por /api/freeclass/register y, en el futuro,
// también por endpoints de forms o flujos similares.
//
// Mantener este archivo aislado permite reemplazar fácilmente la implementación
// cuando Brevo pase a V2 real (API, listas, tags, automation, etc.).

export interface BrevoFreeClassPayload {
  email: string;
  sku: string;
  instanceSlug: string | null;
  result: "registered" | "waitlist" | "rejected_closed";
}

export interface BrevoFreeClassResult {
  ok: true;
}

/**
 * Stub determinista para V1.
 * - No toca red
 * - No loggea
 * - No rechaza
 */
export async function brevoFreeClassStub(
  payload: BrevoFreeClassPayload
): Promise<BrevoFreeClassResult> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ignored = payload;
  return { ok: true };
}
