// scripts/testEnsureUserByEmail.ts
import { config } from 'dotenv';
config({ path: '.env.local', override: true });

import f_ensureUserByEmail from '../lib/supabase/f_ensureUserByEmail';

async function main() {
  const email = process.argv[2] || 'rhuerta.consulting@gmail.com';
  try {
    const { userId } = await f_ensureUserByEmail(email);
    console.log('→ ensureUserByEmail OK');
    console.log('  email:', email);
    console.log('  userId:', userId);
    process.exit(0);
  } catch (err: any) {
    console.error('ERROR ensureUserByEmail:', err?.message || err);
    process.exit(2);
  }
}

main();
