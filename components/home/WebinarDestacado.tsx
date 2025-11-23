// components/home/WebinarDestacado.tsx
"use client";

// WebinarDestacado — bloque legacy de webinar destacado.
// UI preservada. Sin JSON-LD inline; los schemas ahora viven en la capa SEO central.

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { renderAccent } from "@/lib/ui/renderAccent";

type Featured = {
  title?: string;
  summary?: string;
  href?: string;
  ctaLabel?: string;
  type?: "webinar" | "curso" | "plantilla";
  startAt?: string;
  imageUrl?: string;
  priceMXN?: number;
  eyebrow?: string;
  bullets?: string[];
};

export default function WebinarDestacado({ featured }: { featured?: Featured }) {
  const f = featured ?? {};

  // Derivados seguros
  const title = f.title ?? "Webinar en vivo — Septiembre 2025";
  const summary =
    f.summary ??
    "Organiza tus finanzas y tu operación para lograr ingresos más estables. Sesión en vivo por Zoom.";
  const href = f.href ?? "/webinars";
  const cta = f.ctaLabel ?? "Quiero mi lugar";
  const price = typeof f.priceMXN === "number" ? f.priceMXN : 490;

  // Fecha legible
  let dateISO: string | undefined;
  let dateHuman: string | undefined;
  if (f.startAt) {
    try {
      const d = new Date(f.startAt);
      dateISO = d.toISOString();
      dateHuman = new Intl.DateTimeFormat("es-MX", {
        timeZone: "America/Mexico_City",
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {}
  }

  // Analítica
  const track = (placement: string) => {
    try {
      window.dataLayer?.push({
        event: "cta_click",
        placement,
        type: f.type || "webinar",
      });
    } catch {}
  };

  const bullets =
    f.bullets?.length
      ? f.bullets
      : [
          "Claridad inmediata sobre tus ventas e ingresos.",
          "Detecta qué productos y clientes sostienen tu negocio.",
          "Reportes simples que muestran tu crecimiento real.",
          "Decisiones basadas en datos, no en intuición.",
        ];

  return (
    <section
      className="section section--surface featured"
      aria-labelledby="featured-webinar-title"
    >
      <div className="container">
        <div className="featured-grid" role="group" aria-label="Webinar destacado">
          {/* Card */}
          <article
            className="featured-card c-card shadow-soft"
            aria-describedby="featured-webinar-desc"
          >
            <span className="badge badge--live" aria-label="En vivo">
              <span aria-hidden="true">●</span> EN VIVO
            </span>

            {f.eyebrow ? <p className="eyebrow">{f.eyebrow}</p> : null}

            <h2 id="featured-webinar-title">{renderAccent(title)}</h2>

            <p className="featured-meta small">
              {dateHuman ? (
                <>
                  <span role="img" aria-hidden="true">
                    📅
                  </span>{" "}
                  <time dateTime={dateISO}>{dateHuman}</time> · Hora CDMX
                </>
              ) : (
                <>martes, 30 de septiembre, 08:30 p.m. · Hora CDMX</>
              )}
            </p>

            <p id="featured-webinar-desc" className="u-small">
              {renderAccent(summary)}
            </p>

            <ul className="list-check" role="list">
              {bullets.map((b, i) => (
                <li key={i}>{renderAccent(b)}</li>
              ))}
            </ul>

            {/* Acciones */}
            <div className="cluster-4" aria-label="Acciones">
              <div className="featured-price price" aria-label="Precio">
                ${price} MXN
              </div>
              <Link
                href={href}
                className="c-btn c-btn--solid c-btn--pill"
                onClick={() => track("featured_webinar")}
                aria-label={`${cta}: ${title}`}
              >
                {cta}
              </Link>
            </div>

            <p className="small">Aplica tu cupón en el checkout. Cupo limitado.</p>
          </article>

          {/* Imagen */}
          <div className="l-hero-imgCol" aria-hidden="true">
            <Image
              src={f.imageUrl || "/images/home/roberto-huerta-webinar-800x1000.jpg"}
              alt="Roberto Huerta, presentador del webinar"
              width={800}
              height={1000}
              loading="lazy"
              decoding="async"
              priority={false}
              sizes="(min-width: 1200px) 520px, (min-width: 768px) 60vw, 90vw"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
