// scripts/debugPaymentBoth.ts
import { config } from 'dotenv';
config({ path: '.env.local', override: true });

import f_refetchInvoice from '../lib/stripe/f_refetchInvoice';
import { m_getSupabaseService } from '../lib/supabase/m_getSupabaseService';

async function main() {
  const invoiceId = process.argv[2];
  const stripeEventId = process.argv[3] || 'evt_test_local_' + Date.now();

  if (!invoiceId) {
    console.error('USO: npx tsx scripts/debugPaymentBoth.ts <in_test_...> [evt_...]');
    process.exit(1);
  }

  try {
    const invoice = await f_refetchInvoice(invoiceId);

    const session_payload = {
      stripe_event_id: stripeEventId,
      type: 'invoice.payment_succeeded',
      data: { object: invoice as any },
    };

    const supabase = m_getSupabaseService();
    const { data, error } = await supabase.rpc('f_debug_orders_payment_both', { session_payload });

    if (error) {
      console.error('RPC ERROR:', {
        message: (error as any).message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
      });
      process.exit(2);
    }

    // data es un array con una fila
    console.log('↳ f_debug_orders_payment_both:');
    console.table(data);
    process.exit(0);
  } catch (e: any) {
    console.error('ERROR:', e?.message || e);
    process.exit(2);
  }
}

main();
