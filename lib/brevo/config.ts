// lib/brevo/config.ts
// Configuración de entorno para el cliente Brevo.
// - Expone endpoint, API key y masterListId según entorno Next.js.
// - Evita hardcode y centraliza la selección de PROD vs NONPROD.

type BrevoConfig = {
  apiKey: string;
  endpoint: string;
  masterListId: number | null;
};

// Endpoints oficiales Brevo (v3 SMTP/API real).
const BREVO_BASE_URL = "https://api.brevo.com/v3";

// Deducción estricta de entorno productivo.
function isProdEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Obtiene configuración segura para el cliente Brevo.
 * Un programador experto lo escanea rápido: retorna API key + endpoint + masterListId.
 */
export function getBrevoConfig(): BrevoConfig {
  const apiKey = isProdEnv()
    ? process.env.BREVO_API_KEY_PROD
    : process.env.BREVO_API_KEY_NONPROD;

  if (!apiKey) {
    throw new Error("Missing Brevo API key for current environment.");
  }

  const rawMasterListId = process.env.BREVO_MASTER_LIST_ID;
  const masterListIdParsed =
    typeof rawMasterListId === "string" && rawMasterListId.trim().length > 0
      ? Number(rawMasterListId.trim())
      : NaN;

  const masterListId = Number.isFinite(masterListIdParsed)
    ? masterListIdParsed
    : null;

  return {
    apiKey,
    endpoint: BREVO_BASE_URL,
    masterListId,
  };
}
