// playground_supabase.ts
import { config } from 'dotenv';
config({ path: '.env.local' }); // carga .env.local
import { m_getSupabaseService } from './lib/supabase/m_getSupabaseService.ts';

try {
  const supabase = m_getSupabaseService();
  console.log('✅ Cliente Supabase creado correctamente');
  console.log('URL:', process.env.SUPABASE_URL);
} catch (e: any) {
  console.error('❌ Error:', e.code, e.message);
}
