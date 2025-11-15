// components/common/LocalDateTime.tsx
// Propósito: Mostrar una fecha/hora en "hora del cliente" usando Intl.DateTimeFormat en el navegador.
// Uso: pensado para reemplazar strings formateadas en server (hero, CTA, cards) y evitar diferencias entre local/preview/prod.

"use client";

import React from "react";

type LocalDateTimeProps = {
  iso: string | null;
  /**
   * Texto a mostrar cuando no hay fecha o la fecha es inválida.
   * Ej: "Fechas por anunciar".
   */
  emptyLabel?: string;
  /**
   * Variante de formato:
   * - "full": fecha completa + hora (pensado para hero / CTA).
   * - "short": solo fecha corta + hora corta (pensado para cards, si quieres).
   */
  variant?: "full" | "short";
};

/**
 * LocalDateTime
 *
 * - Toma un string ISO (idealmente con zona, ej. "2025-11-26T02:30:00+00:00").
 * - Formatea en el navegador usando la zona horaria real del usuario.
 * - En SSR devuelve un placeholder neutro y luego corrige en el cliente vía useEffect.
 */
export function LocalDateTime({
  iso,
  emptyLabel,
  variant = "full",
}: LocalDateTimeProps): React.ReactElement {
  const [label, setLabel] = React.useState<string>(() => {
    // En SSR o en el primer render no calculamos nada dependiente de la zona.
    // Evita diferencias server/client. Se completa en useEffect.
    return "";
  });

  React.useEffect(() => {
    if (!iso) {
      setLabel(emptyLabel ?? "Fechas por anunciar");
      return;
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      setLabel(emptyLabel ?? "Fecha por confirmar");
      return;
    }

    try {
      const formatter =
        variant === "short"
          ? new Intl.DateTimeFormat("es-MX", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : new Intl.DateTimeFormat("es-MX", {
              dateStyle: "full",
              timeStyle: "short",
            });

      setLabel(formatter.format(date));
    } catch {
      setLabel(emptyLabel ?? "Fecha por confirmar");
    }
  }, [iso, emptyLabel, variant]);

  return (
    <span suppressHydrationWarning>
      {label || emptyLabel || "Fechas por anunciar"}
    </span>
  );
}