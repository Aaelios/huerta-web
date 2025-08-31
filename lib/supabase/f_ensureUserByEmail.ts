// lib/supabase/f_ensureUserByEmail.ts
import { m_getSupabaseService } from "./m_getSupabaseService";

type TResult = { userId: string };

function normalizeEmail(email: string): string {
  const v = (email || "").trim().toLowerCase();
  if (!v) throw new Error("EMAIL_REQUIRED");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error("EMAIL_INVALID");
  return v;
}

/**
 * Garantiza que exista un usuario en Supabase Auth para el email dado.
 * 1) Busca vía RPC f_auth_get_user (consulta auth.users).
 * 2) Si no existe, crea con Admin API (Service Role).
 * 3) Si ya existía, lo recupera listando y filtrando por email.
 */
export default async function f_ensureUserByEmail(email: string): Promise<TResult> {
  const pEmail = normalizeEmail(email);
  const supabase = m_getSupabaseService(); // Service Role

  // 1) Intento rápido vía RPC — retorna uuid o null
  const { data: maybeUserId } = await supabase.rpc("f_auth_get_user", { p_email: pEmail });
  if (maybeUserId) return { userId: String(maybeUserId) };

  // 2) Crear con Admin API
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: pEmail,
    email_confirm: true, // no enviamos correo de confirmación en este flujo
    user_metadata: { source: "stripe_webhook" },
  });

  if (!createErr && created?.user?.id) {
    return { userId: created.user.id };
  }

  // 3) Si ya existía, listamos y filtramos por email (v2 no tiene getUserByEmail)
  const alreadyExists =
    (createErr as unknown as { status?: number })?.status === 422 ||
    String((createErr as { message?: string } | null)?.message || "")
      .toLowerCase()
      .includes("already") ||
    String((createErr as { error_description?: string } | null)?.error_description || "")
      .toLowerCase()
      .includes("already");

  if (alreadyExists) {
    const { data: listed, error: fetchErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (fetchErr) throw new Error("USER_LOOKUP_FAILED");
    const fetched =
      listed?.users?.find((u) => (u.email || "").toLowerCase() === pEmail.toLowerCase()) || null;
    if (!fetched?.id) throw new Error("USER_LOOKUP_FAILED");
    return { userId: fetched.id };
  }

  // 4) Otros errores
  const errMsg =
    (createErr as { message?: string; error_description?: string } | null)?.message ||
    (createErr as { message?: string; error_description?: string } | null)?.error_description ||
    "USER_CREATE_FAILED";
  throw new Error(errMsg);
}
