// lib/supabase/f_ensureUserByEmail.ts
import { m_getSupabaseService } from './m_getSupabaseService';

type TResult = { userId: string };

function normalizeEmail(email: string): string {
  const v = (email || '').trim().toLowerCase();
  if (!v) throw new Error('EMAIL_REQUIRED');
  // Validación mínima para evitar basura
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error('EMAIL_INVALID');
  return v;
}

/**
 * Garantiza que exista un usuario en Supabase Auth para el email dado.
 * 1) Busca vía RPC f_auth_get_user (consulta auth.users).
 * 2) Si no existe, crea con Admin API (Service Role).
 * 3) Maneja condición de carrera: si ya existe al crear, lo recupera por email.
 */
export default async function f_ensureUserByEmail(email: string): Promise<TResult> {
  const pEmail = normalizeEmail(email);
  const supabase = m_getSupabaseService(); // Debe usar SERVICE_ROLE

  // 1) Intento rápido vía RPC (PL/pgSQL) — retorna uuid o null
  const { data: maybeUserId, error: rpcErr } = await supabase.rpc('f_auth_get_user', { p_email: pEmail });

  if (rpcErr) {
    // Si falla el RPC, continuamos con Admin API como fallback
    // pero dejamos rastro en logs si tienes logger central
    // console.warn('f_auth_get_user RPC error:', rpcErr);
  } else if (maybeUserId) {
    return { userId: String(maybeUserId) };
  }

  // 2) Crear con Admin API
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: pEmail,
    email_confirm: true, // no enviamos correo de confirmación en este flujo
    user_metadata: { source: 'stripe_webhook' },
  });

  if (!createErr && created?.user?.id) {
    return { userId: created.user.id };
  }

  // 3) Condición de carrera: si ya existía, lo recuperamos
  // Supabase suele responder 422 o un mensaje de "User already registered"
  const alreadyExists =
    (createErr as any)?.status === 422 ||
    String((createErr as any)?.message || '').toLowerCase().includes('already') ||
    String((createErr as any)?.error_description || '').toLowerCase().includes('already');

  if (alreadyExists) {
    const { data: fetched, error: fetchErr } = await supabase.auth.admin.getUserByEmail(pEmail);
    if (fetchErr || !fetched?.user?.id) {
      throw new Error('USER_LOOKUP_FAILED');
    }
    return { userId: fetched.user.id };
  }

  // 4) Otros errores
  const msg =
    (createErr as any)?.message ||
    (createErr as any)?.error_description ||
    (createErr as any)?.name ||
    'USER_CREATE_FAILED';
  throw new Error(msg);
}
