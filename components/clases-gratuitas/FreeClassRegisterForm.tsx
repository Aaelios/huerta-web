// components/clases-gratuitas/FreeClassRegisterForm.tsx

"use client";

import type { FC, FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import type { FreeClassPage } from "@/lib/freeclass/schema";

declare global {
  interface Window {
    turnstile?: {
      render: (selector: string, options: Record<string, unknown>) => void;
    };
    dataLayer?: Array<Record<string, unknown>>;
    __freeclass_lead_sent?: boolean;
  }
}

type FreeClassRegisterResponse = {
  registration_state:
    | "open"
    | "full"
    | "ended"
    | "canceled"
    | "upcoming"
    | "no_instance"
    | "closed"
    | null;
  result: "registered" | "waitlist" | "rejected_closed" | null;
  ui_state: "open" | "waitlist" | "closed" | null;
  leadTracking:
    | {
        class_sku: string;
        instance_slug: string | null;
        utm: Record<string, unknown> | null;
      }
    | null;
  nextStepUrl: string | null;
};

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type Props = {
  page: FreeClassPage;
};

type UiLocal =
  | "idle"
  | "show_error"
  | "show_success"
  | "show_waitlist"
  | "show_closed";

const FreeClassRegisterForm: FC<Props> = ({ page }) => {
  const idName = useId();
  const idEmail = useId();
  const idConsent = useId();
  const idError = useId();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  // Consentimiento aprobado por defecto
  const [consent, setConsent] = useState(true);
  const [hasTsToken, setHasTsToken] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [uiStateLocal, setUiStateLocal] = useState<UiLocal>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Turnstile rendering
  useEffect(() => {
    const containerId = "freeclass-turnstile";
    const el = document.getElementById(containerId);
    if (!el || !TURNSTILE_SITE_KEY) return;

    const render = () => {
      if (window.turnstile && el.childElementCount === 0) {
        window.turnstile.render(`#${containerId}`, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "light",
        });
      }
    };

    if (window.turnstile) {
      render();
    } else {
      const handler = () => render();
      window.addEventListener("turnstile-loaded", handler, { once: true });
      return () => window.removeEventListener("turnstile-loaded", handler);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      const input = document.querySelector(
        "#freeclass-turnstile [name='cf-turnstile-response']"
      ) as HTMLInputElement | null;
      setHasTsToken(!!input?.value?.trim());
    };
    const iv = window.setInterval(tick, 400);
    tick();
    return () => window.clearInterval(iv);
  }, []);

  function getTurnstileToken(): string {
    const el = document.querySelector(
      "#freeclass-turnstile [name='cf-turnstile-response']"
    ) as HTMLInputElement | null;
    return el?.value?.trim() ?? "";
  }

  function validate(token: string): string | null {
    if (!fullName.trim()) return "Escribe tu nombre completo.";
    if (!email.trim()) return "Escribe tu correo.";
    if (!email.includes("@")) return "Correo no válido.";
    if (!consent) return "Debes aceptar el consentimiento.";
    if (!token) return "Verificación requerida.";
    return null;
  }

  function deriveUiState(res: FreeClassRegisterResponse): UiLocal {
    if (res.result === "registered") return "show_success";
    if (res.result === "waitlist") return "show_waitlist";

    if (
      res.result === "rejected_closed" ||
      res.registration_state === "ended" ||
      res.registration_state === "canceled" ||
      res.registration_state === "closed" ||
      res.registration_state === "no_instance"
    )
      return "show_closed";

    if (res.registration_state === "full") return "show_closed";

    return "show_error";
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const token = getTurnstileToken();
    const err = validate(token);
    if (err) {
      setErrorMessage(err);
      setUiStateLocal("show_error");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        email: email.trim(),
        full_name: fullName.trim(),
        sku: page.sku,
        instanceSlug: undefined,
        consent,
        utm: undefined,
        turnstile_token: token,
      };

      const res = await fetch("/api/freeclass/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setErrorMessage(page.mensajeErrorGenerico);
        setUiStateLocal("show_error");
        return;
      }

      const data = (await res.json()) as FreeClassRegisterResponse;

      // ---------- Analytics (6.B) ----------
      if (typeof window !== "undefined" && data.leadTracking && data.result) {
        if (!window.__freeclass_lead_sent) {
          const utm = data.leadTracking.utm ?? {};

          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: "lead",
            context: "free_class",
            class_sku: data.leadTracking.class_sku,
            instance_slug: data.leadTracking.instance_slug,
            ...utm,
          });

          window.__freeclass_lead_sent = true;
        }
      }
      // -------------------------------------

      setUiStateLocal(deriveUiState(data));
    } catch {
      setErrorMessage(page.mensajeErrorGenerico);
      setUiStateLocal("show_error");
    } finally {
      setSubmitting(false);
    }
  }

  if (uiStateLocal === "show_success") {
    return (
      <div className="stack-2">
        <p>{page.mensajePostRegistro}</p>
      </div>
    );
  }

  if (uiStateLocal === "show_waitlist") {
    return (
      <div className="stack-2">
        <p>{page.mensajesEstado.waitlist}</p>
      </div>
    );
  }

  if (uiStateLocal === "show_closed") {
    return (
      <div className="stack-2">
        <p>{page.mensajesEstado.closed}</p>
      </div>
    );
  }

  const canSubmit =
    !submitting &&
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    email.includes("@") &&
    consent &&
    hasTsToken;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="stack-3"
      aria-describedby={errorMessage ? idError : undefined}
    >
      {/* Nombre */}
      <div className="stack-1">
        <label htmlFor={idName} className="u-visually-hidden">
          Nombre completo*
        </label>
        <input
          id={idName}
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={submitting}
          placeholder="Tu nombre completo"
          autoComplete="name"
        />
      </div>

      {/* Email */}
      <div className="stack-1">
        <label htmlFor={idEmail} className="u-visually-hidden">
          Email*
        </label>
        <input
          id={idEmail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          placeholder="Tu correo electrónico"
          autoComplete="email"
        />
      </div>

      {/* Consentimiento */}
      <div className="stack-1" style={{ display: "none" }}>
        <label htmlFor={idConsent}>
          <input
            id={idConsent}
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={submitting}
          />{" "}
          Acepto recibir correos relacionados con esta clase.
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        aria-busy={submitting ? "true" : undefined}
      >
        {submitting ? "Enviando…" : page.hero.ctaText}
      </button>

      {/* Turnstile */}
      <div
        id="freeclass-turnstile"
        className="cf-turnstile"
        data-sitekey={TURNSTILE_SITE_KEY}
        aria-label="Captcha Turnstile"
      />

      {errorMessage && (
        <p id={idError} className="u-small">
          {errorMessage}
        </p>
      )}
    </form>
  );
};

export default FreeClassRegisterForm;
