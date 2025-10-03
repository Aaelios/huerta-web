// components/webinars/prelobby/PrelobbyClient.tsx

"use client";

import React, { useEffect, useState } from "react";
import StatusCta from "./StatusCta";
import type { Webinar } from "@/lib/types/webinars";

type Props = { webinar: Webinar };

type UiState = "MUY_TEMPRANO" | "TEMPRANO" | "PRE_LOBBY" | "EN_VIVO" | "FINALIZADO";
type Cta = { label: string; url: string | null; enabled: boolean };

export default function PrelobbyClient({ webinar }: Props) {
  const [uiState, setUiState] = useState<UiState>("MUY_TEMPRANO");
  const [timeLeft, setTimeLeft] = useState<string>("--:--:--");
  const [hasEntitlement, setHasEntitlement] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // key por slug
  useEffect(() => {
    try {
      const k = `prelobby-entitlement-${webinar.shared.slug}`;
      const v = window.sessionStorage.getItem(k);
      if (v === "true") setHasEntitlement(true);
    } catch {}
  }, [webinar.shared.slug]);

  // temporizador por fecha y duración
  useEffect(() => {
    const start = new Date(webinar.shared.startAt).getTime();
    const end = start + webinar.shared.durationMin * 60_000;

    const tick = () => {
      const now = Date.now();
      const diff = start - now;

      if (now > end) setUiState("FINALIZADO");
      else if (now >= start) setUiState("EN_VIVO");
      else if (diff <= 15 * 60_000) setUiState("PRE_LOBBY");
      else if (diff <= 60 * 60_000) setUiState("TEMPRANO");
      else setUiState("MUY_TEMPRANO");

      if (diff > 0) {
        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);
        const s = Math.floor((diff % 60_000) / 1_000);
        setTimeLeft(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
            .toString()
            .padStart(2, "0")}`
        );
      } else setTimeLeft("00:00:00");
    };

    tick();
    const id = window.setInterval(tick, 1_000);
    return () => window.clearInterval(id);
  }, [webinar.shared.startAt, webinar.shared.durationMin]);

  const handleValidate = async () => {
    setError(null);
    try {
      const res = await fetch("/api/prelobby/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: webinar.shared.slug, email }),
      });
      const data = await res.json();
      if (data?.ok && data?.hasEntitlement) {
        setHasEntitlement(true);
        window.sessionStorage.setItem(`prelobby-entitlement-${webinar.shared.slug}`, "true");
      } else {
        setHasEntitlement(false);
        setError("El correo no tiene acceso a este evento.");
      }
    } catch {
      setHasEntitlement(false);
      setError("Error de validación, intenta nuevamente.");
    }
  };

  const helperByState: Record<UiState, string> = {
    MUY_TEMPRANO: "Vuelve más cerca de la hora del evento.",
    TEMPRANO: "Revisa los pasos de preparación antes de unirte.",
    PRE_LOBBY: "Ten Zoom abierto y prueba tu audio.",
    EN_VIVO: "El evento ya comenzó. Únete ahora.",
    FINALIZADO: "Gracias por participar.",
  };

  const getCta = (): Cta => {
    switch (uiState) {
      case "MUY_TEMPRANO":
        return { label: "Aún no disponible", url: null, enabled: false };
      case "TEMPRANO":
        return { label: "Ver checklist", url: "#preparacion", enabled: true };
      case "PRE_LOBBY": {
        if (!hasEntitlement) return { label: "Valida tu correo", url: null, enabled: false };
        if (webinar.shared.zoomJoinUrl)
          return { label: "Conectarme al webinar", url: webinar.shared.zoomJoinUrl, enabled: true };
        return { label: "Enlace disponible en minutos", url: null, enabled: false };
      }
      case "EN_VIVO": {
        if (!hasEntitlement) return { label: "Valida tu correo", url: null, enabled: false };
        if (webinar.shared.zoomJoinUrl)
          return { label: "Entrar ahora", url: webinar.shared.zoomJoinUrl, enabled: true };
        return { label: "Enlace no disponible", url: null, enabled: false };
      }
      case "FINALIZADO":
        return { label: "Evento finalizado", url: null, enabled: false };
      default:
        return { label: "Estado desconocido", url: null, enabled: false };
    }
  };

  const cta = getCta();

  const normalizeExternal = (u: string) => {
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith("#")) return u;
    return `https://${u.replace(/^\/+/, "")}`;
  };

  const handleCtaClick = () => {
    if (!cta.enabled || !cta.url) return;
    const target = normalizeExternal(cta.url);
    if (target.startsWith("#")) {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.open(target, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="stack-4">
      {!hasEntitlement && (
        <div className="stack-2">
          <label className="c-form-label">Ingresa tu correo para validar acceso</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="c-form-control"
            placeholder="tu@correo.com"
            autoComplete="email"
          />
          {error && <p className="c-form-error">{error}</p>}
          <button onClick={handleValidate} className="c-btn c-btn--outline c-btn--md">
            Validar acceso
          </button>
        </div>
      )}

      <StatusCta />

      <div className="cluster-3">
        <button
          className="c-btn c-btn--solid c-btn--lg c-btn--block"
          disabled={!cta.enabled}
          onClick={handleCtaClick}
        >
          {cta.label}
        </button>
      </div>

      <p className="u-small u-color-subtle">{helperByState[uiState]}</p>
      {(uiState === "MUY_TEMPRANO" || uiState === "TEMPRANO") && (
        <p className="u-small u-color-subtle">Cuenta regresiva: {timeLeft}</p>
      )}
    </div>
  );
}
