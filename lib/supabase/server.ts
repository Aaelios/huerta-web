// lib/supabase/server.ts

/**
 * Cliente Supabase con Service Role para llamadas RPC internas.
 * - Solo uso en servidor. Nunca exponer la key al cliente.
 * - Reutiliza instancia simple para evitar recrearla en cada llamada.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/** Devuelve un cliente con SUPABASE_SERVICE_ROLE_KEY. Lanza si faltan envs. */
export function getServiceClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const e = new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY') as Error & { code: string };
    e.code = 'server_error';
    throw e;
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Source': 'lobra.forms' } },
  });

  return _client;
}
