// scripts/testRefetchInvoice.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

import f_refetchInvoice from '../lib/stripe/f_refetchInvoice';

async function main() {
  const invoiceId = process.argv[2];
  if (!invoiceId) {
    console.error('USO: npx tsx scripts/testRefetchInvoice.ts <in_test_...>');
    process.exit(1);
  }

  try {
    const inv = await f_refetchInvoice(invoiceId);

    const customerEmail =
      (inv.customer && typeof inv.customer === 'object' && 'email' in inv.customer
        ? (inv.customer as any).email
        : null) || 'N/A';

    const subId =
      (inv.subscription && typeof inv.subscription === 'object'
        ? (inv.subscription as any).id
        : typeof inv.subscription === 'string'
        ? inv.subscription
        : 'N/A') || 'N/A';

    const line = inv.lines?.data?.[0];
    const price = line?.price;
    const product = price?.product;
    const sku =
      product && typeof product === 'object'
        ? (product as any).metadata?.sku ?? 'N/A'
        : 'N/A';

    console.log('→ OK: Invoice refetch');
    console.log('  id:', inv.id);
    console.log('  status:', inv.status);
    console.log('  customer.email:', customerEmail);
    console.log('  subscription.id:', subId);
    console.log('  first_item.sku:', sku);
    console.log('  amount_due_cents:', inv.amount_due ?? 'N/A');
    process.exit(0);
  } catch (err: any) {
    console.error('ERROR refetching invoice:', err?.message || err);
    process.exit(2);
  }
}

main();
