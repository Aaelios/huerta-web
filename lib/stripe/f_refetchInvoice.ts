// lib/stripe/f_refetchInvoice.ts
import Stripe from 'stripe';
import { m_getStripeClient } from './m_getStripeClient';

/**
 * Reobtiene una Invoice con campos expandidos para orquestación.
 * Canon: priorizar price.metadata; fallback vía product.metadata.
 * Compatible con estructuras antiguas (price) y nuevas (pricing.price).
 */
export default async function f_refetchInvoice(invoiceId: string): Promise<Stripe.Invoice> {
  if (!invoiceId) throw new Error('INVOICE_ID_REQUIRED');

  const stripe = m_getStripeClient();

  const invoice = await stripe.invoices.retrieve(invoiceId, {
    expand: [
      // Antiguo
      'lines.data.price',
      'lines.data.price.product',
      // Nuevo (2025-07-30.basil)
      'lines.data.pricing.price',
      'lines.data.pricing.price.product',
      // Contexto
      'customer',
      'subscription',
    ],
  });

  if (!invoice || invoice.id !== invoiceId) {
    throw new Error('INVOICE_NOT_FOUND_OR_MISMATCH');
  }

  return invoice;
}
