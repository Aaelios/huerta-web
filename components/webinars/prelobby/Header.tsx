// components/webinars/prelobby/Header.tsx

"use client";

import React from "react";
import type { Webinar } from "@/lib/types/webinars";

type Props = {
  webinar: Webinar;
};

/**
 * Header
 * Muestra título del webinar y la fecha/hora formateada en CDMX.
 * Los datos ahora provienen de webinar.shared.
 */
export default function Header({ webinar }: Props) {
  const shared = (webinar as any)?.shared ?? webinar;
  const [whenText, setWhenText] = React.useState<string>("");

  React.useEffect(() => {
    try {
      const dt = new Date(shared.startAt);
      const dateStr = new Intl.DateTimeFormat("es-MX", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "America/Mexico_City",
      }).format(dt);

      const timeStr = new Intl.DateTimeFormat("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Mexico_City",
      }).format(dt);

      setWhenText(`${capitalize(dateStr)} · ${timeStr} CDMX`);
    } catch {
      setWhenText("Horario no disponible");
    }
  }, [shared.startAt]);

  return (
    <header className="stack-2" aria-labelledby="prelobby-title">
      <h1 id="prelobby-title">{shared.title}</h1>
      <p className="u-small u-color-subtle" aria-live="polite">
        {whenText}
      </p>
      {shared.subtitle ? <p className="u-small">{shared.subtitle}</p> : null}
    </header>
  );
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
