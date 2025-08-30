// scripts/debugParsePayment.ts
import { config } from 'dotenv';
config({ path: '.env.local', override: true });

import f_refetchInvoice from '../lib/stripe/f_refetchInvoice';
import { m_getSupabaseService } from '../lib/supabase/m_getSupabaseService';

async function main() {
  const invoiceId = process.argv[2];
  if (!invoiceId) {
    console.error('USO: npx tsx scripts/debugParsePayment.ts <in_test_...>');
    process.exit(1);
  }

  try {
    const invoice = await f_refetchInvoice(invoiceId);

    const probe = {
      amount_total: (invoice as any).amount_total ?? null,
      amount_paid: invoice.amount_paid ?? null,
      total: invoice.total ?? null,
      amount_due: invoice.amount_due ?? null,
      subtotal: invoice.subtotal ?? null,
      currency: invoice.currency ?? null,
      line0_amount: invoice.lines?.data?.[0]?.amount ?? null,
      line0_amount_total: (invoice as any).lines?.data?.[0]?.amount_total ?? null,
      line0_currency: invoice.lines?.data?.[0]?.currency ?? null,
      line0_price_currency: (invoice as any).lines?.data?.[0]?.price?.currency ?? null,
      line0_unit_amount_decimal:
        (invoice as any).lines?.data?.[0]?.pricing?.price_details?.unit_amount_decimal ?? null,
      line0_quantity: invoice.lines?.data?.[0]?.quantity ?? null,
    };
    console.log('→ Probe:', probe);

    const supabase = m_getSupabaseService();
    const { data, error } = await supabase.rpc('f_orders_parse_payment', { p_obj: invoice as any });

    if (error) {
      console.error('RPC ERROR:', error.message || error);
      process.exit(2);
    }

    console.log('RPC RESULT:', data);
    process.exit(0);
  } catch (e: any) {
    console.error('ERROR:', e?.message || e);
    process.exit(2);
  }
}

main();
