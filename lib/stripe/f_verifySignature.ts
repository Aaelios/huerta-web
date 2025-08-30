// lib/stripe/f_verifySignature.ts
import type Stripe from "stripe";
import { m_getStripeClient } from "./m_getStripeClient";

export class SignatureVerificationError extends Error {
  statusCode = 400;
  code = "STRIPE_SIGNATURE_VERIFICATION_FAILED";
  constructor(message = "Invalid Stripe webhook signature") {
    super(message);
    this.name = "SignatureVerificationError";
  }
}

export function f_verifySignature(
  rawBody: Buffer | string,
  signatureHeader: string | null
): Stripe.Event {
  if (!signatureHeader) {
    throw new SignatureVerificationError("Missing Stripe-Signature header");
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    // Config error: tratamos como 500 en la ruta
    const e = new Error("Missing STRIPE_WEBHOOK_SECRET env");
    (e as any).statusCode = 500;
    (e as any).code = "MISSING_WEBHOOK_SECRET";
    throw e;
  }

  // Stripe SDK usa tolerancia por defecto de 300s.
  // Si en el futuro deseas cambiarla, podemos usar la API de verificación avanzada.
  const stripe = m_getStripeClient();
  const payload =
    typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");

  try {
    const event = stripe.webhooks.constructEvent(payload, signatureHeader, secret);
    return event;
  } catch (err: any) {
    // Mapear a 400 para no solicitar reintento a Stripe en caso de firma inválida
    throw new SignatureVerificationError(err?.message || "Signature verification failed");
  }
}
