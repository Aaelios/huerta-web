// Dev route para inspeccionar un contacto en Brevo (tags, listas, JSON crudo).
// Uso: /api/dev/brevo-check-contact?email=clasegratis@correo.com

import { NextRequest, NextResponse } from "next/server";

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";

type BrevoContact = {
  id: number;
  email: string;
  emailBlacklisted: boolean;
  smsBlacklisted: boolean;
  createdAt?: string;
  modifiedAt?: string;
  listIds?: number[];
  unlinkListIds?: number[];
  attributes?: Record<string, unknown>;
  tags?: string[];
};

type BrevoErrorResponse = {
  code?: string;
  message?: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Extrae email desde querystring; usa uno por defecto si no se pasa.
  const { searchParams } = new URL(request.url);
  const emailParam = searchParams.get("email") ?? "clasegratis@correo.com";

  // Lee API key NONPROD desde entorno local (no uses esta ruta en prod).
  const apiKey = process.env.BREVO_API_KEY_NONPROD;
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_api_key",
        message:
          "BREVO_API_KEY_NONPROD no está configurada en el entorno de ejecución.",
      },
      { status: 500 },
    );
  }

  const encodedEmail = encodeURIComponent(emailParam);

  let brevoResponse: Response;
  try {
    brevoResponse = await fetch(`${BREVO_API_URL}/${encodedEmail}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
      },
    });
  } catch (error) {
    // Nivel experto: este bloque captura errores de red o DNS, no errores 4xx/5xx de Brevo.
    return NextResponse.json(
      {
        ok: false,
        error: "network_error",
        message: "Error de red al llamar a la API de Brevo.",
        details: String(error),
      },
      { status: 502 },
    );
  }

  const status = brevoResponse.status;
  const text = await brevoResponse.text();

  // Intenta parsear la respuesta como JSON, pero no confíes ciegamente.
  let parsed: BrevoContact | BrevoErrorResponse | null = null;
  try {
    parsed = text ? (JSON.parse(text) as BrevoContact | BrevoErrorResponse) : null;
  } catch {
    // Nivel experto: si Brevo devolviera HTML u otro formato, devolvemos el raw.
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json",
        status,
        raw: text,
      },
      { status: status >= 400 ? status : 500 },
    );
  }

  if (!brevoResponse.ok) {
    const errorBody = parsed as BrevoErrorResponse;
    return NextResponse.json(
      {
        ok: false,
        error: "brevo_4xx_5xx",
        status,
        brevo_code: errorBody.code ?? null,
        brevo_message: errorBody.message ?? null,
        raw: parsed,
      },
      { status },
    );
  }

  const contact = parsed as BrevoContact;

  // Resumen útil para debugging: tags, listas y metadata clave.
  return NextResponse.json(
    {
      ok: true,
      email: contact.email,
      contact_id: contact.id,
      list_ids: contact.listIds ?? [],
      tags: contact.tags ?? [],
      emailBlacklisted: contact.emailBlacklisted,
      smsBlacklisted: contact.smsBlacklisted,
      createdAt: contact.createdAt ?? null,
      modifiedAt: contact.modifiedAt ?? null,
      // Nivel experto: incluye el JSON completo para inspección avanzada en dev tools.
      raw: contact,
    },
    { status: 200 },
  );
}
