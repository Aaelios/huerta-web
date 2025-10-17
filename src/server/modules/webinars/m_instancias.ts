// src/server/modules/webinars/m_instancias.ts

/**
 * Módulo B — m_instancias
 * Obtiene próxima instancia y futuras por SKU mediante la RPC segura
 * public.f_webinars_resumen(sku, max). Sin exponer campos sensibles.
 * Compatible con Next.js 15.5 y ESLint (TS/ESM). Server-only.
 */

/* Tipos locales. Si ya tienes un types.ts central, podemos moverlos ahí después. */
export interface InstanciaItem {
  instance_slug: string;
  start_at: string; // ISO8601 UTC
}

export interface InstanciaResumen {
  next_start_at: string | null; // ISO8601 UTC
  /** Nuevo: slug de la próxima instancia si existe */
  next_instance_slug: string | null;
  instance_count_upcoming: number;
  future_instances: InstanciaItem[];
  timezone: string; // p.ej. 'America/Mexico_City'
}

/* Contrato mínimo que esperamos del cliente de Supabase para invocar RPC. */
export interface SupabaseRpcClient {
  rpc<T = unknown>(
    fn: string,
    args?: Record<string, unknown>
  ): Promise<{ data: T | null; error: { message: string } | null }>;
}

/* Respuesta cruda esperada desde f_webinars_resumen. */
interface RawResumen {
  sku: string;
  generated_at: string;
  timezone: string;
  next_instance: RawInstance | null;
  future_instances: RawInstance[];
}

interface RawInstance {
  id: string;
  sku: string;
  instance_slug: string;
  status: string;
  title: string | null;
  start_at: string; // timestamptz → string ISO
  end_at: string | null;
  timezone: string;
  capacity: number | null;
  seats_sold: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

/**
 * f_instanciaProximaPorSku
 * Lee la RPC f_webinars_resumen y devuelve un resumen reducido y serializable.
 * @param client Supabase client con método rpc
 * @param sku SKU lógico del webinar
 * @param max Máximo de futuras instancias a considerar (def 5)
 */
export async function f_instanciaProximaPorSku(
  client: SupabaseRpcClient,
  sku: string,
  max = 5
): Promise<InstanciaResumen> {
  const cleanSku = (sku ?? '').trim();
  if (!cleanSku) {
    return {
      next_start_at: null,
      next_instance_slug: null,
      instance_count_upcoming: 0,
      future_instances: [],
      timezone: 'America/Mexico_City',
    };
  }

  const { data, error } = await client.rpc<RawResumen>('f_webinars_resumen', {
    p_sku: cleanSku,
    p_max: max,
  });

  if (error || !data) {
    // Falla segura: sin instancias
    return {
      next_start_at: null,
      next_instance_slug: null,
      instance_count_upcoming: 0,
      future_instances: [],
      timezone: 'America/Mexico_City',
    };
  }

  const tz = typeof data.timezone === 'string' && data.timezone ? data.timezone : 'America/Mexico_City';

  const nextIso =
    data.next_instance && data.next_instance.start_at
      ? toIsoUtc(data.next_instance.start_at)
      : null;

  const nextSlug =
    data.next_instance && typeof data.next_instance.instance_slug === 'string'
      ? data.next_instance.instance_slug
      : null;

  const future = Array.isArray(data.future_instances)
    ? data.future_instances.map((it) => ({
        instance_slug: String(it.instance_slug),
        start_at: toIsoUtc(it.start_at),
      }))
    : [];

  return {
    next_start_at: nextIso,
    next_instance_slug: nextSlug,
    instance_count_upcoming: future.length,
    future_instances: future,
    timezone: tz,
  };
}

/* =========================
 * Helpers internos
 * ========================= */

/**
 * Normaliza a ISO8601 en UTC. Si ya viene en ISO, solo se asegura el formato.
 */
function toIsoUtc(v: string): string {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toISOString();
}

const instanciasApi = {
  f_instanciaProximaPorSku,
};

export default instanciasApi;
