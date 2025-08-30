import { config } from 'dotenv';
config({ path: '.env.local' });

import { m_getStripeClient } from './lib/stripe/m_getStripeClient.ts';

async function main() {
  try {
    const stripe = m_getStripeClient();

    // Llamada de prueba muy ligera: lista 1 precio
    const prices = await stripe.prices.list({ limit: 1 });

    console.log('✅ Cliente Stripe creado correctamente');
    console.log('Ejemplo de price:', prices.data[0]?.id, prices.data[0]?.currency);
  } catch (e: any) {
    console.error('❌ Error:', e.code || e.type || 'UNKNOWN', e.message);
  }
}

main();
