// lib/stripe/f_refetchInvoice.ts
import Stripe from 'stripe';
import { m_getStripeClient } from './m_getStripeClient';

/**
 * Reobtiene una Invoice con campos expandidos para orquestar sin llamadas extra.
 * Estable en API 2024-06-20:
 * - Expande lines.data.price y price.product
 * - Incluye customer y subscription
 * @param invoiceId ID de la invoice (in_...)
 * @returns Stripe.Invoice con price/product expandidos, más customer y subscription
 */
export default async function f_refetchInvoice(invoiceId: string): Promise<Stripe.Invoice> {
  if (!invoiceId) throw new Error('INVOICE_ID_REQUIRED');

  const stripe = m_getStripeClient();

  const invoice = await stripe.invoices.retrieve(invoiceId, {
    expand: [
      'lines.data.price',
      'lines.data.price.product',
      'customer',
      'subscription',
    ],
  });

  if (!invoice || invoice.id !== invoiceId) {
    throw new Error('INVOICE_NOT_FOUND_OR_MISMATCH');
  }

  return invoice;
}
