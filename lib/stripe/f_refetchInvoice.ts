// lib/stripe/f_refetchInvoice.ts
import Stripe from 'stripe';
import { m_getStripeClient } from './m_getStripeClient';

export default async function f_refetchInvoice(invoiceId: string): Promise<Stripe.Invoice> {
  if (!invoiceId) throw new Error('INVOICE_ID_REQUIRED');

  const stripe = m_getStripeClient();

  const invoice = await stripe.invoices.retrieve(invoiceId, {
    expand: [
      'lines.data.price',
      'lines.data.price.product',
      'customer',
      'subscription',
      'payment_intent',
    ],
  });

  if (!invoice || invoice.id !== invoiceId) {
    throw new Error('INVOICE_NOT_FOUND_OR_MISMATCH');
  }

  return invoice;
}
