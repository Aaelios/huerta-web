// components/contacto/FormularioContacto.tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";

const ENDPOINT = "/api/forms/submit";
const TURNSTILE_SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

// Tipos globales para evitar ts-comments
declare global {
  interface Window {
    turnstile?: {
      render: (selector: string, options: Record<string, unknown>) => void;
    };
    dataLayer?: Array<Record<string, unknown>>;
  }
}

// Límites locales
const NAME_MIN = 2;
const NAME_MAX = 128;
const MSG_MIN = 20;
const MSG_MAX = 1500;

// Opciones de motivo (incluye soporte) con microcopy amigable
const MOTIVOS = [
  { value: "", label: "Selecciona un motivo" },
  { value: "pago", label: "Problema con un pago o factura" },
  { value: "acceso", label: "No puedo acceder a un curso/descarga" },
  { value: "mejora", label: "Quiero proponer una mejora" },
  { value: "consulta", label: "Solo tengo una duda general" },
  { value: "soporte", label: "Necesito ayuda técnica" },
];

function uuidv4() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
}

export default function FormularioContacto() {
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // IDs accesibles
  const idNombre = useId();
  const idEmail = useId();
  const idMensaje = useId();
  const idMotivo = useId();
  const idTelefono = useId();

  // Estado de campos
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [motivo, setMotivo] = useState<string>("");
  const [telefono, setTelefono] = useState<string>("");

  // Control UI
  const [requestId, setRequestId] = useState(() => uuidv4());
  const [submitting, setSubmitting] = useState(false);
  const [disabledAll, setDisabledAll] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalMsg, setGlobalMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Anti-bot adicional mínimo
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [tMinPassed, setTMinPassed] = useState(false);
  function markInteractionOnce() {
    if (!startedAt) {
      const now = Date.now();
      setStartedAt(now);
      setTimeout(() => setTMinPassed(true), 3000);
    }
  }

  // Turnstile: render client-side
  const [hasTsToken, setHasTsToken] = useState(false);
  useEffect(() => {
    const el = document.getElementById("contact-turnstile");
    if (!el || !TURNSTILE_SITEKEY) return;

    const render = () => {
      if (window.turnstile && el.childElementCount === 0) {
        window.turnstile.render("#contact-turnstile", {
          sitekey: TURNSTILE_SITEKEY,
          theme: "dark",
        });
      }
    };

    if (window.turnstile) {
      render();
    } else {
      const onLoaded = () => render();
      window.addEventListener("turnstile-loaded", onLoaded, { once: true });
      return () => window.removeEventListener("turnstile-loaded", onLoaded);
    }
  }, [disabledAll]);

  // Observa el hidden input de Turnstile para habilitar el botón
  useEffect(() => {
    const tick = () => {
      const input = document.querySelector(
        "#contact-turnstile [name='cf-turnstile-response']"
      ) as HTMLInputElement | null;
      setHasTsToken(!!input?.value?.trim());
    };
    const iv = window.setInterval(tick, 400);
    tick();
    return () => window.clearInterval(iv);
  }, []);

  // Helpers
  const trim = (s: string) => s.replace(/\s+/g, " ").trim();
  const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
  const rePhone = /^\+?[0-9\s\-().]{7,20}$/;

  function getTurnstileToken(): string {
    const el = document.querySelector(
      "#contact-turnstile [name='cf-turnstile-response']"
    ) as HTMLInputElement | null;
    return el?.value?.trim() || "";
  }

  function getCompanyHoneypot(): string {
    const el = document.querySelector("input[name='company']") as HTMLInputElement | null;
    return el?.value ?? "";
  }

  function validate(localToken: string): Record<string, string> {
    const e: Record<string, string> = {};
    const n = trim(fullName);
    if (n.length < NAME_MIN || n.length > NAME_MAX) e.full_name = `Escribe tu nombre completo (${NAME_MIN}–${NAME_MAX}).`;

    const em = trim(email);
    if (!reEmail.test(em) || em.length > 254) e.email = "Correo no válido.";

    const msg = trim(mensaje);
    if (msg.length < MSG_MIN || msg.length > MSG_MAX) e.message = `Mensaje fuera de rango (${MSG_MIN}–${MSG_MAX}).`;

    const mo = trim(motivo);
    if (!mo) e.motivo = "Selecciona un motivo.";

    const ph = trim(telefono);
    if (ph && !rePhone.test(ph)) e.telefono = "Teléfono no válido.";

    if (!tMinPassed) e.tmin = "Espera un momento antes de enviar.";
    if (!localToken) e.turnstile = "Verificación requerida.";
    return e;
  }

  const canSubmit =
    !disabledAll &&
    !submitting &&
    trim(fullName).length >= NAME_MIN &&
    reEmail.test(trim(email)) &&
    trim(mensaje).length >= MSG_MIN &&
    !!trim(motivo) &&
    tMinPassed &&
    hasTsToken;

  // Checklist en vivo para explicar por qué el botón está deshabilitado
  const missing: string[] = [];
  if (!(trim(fullName).length >= NAME_MIN)) missing.push("Nombre válido");
  if (!reEmail.test(trim(email))) missing.push("Correo válido");
  if (!trim(motivo)) missing.push("Selecciona un motivo");
  if (!(trim(mensaje).length >= MSG_MIN)) missing.push(`Mensaje de al menos ${MSG_MIN} caracteres`);
  if (!tMinPassed) missing.push("Espera unos segundos");
  if (!hasTsToken) missing.push("Completa la verificación");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalMsg(null);

    const token = getTurnstileToken();
    const v = validate(token);
    setErrors(v);

    if (Object.keys(v).length > 0) {
      const order = ["full_name", "email", "message", "motivo", "telefono", "turnstile", "tmin"];
      const first = order.find(k => v[k]);
      const map: Record<string, string> = {
        full_name: idNombre,
        email: idEmail,
        message: idMensaje,
        motivo: idMotivo,
        telefono: idTelefono,
        turnstile: "contact-turnstile",
      };
      const targetId = first ? map[first] : undefined;
      if (targetId) document.getElementById(targetId)?.focus();
      else errorRef.current?.focus();
      // Analítica bloqueado por UI
      window.dataLayer?.push?.({ event: "contact_submit", status: "blocked_frontend", request_id: requestId });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: "contact_form" as const,
        source: "web_form" as const,
        request_id: requestId,
        email: trim(email).toLowerCase(),
        full_name: trim(fullName),
        marketing_opt_in: !!marketing,
        payload: { message: trim(mensaje) },
        turnstile_token: token,
        context: { page: "/contacto" },
        // Metadata con motivo y teléfono opcional
        metadata: {
          motivo: trim(motivo),
          telefono: trim(telefono) || undefined,
        },
        // Honeypot: debe viajar aunque esté vacío
        company: getCompanyHoneypot(),
      };

      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const isJSON = res.headers.get("content-type")?.includes("application/json");
      const data = isJSON ? await res.json().catch(() => null) : null;

      if (res.status === 200) {
        const duplicate = data?.status === "duplicate";
        setGlobalMsg({
          type: "success",
          text: duplicate ? "Ya recibimos tu mensaje. Estamos en ello." : "Gracias por escribir. Te respondemos pronto.",
        });
        setDisabledAll(true);

        // Analítica mínima
        window.dataLayer?.push?.({
          event: "contact_submit",
          status: duplicate ? "duplicate" : "ok",
          request_id: requestId,
        });

        setTimeout(() => successRef.current?.focus(), 30);
        return;
      }

      // Manejo de errores con diferenciación
      const errorCode: string | undefined = data?.error?.error_code;
      if (res.status === 413 || errorCode === "payload_too_large") {
        setGlobalMsg({ type: "error", text: "Tu mensaje es muy grande. Reduce el contenido y vuelve a intentar." });
        window.dataLayer?.push?.({ event: "contact_submit", status: "error", error_code: "payload_too_large", request_id: requestId });
        setTimeout(() => errorRef.current?.focus(), 30);
        return;
      }

      if (res.status === 403) {
        if (errorCode === "qa_forbidden") {
          setGlobalMsg({ type: "error", text: "No pudimos validar la solicitud. Intenta de nuevo más tarde." });
          window.dataLayer?.push?.({ event: "contact_submit", status: "error", error_code: "qa_forbidden", request_id: requestId });
        } else if (errorCode === "turnstile_invalid") {
          setGlobalMsg({ type: "error", text: "Verificación anti-bot inválida. Recarga e inténtalo de nuevo." });
          window.dataLayer?.push?.({ event: "contact_submit", status: "error", error_code: "turnstile_invalid", request_id: requestId });
        } else {
          setGlobalMsg({ type: "error", text: "No pasó la verificación. Intenta de nuevo." });
          window.dataLayer?.push?.({ event: "contact_submit", status: "error", error_code: "403_unknown", request_id: requestId });
        }
        setTimeout(() => errorRef.current?.focus(), 30);
        return;
      }

      if (res.status === 422) {
        // Si vienen errores de campo desde API, podríamos mapearlos aquí
        const apiFieldErrors: Record<string, string> | undefined = data?.error?.field_errors;
        if (apiFieldErrors) setErrors(prev => ({ ...prev, ...apiFieldErrors }));
        setGlobalMsg({ type: "error", text: "Revisa los campos marcados." });
        window.dataLayer?.push?.({ event: "contact_submit", status: "error", error_code: "invalid_input", request_id: requestId });
        setTimeout(() => errorRef.current?.focus(), 30);
        return;
      }

      if (res.status === 429) {
        setGlobalMsg({ type: "error", text: "Demasiados intentos. Espera 60 s e inténtalo otra vez." });
        window.dataLayer?.push?.({ event: "contact_submit", status: "error", error_code: "rate_limited", request_id: requestId });
        setTimeout(() => errorRef.current?.focus(), 30);
        return;
      }

      // Otros
      const rid = data?.error?.request_id || requestId;
      setGlobalMsg({ type: "error", text: `No pudimos enviar tu mensaje. Usa este ID al reportarlo: ${rid}` });
      window.dataLayer?.push?.({ event: "contact_submit", status: "error", error_code: `http_${res.status}`, request_id: requestId });
      setTimeout(() => errorRef.current?.focus(), 30);
    } catch {
      setGlobalMsg({ type: "error", text: `No pudimos enviar tu mensaje. Usa este ID al reportarlo: ${requestId}` });
      window.dataLayer?.push?.({ event: "contact_submit", status: "error", error_code: "exception", request_id: requestId });
      setTimeout(() => errorRef.current?.focus(), 30);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="section section--surface"
      onFocusCapture={markInteractionOnce}
      onKeyDownCapture={markInteractionOnce}
    >
      <div className="container u-maxw-md stack-5">
        <header className="stack-2 u-center-text-block">
          <h2>Contacto</h2>
          <p className="u-small">Te contestamos normalmente dentro de 24–48 h hábiles.</p>
        </header>

        {globalMsg && (
          <div
            ref={globalMsg.type === "error" ? errorRef : successRef}
            tabIndex={-1}
            role={globalMsg.type === "error" ? "alert" : "status"}
            className="c-card"
          >
            <p className={globalMsg.type === "error" ? "u-small" : "medium"}>{globalMsg.text}</p>
          </div>
        )}

        <form
          ref={formRef}
          onSubmit={onSubmit}
          className={`stack-4 ${disabledAll ? "is-disabled" : ""}`}
          noValidate
        >
          {/* Nombre */}
          <div>
            <label htmlFor={idNombre} className="c-form-label">Nombre completo*</label>
            <input
              id={idNombre}
              className="c-form-control"
              type="text"
              name="full_name"
              placeholder="Tu nombre y apellido"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              disabled={disabledAll}
              aria-invalid={!!errors.full_name}
              aria-describedby={errors.full_name ? `${idNombre}-err` : undefined}
            />
            {errors.full_name && <p id={`${idNombre}-err`} className="c-form-error">{errors.full_name}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor={idEmail} className="c-form-label">Email*</label>
            <input
              id={idEmail}
              className="c-form-control"
              type="email"
              name="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={disabledAll}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? `${idEmail}-err` : undefined}
            />
            {errors.email && <p id={`${idEmail}-err`} className="c-form-error">{errors.email}</p>}
          </div>

          {/* Motivo */}
          <div>
            <label htmlFor={idMotivo} className="c-form-label">Motivo*</label>
            <select
              id={idMotivo}
              className="c-form-control"
              name="motivo"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              disabled={disabledAll}
              aria-invalid={!!errors.motivo}
              aria-describedby={errors.motivo ? `${idMotivo}-err` : undefined}
            >
              {MOTIVOS.map(opt => (
                <option key={opt.value || "placeholder"} value={opt.value} disabled={opt.value === ""}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.motivo && <p id={`${idMotivo}-err`} className="c-form-error">{errors.motivo}</p>}
          </div>

          {/* Teléfono opcional */}
          <div>
            <label htmlFor={idTelefono} className="c-form-label">Teléfono (opcional)</label>
            <input
              id={idTelefono}
              className="c-form-control"
              type="tel"
              name="telefono"
              placeholder="+52 55 1234 5678"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              disabled={disabledAll}
              aria-invalid={!!errors.telefono}
              aria-describedby={errors.telefono ? `${idTelefono}-err` : `${idTelefono}-help`}
            />
            {errors.telefono ? (
              <p id={`${idTelefono}-err`} className="c-form-error">{errors.telefono}</p>
            ) : (
              <p id={`${idTelefono}-help`} className="c-form-help">
                No enviamos mensajes de marketing. Se usa solo para solicitudes de soporte y seguimiento de tu caso.
              </p>
            )}
            {motivo === "soporte" && (
              <p className="c-form-help">Si es soporte, incluir teléfono acelera la respuesta.</p>
            )}
          </div>

          {/* Mensaje */}
          <div>
            <label htmlFor={idMensaje} className="c-form-label">Mensaje*</label>
            <textarea
              id={idMensaje}
              className="c-form-control"
              name="message"
              placeholder="Cuéntanos en pocas líneas cómo podemos ayudarte."
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              disabled={disabledAll}
              rows={6}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? `${idMensaje}-err` : `${idMensaje}-help`}
            />
            {errors.message ? (
              <p id={`${idMensaje}-err`} className="c-form-error">{errors.message}</p>
            ) : (
              <p id={`${idMensaje}-help`} className="c-form-help">
                {MSG_MIN}–{MSG_MAX} caracteres. {mensaje.length}/{MSG_MAX}
              </p>
            )}
          </div>

          {/* Marketing opt-in */}
          <div>
            <label>
              <input
                type="checkbox"
                checked={marketing}
                onChange={e => setMarketing(e.target.checked)}
                disabled={disabledAll}
              />{" "}
              Quiero recibir tips y novedades por email.
            </label>
            <p className="c-form-help">Consejos prácticos. Puedes darte de baja cuando quieras.</p>
          </div>

          {/* Turnstile */}
          <div
            id="contact-turnstile"
            className="cf-turnstile"
            data-sitekey={TURNSTILE_SITEKEY}
            aria-label="Captcha Turnstile"
          />
          {errors.turnstile && <p className="c-form-error">{errors.turnstile}</p>}

          {/* Honeypot */}
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="company">Company</label>
            <input id="company" type="text" name="company" tabIndex={-1} autoComplete="off" />
          </div>

          {/* Checklist de requisitos cuando el botón está deshabilitado */}
          {!disabledAll && !canSubmit && (
            <div className="c-card">
              <p className="u-small">Completa lo siguiente para enviar:</p>
              <ul className="u-small">
                {missing.map(item => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Acciones */}
          <div className="l-cluster">
            <button
              type="submit"
              className="c-btn c-btn--solid"
              disabled={!canSubmit}
              aria-busy={submitting ? "true" : undefined}
              title={canSubmit ? "Enviar formulario" : "Faltan datos para enviar"}
            >
              {submitting ? "Enviando…" : "Enviar"}
            </button>

            {disabledAll && (
              <button
                type="button"
                className="c-btn c-btn--ghost"
                onClick={() => {
                  // Reset UI y datos
                  setDisabledAll(false);
                  setGlobalMsg(null);
                  setErrors({});
                  setFullName("");
                  setEmail("");
                  setMensaje("");
                  setMarketing(false);
                  setMotivo("");
                  setTelefono("");
                  setRequestId(uuidv4()); // Regenerar request_id
                  setStartedAt(null);
                  setTMinPassed(false);
                  // reset Turnstile
                  const box = document.getElementById("contact-turnstile");
                  if (box) box.innerHTML = "";
                  // limpiar honeypot si quedó texto
                  const hp = document.querySelector("input[name='company']") as HTMLInputElement | null;
                  if (hp) hp.value = "";
                }}
              >
                Enviar otro mensaje
              </button>
            )}
          </div>

          {/* Nota de privacidad */}
          <p className="c-form-help">
            Al enviar aceptas la <a href="/privacidad" className="c-link" target="_blank" rel="noopener noreferrer">Política de Privacidad</a>.
          </p>

          {/* Metadatos ocultos recomendados */}
          <input type="hidden" name="request_id" value={requestId} />
          <input type="hidden" name="form_location" value="/contacto" />
          <input type="hidden" name="ts_client" value={new Date().toISOString()} />
        </form>
      </div>
    </section>
  );
}
