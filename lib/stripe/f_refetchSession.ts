// lib/stripe/f_refetchSession.ts
import Stripe from 'stripe';
import { m_getStripeClient } from './m_getStripeClient';

/**
 * Reobtiene una Checkout Session con campos expandidos para orquestar.
 * @param sessionId ID de la sesión (cs_test_...)
 * @returns Stripe.Checkout.Session con line_items, price.product y customer expandidos
 */
export default async function f_refetchSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  if (!sessionId) throw new Error('SESSION_ID_REQUIRED');

  const stripe = m_getStripeClient();

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price.product', 'customer'],
  });

  if (!session || session.id !== sessionId) {
    throw new Error('SESSION_NOT_FOUND_OR_MISMATCH');
  }

  return session;
}
