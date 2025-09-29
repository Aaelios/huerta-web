// TODO: implementar
// lib/logging/h_log.ts
/**
 * Logger JSON estable para server (Vercel/Node).
 * No PII cruda. Incluye ts, env, ns, event, level.
 */

import { LOG_NAMESPACE } from "../forms/constants";

type LogLevel = "info" | "warn" | "error";
type BaseFields = {
  request_id?: string;
  type?: string;           // "contact" | "newsletter" | etc.
  source?: string;         // "web_form_contact" | ...
  status?: string;         // "ok" | "duplicate" | ...
  reason?: 'ip_burst' | 'email_burst' | 'ip_sustained' | 'email_sustained'; // rate limit reason
  ip_hash?: string;        // sha256(ip + HASH_SALT)
  ip_class?: "ipv4" | "ipv6" | "private" | "unknown";
  latency_ms_total?: number;
  latency_ms_turnstile?: number;
  latency_ms_rl?: number;
  latency_ms_rpc?: number;
  code?: string | number;
  msg?: string;
  // Campos extra específicos de cada evento se permiten
  [k: string]: unknown;
};

const ENV = process.env.NODE_ENV || "development";

function safeJson(val: unknown): string {
  try {
    return JSON.stringify(val);
  } catch {
    return JSON.stringify({ _nonSerializable: true });
  }
}

/**
 * Emite una línea JSON estructurada a stdout/stderr.
 * No registra emails, IPs crudas ni payloads completos.
 */
export function h_log(event: string, fields: BaseFields = {}, level: LogLevel = "info"): void {
  const rec = {
    ts: new Date().toISOString(),
    env: ENV,
    ns: LOG_NAMESPACE,
    event,
    level,
    ...fields,
  };

  // Routing por nivel
  const line = safeJson(rec);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/** Azúcar sintáctico por tipo de evento */
export const log = {
  submitOk: (f: BaseFields) => h_log("submit_ok", f, "info"),
  turnstileFail: (f: BaseFields) => h_log("turnstile_fail", f, "warn"),
  rateLimited: (f: BaseFields) => h_log("rate_limited", f, "warn"),
  rateLimitError: (f: BaseFields) => h_log("rate_limit_error", f, "error"),
  rpcError: (f: BaseFields) => h_log("rpc_error", f, "error"),
  serverError: (f: BaseFields) => h_log("server_error", f, "error"),
};
