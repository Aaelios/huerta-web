// lib/orch/h_call_orch_contact_write.ts

/**
 * Orquestador de llamada a la RPC principal f_orch_contact_write
 * - Usa firma confirmada: f_orch_contact_write(p_input jsonb)
 * - Mapea respuesta a shape estable para el endpoint.
 */

import { getServiceClient } from '../supabase/server';

type RpcInput = Record<string, unknown>;

type RpcResponse = {
  status: 'ok' | 'duplicate' | 'error';
  contact?: { id?: string; email?: string; consent_status?: string | null } | null;
  message?: { id?: string } | null;
  subscription_event?: { id?: string | null; event_type?: string | null } | null;
  submission_id?: string;
  version?: string;
  warnings?: string[] | null;
} | null;

export type OrchResult =
  | {
      ok: true;
      status: 'ok' | 'duplicate';
      submission_id: string;
      contact_id?: string;
      message_id?: string;
      warnings: string[];
      latencyMs: number;
    }
  | {
      ok: false;
      code: 'db_error' | 'server_error';
      message: string;
      latencyMs: number;
    };

/**
 * Llama la RPC y devuelve un resultado mapeado y determinista.
 * Errores se devuelven en forma controlada; el endpoint decide el HTTP code.
 */
export async function h_call_orch_contact_write(rpcPayload: RpcInput): Promise<OrchResult> {
  const start = Date.now();
  try {
    const supabase = getServiceClient();

    // Firma confirmada: parámetro se llama v_input
    const { data, error } = await supabase.rpc('f_orch_contact_write', { p_input: rpcPayload });

    const latencyMs = Date.now() - start;

    if (error) {
      return { ok: false, code: 'db_error', message: error.message || 'RPC error', latencyMs };
    }

    if (!data || !('status' in (data as any)) || !(data as any).status) {
      return { ok: false, code: 'db_error', message: 'Invalid RPC response', latencyMs };
    }

    const resp = data as RpcResponse;

    if (resp?.status === 'ok' || resp?.status === 'duplicate') {
      return {
        ok: true,
        status: resp.status,
        submission_id: resp.submission_id || (rpcPayload.request_id as string),
        contact_id: resp.contact?.id || undefined,
        message_id: resp.message?.id || undefined,
        warnings: resp.warnings || [],
        latencyMs,
      };
    }

    return { ok: false, code: 'db_error', message: 'RPC returned error status', latencyMs };
  } catch (e: any) {
    const latencyMs = Date.now() - start;
    const msg = typeof e?.message === 'string' ? e.message : 'RPC exception';
    return { ok: false, code: (e?.code as 'server_error') || 'server_error', message: msg, latencyMs };
  }
}
