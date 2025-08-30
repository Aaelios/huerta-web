// scripts/testRefetchSession.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

import f_refetchSession from '../lib/stripe/f_refetchSession';

async function main() {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error('USO: npx tsx scripts/testRefetchSession.ts <cs_test_...>');
    process.exit(1);
  }

  try {
    const s = await f_refetchSession(sessionId);

    const email =
      (s.customer && typeof s.customer === 'object' && 'email' in s.customer
        ? (s.customer as any).email
        : null) || 'N/A';

    const li = (s as any).line_items?.data?.[0];
    const price = li?.price;
    const product = price?.product;
    const sku =
      product && typeof product === 'object'
        ? product.metadata?.sku ?? 'N/A'
        : 'N/A';

    console.log('→ OK: Checkout Session refetch');
    console.log('  id:', s.id);
    console.log('  mode:', s.mode);
    console.log('  status:', s.status);
    console.log('  customer.email:', email);
    console.log('  first_item.sku:', sku);
    process.exit(0);
  } catch (err: any) {
    console.error('ERROR refetching session:', err?.message || err);
    process.exit(2);
  }
}

main();
