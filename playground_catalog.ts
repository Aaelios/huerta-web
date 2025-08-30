import { config } from 'dotenv';
config({ path: '.env.local' });

import { f_callCatalogPrice } from './lib/checkout/f_callCatalogPrice.ts';

async function main() {
  try {
    const row = await f_callCatalogPrice({
      sku: 'course-rh-fin-basico-v002', // usa un SKU real de tu catálogo
      currency: 'MXN',                  // o 'USD'
    });
    console.log('✅ Precio encontrado:', row);
  } catch (e: any) {
    console.error('❌ Error:', e.code, e.message);
  }
}

main();
