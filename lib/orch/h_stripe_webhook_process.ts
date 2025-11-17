// lib/orch/h_stripe_webhook_process.ts
import Stripe from "stripe";
import { m_getSupabaseService } from "../supabase/m_getSupabaseService";
import f_ensureUserByEmail from "../supabase/f_ensureUserByEmail";

//
// Nuevos tipos
//
type TStripeWebhookInput = {
  type: string;
  stripeEventId: string;
  session?: Stripe.Checkout.Session;
  invoice?: Stripe.Invoice;
  payment_intent?: Stripe.PaymentIntent;
};

type TStripeWebhookResult =
  | { outcome: "processed"; details?: Record<string, any> }
  | { outcome: "ignored"; reason: string; details?: Record<string, any> }
  | { outcome: "error_transient"; reason: string; details?: Record<string, any> }
  | { outcome: "error_fatal"; reason: string; details?: Record<string, any> };

//
// Utilidades
//
function getEmail(input: TStripeWebhookInput): string | null {
  const { session, invoice, payment_intent } = input;

  if (session) {
    if (typeof session.customer === "object" && (session.customer as any)?.email) {
      return (session.customer as any).email as string;
    }
    const cd = (session as any).customer_details;
    if (cd?.email) return cd.email as string;
  }

  if (invoice) {
    if (typeof invoice.customer === "object" && (invoice.customer as any)?.email) {
      return (invoice.customer as any).email as string;
    }
    if (invoice.customer_email) return invoice.customer_email;
  }

  if (payment_intent) {
    const piAny = payment_intent as any;
    if (piAny?.receipt_email) return piAny.receipt_email as string;
    const ch = piAny?.charges?.data?.[0];
    const be = ch?.billing_details?.email as string | undefined;
    if (be) return be;
  }

  return null;
}

function extractPriceIds(input: TStripeWebhookInput): string[] {
  const ids: string[] = [];
  const { session, invoice } = input;

  if (session) {
    const data: any[] = ((session as any).line_items?.data ?? []) as any[];
    for (const it of data) {
      const idA = it?.price?.id;
      const idB = it?.pricing?.price_details?.price;
      const pid =
        typeof idA === "string" && idA
          ? idA
          : typeof idB === "string" && idB
          ? idB
          : null;
      if (pid) ids.push(pid);
    }
  }

  if (invoice) {
    const data: any[] = ((invoice as any).lines?.data ?? []) as any[];
    for (const ln of data) {
      const idA = ln?.price?.id;
      const idB = ln?.pricing?.price_details?.price;
      const pid =
        typeof idA === "string" && idA
          ? idA
          : typeof idB === "string" && idB
          ? idB
          : null;
      if (pid) ids.push(pid);
    }
  }

  return ids;
}

function hasPricePath(obj: any): { expanded: boolean; compact: boolean } {
  const li = obj?.line_items?.data?.[0] ?? obj?.lines?.data?.[0] ?? null;
  return {
    expanded: Boolean(li?.price?.id),
    compact: Boolean(li?.pricing?.price_details?.price),
  };
}

//
// Handlers v2
//
async function handleCheckoutSessionCompleted_v2(
  input: TStripeWebhookInput,
  email: string
): Promise<TStripeWebhookResult> {
  const { stripeEventId, session } = input;

  if (!session) {
    return { outcome: "error_fatal", reason: "MISSING_SESSION_OBJECT" };
  }

  //
  // 1) Usuario
  //
  try {
    await f_ensureUserByEmail(email);
  } catch (e: any) {
    const kind = e?.kind;
    const reason = e?.reason || "AUTH_UNKNOWN";

    if (kind === "transient_error") {
      return {
        outcome: "error_transient",
        reason: "AUTH_TRANSIENT",
        details: { email, error: reason },
      };
    }

    return {
      outcome: "error_fatal",
      reason: "AUTH_FATAL",
      details: { email, error: reason },
    };
  }

  //
  // 2) Validar expansiones
  //
  const ok = Array.isArray((session as any)?.line_items?.data);
  const flags = hasPricePath(session);
  if (!ok || !(flags.expanded || flags.compact)) {
    return {
      outcome: "error_fatal",
      reason: "MISSING_EXPANSIONS",
      details: {
        need: ["line_items.data.price OR line_items.data.pricing.price_details.price"],
      },
    };
  }

  //
  // 3) Payload
  //
  const priceIds = extractPriceIds(input);

  const session_payload = {
    stripe_event_id: stripeEventId,
    type: "checkout.session.completed",
    data: {
      object: session,
      debug: {
        email,
        price_ids: priceIds,
        flags,
      },
    },
  };

  //
  // 4) RPC
  //
  const supabase = m_getSupabaseService();
  try {
    const { data: orderId } = await supabase.rpc("f_orch_orders_upsert", {
      session_payload,
    });

    return {
      outcome: "processed",
      details: { type: input.type, orderId, priceIds },
    };
  } catch (dbError: any) {
    return {
      outcome: "error_transient",
      reason: "ORCH_UPSERT_FAILED",
      details: { message: dbError.message },
    };
  }
}

