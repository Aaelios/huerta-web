import { config } from 'dotenv';
config({ path: '.env.local' });

import { f_createStripeEmbeddedSession } from './lib/checkout/f_createStripeEmbeddedSession.ts';

async function main() {
  try {
    const result = await f_createStripeEmbeddedSession({
      priceId: 'price_1S0mlNQ8dpmAG0o2JqA495nE', // reemplaza por un price_id real de tu catálogo
      returnUrl: 'https://huerta-consulting.com/gracias?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://huerta-consulting.com/cancelado',
      mode: 'payment', // o 'subscription' si ese price es de subscripción
      quantity: 1,
      // customerEmail: 'test@example.com', // opcional
      idempotencyKey: 'test-' + Date.now(), // evita sesiones duplicadas
    });

    console.log('✅ Sesión creada:');
    console.log(result);
  } catch (e: any) {
    console.error('❌ Error:', e.code || e.type || 'UNKNOWN', e.message);
  }
}

main();
