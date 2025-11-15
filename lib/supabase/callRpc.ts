// lib/supabase/callRpc.ts
// Propósito: Helper tipado y reutilizable para invocar RPCs de Supabase con Service Role.

/* -------------------------------------------------------------------------- */
/* Imports                                                                     */
/* -------------------------------------------------------------------------- */

import type {
  PostgrestError,
  PostgrestSingleResponse,
} from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/server";

/* -------------------------------------------------------------------------- */
/* Tipos internos                                                              */
/* -------------------------------------------------------------------------- */

type RpcArgs = Record<string, unknown>;

type RpcWrappedError = Error & {
  code?: string;
  details?: string;
  hint?: string;
  rpc?: string;
};

type RpcResult<TResult> = PostgrestSingleResponse<TResult>;

/* -------------------------------------------------------------------------- */
/* Helper principal                                                            */
/* -------------------------------------------------------------------------- */

/**
 * callRpc
 * Wrapper tipado para ejecutar funciones RPC de Supabase usando Service Role.
 *
 * - No usa `any`; el tipo de salida se controla con el genérico `TResult`.
 * - Si Supabase devuelve `error`, lanza una excepción con contexto del RPC.
 * - Si Supabase devuelve `data`, lo retorna tal cual (puede ser `null` si así se tipa).
 *
 * El caller decide si `TResult` puede incluir `null`:
 *   - `callRpc<FInput, FOutput | null>(...)` para RPCs que pueden no devolver datos.
 *   - `callRpc<FInput, FOutput>(...)` cuando se espera siempre un resultado válido.
 */
export async function callRpc<TArgs extends RpcArgs, TResult>(
  functionName: string,
  args: TArgs
): Promise<TResult> {
  const client = getServiceClient();

  // No pasamos genéricos a rpc; casteamos la respuesta completa.
  const { data, error } = (await client.rpc(
    functionName,
    args
  )) as RpcResult<TResult>;

  if (error) {
    const wrapped = new Error(
      `Supabase RPC "${functionName}" failed: ${error.message}`
    ) as RpcWrappedError;

    wrapped.code = (error as PostgrestError).code ?? undefined;
    wrapped.details = error.details ?? undefined;
    wrapped.hint = error.hint ?? undefined;
    wrapped.rpc = functionName;

    throw wrapped;
  }

  return data;
}