async function handleInvoicePaymentSucceeded_v2(
  input: TStripeWebhookInput,
  email: string
): Promise<TStripeWebhookResult> {
  const { stripeEventId, invoice } = input;

  if (!invoice) {
    return { outcome: "error_fatal", reason: "MISSING_INVOICE_OBJECT" };
  }

  //
  // 1) Usuario
  //
  try {
    await f_ensureUserByEmail(email);
  } catch (e: any) {
    const kind = e?.kind;
    const reason = e?.reason || "AUTH_UNKNOWN";

    if (kind === "transient_error") {
      return {
        outcome: "error_transient",
        reason: "AUTH_TRANSIENT",
        details: { email, error: reason },
      };
    }

    return {
      outcome: "error_fatal",
      reason: "AUTH_FATAL",
      details: { email, error: reason },
    };
  }

  //
  // 2) Validar expansiones
  //
  const ok = Array.isArray((invoice as any)?.lines?.data);
  const flags = hasPricePath(invoice);
  if (!ok || !(flags.expanded || flags.compact)) {
    return {
      outcome: "error_fatal",
      reason: "MISSING_EXPANSIONS",
      details: {
        need: ["lines.data.price OR lines.data.pricing.price_details.price"],
      },
    };
  }

  //
  // 3) Payload
  //
  const priceIds = extractPriceIds(input);

  const session_payload = {
    stripe_event_id: stripeEventId,
    type: "invoice.payment_succeeded",
    data: {
      object: invoice,
      debug: {
        email,
        price_ids: priceIds,
        flags,
      },
    },
  };

  //
  // 4) RPC
  //
  const supabase = m_getSupabaseService();
  try {
    const { data: orderId } = await supabase.rpc("f_orch_orders_upsert", {
      session_payload,
    });

    return {
      outcome: "processed",
      details: { type: input.type, orderId, priceIds },
    };
  } catch (dbError: any) {
    return {
      outcome: "error_transient",
      reason: "ORCH_UPSERT_FAILED",
      details: { message: dbError.message },
    };
  }
}

async function handlePaymentIntentSucceeded_v2(
  input: TStripeWebhookInput
): Promise<TStripeWebhookResult> {
  const { session, payment_intent } = input;

  if (!session || !payment_intent) {
    return {
      outcome: "error_fatal",
      reason: "MISSING_SESSION_OR_PI",
    };
  }

  const supabase = m_getSupabaseService();

  try {
    const { data } = await supabase.rpc("f_payments_upsert_by_session", {
      p_payment_intent: payment_intent as any,
      p_session: session as any,
      p_order_id: null,
    });

    const row = Array.isArray(data) ? data[0] : data;
    const paymentId = row?.payment_id ?? row?.paymentId ?? null;
    const orderId = row?.order_id ?? row?.orderId ?? null;

    return {
      outcome: "processed",
      details: {
        type: input.type,
        paymentId,
        orderId,
        pi_id: payment_intent.id,
      },
    };
  } catch (dbError: any) {
    const msg = dbError?.message || "";

    if (msg.includes("USER_NOT_FOUND_FROM_SESSION")) {
      return {
        outcome: "error_transient",
        reason: "USER_NOT_FOUND_FROM_SESSION",
        details: { message: dbError.message },
      };
    }

    return {
      outcome: "error_transient",
      reason: "PAYMENTS_UPSERT_BY_SESSION_FAILED",
      details: { message: dbError.message },
    };
  }
}

//
// Orquestador principal v2
//
export default async function h_stripe_webhook_process(
  input: TStripeWebhookInput
): Promise<TStripeWebhookResult> {
  const { type } = input;

  const supported = new Set([
    "checkout.session.completed",
    "invoice.payment_succeeded",
    "payment_intent.succeeded",
  ]);

  if (!supported.has(type)) {
    return { outcome: "ignored", reason: "UNHANDLED_EVENT_TYPE" };
  }

  const email = getEmail(input);

  if (type !== "payment_intent.succeeded" && !email) {
    return { outcome: "error_fatal", reason: "MISSING_EMAIL" };
  }

  if (type === "payment_intent.succeeded") {
    return handlePaymentIntentSucceeded_v2(input);
  }

  if (type === "checkout.session.completed") {
    return handleCheckoutSessionCompleted_v2(input, email!);
  }

  if (type === "invoice.payment_succeeded") {
    return handleInvoicePaymentSucceeded_v2(input, email!);
  }

  return { outcome: "ignored", reason: "UNREACHABLE" };
}