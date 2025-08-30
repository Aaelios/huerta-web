// lib/supabase/m_getSupabaseService.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * m_getSupabaseService
 * Singleton server-only para usar Supabase con Service Role.
 * Requiere env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
let _svc: SupabaseClient | null = null;

export function m_getSupabaseService(): SupabaseClient {
  if (typeof window !== 'undefined') {
    const err: any = new Error('Supabase Service Role is server-only');
    err.code = 'SERVER_ONLY';
    throw err;
  }

  if (_svc) return _svc;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const err: any = new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    err.code = 'CONFIG_ERROR';
    throw err;
  }

  _svc = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'huerta-web:service-role',
      },
    },
  });

  return _svc;
}
