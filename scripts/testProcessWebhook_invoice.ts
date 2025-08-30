// scripts/testProcessWebhook_invoice.ts
import { config } from 'dotenv';
config({ path: '.env.local', override: true });

// Endurecer promesas no manejadas
process.on('unhandledRejection', (err: any) => {
  console.error('UNHANDLED REJECTION:', err?.stack || err);
  process.exit(3);
});

import f_refetchInvoice from '../lib/stripe/f_refetchInvoice';

async function loadOrchestrator() {
  const mod = await import('../lib/orch/h_stripe_webhook_process');
  const fn = (mod as any).default ?? (mod as any).h_stripe_webhook_process;
  if (typeof fn !== 'function') {
    console.error('Export inválido desde h_stripe_webhook_process. Keys:', Object.keys(mod));
    throw new Error('ORCH_EXPORT_NOT_FUNCTION');
  }
  return fn as (args: {
    type: string;
    stripeEventId: string;
    invoice?: any;
    session?: any;
  }) => Promise<{ outcome: string; details?: any; reason?: string }>;
}

function preflightEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    throw new Error('ENV_MISSING: SUPABASE_URL o SERVICE_ROLE_KEY no están cargados');
  }
  console.log('ENV OK →', url, key.slice(0, 6));
}

async function main() {
  const invoiceId = process.argv[2];
  const stripeEventId = process.argv[3] || 'evt_test_local_' + Date.now();
  if (!invoiceId) {
    console.error('USO: npx tsx scripts/testProcessWebhook_invoice.ts <in_test_...> [evt_...]');
    process.exit(1);
  }

  try {
    preflightEnv();

    const invoice = await f_refetchInvoice(invoiceId);
    if (!invoice || !invoice.id) throw new Error('INVOICE_NOT_FOUND');
    if (invoice.id !== invoiceId) throw new Error(`INVOICE_MISMATCH: ${invoice.id} !== ${invoiceId}`);

    // Logs mínimos para aislar parseo
    console.log('INVOICE →', {
      id: invoice.id,
      customer: invoice.customer || invoice?.customer_details?.id || null,
      amount_paid: invoice.amount_paid ?? null,
      total: invoice.total ?? null,
      currency: invoice.currency ?? null,
    });

    const h_stripe_webhook_process = await loadOrchestrator();
    const res = await h_stripe_webhook_process({
      type: 'invoice.payment_succeeded',
      stripeEventId,
      invoice,
    });

    console.log('→ h_stripe_webhook_process OK');
    console.log('  outcome:', res.outcome);
    if (res.outcome === 'processed') console.log('  details:', res.details || null);
    else console.log('  reason:', res.reason || 'N/A');
    process.exit(res.outcome === 'processed' ? 0 : 4);
  } catch (err: any) {
    console.error('ERROR processing invoice:', err?.stack || err?.message || err);
    process.exit(2);
  }
}

main();
