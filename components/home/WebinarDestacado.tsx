// components/home/WebinarDestacado.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

type Featured = {
  title?: string;
  summary?: string;
  href?: string;
  ctaLabel?: string;
  type?: "webinar" | "curso" | "plantilla";
  startAt?: string;          // ISO con zona o UTC
  imageUrl?: string;
  priceMXN?: number;
};

export default function WebinarDestacado({ featured }: { featured?: Featured }) {
  const f = featured ?? {};

  const title   = f.title   ?? "Webinar en vivo — Septiembre 2025";
  const summary = f.summary ?? "Organiza tus finanzas y tu operación para lograr ingresos más estables. Sesión en vivo por Zoom.";
  const href    = f.href    ?? "/webinars";
  const cta     = f.ctaLabel ?? "Quiero mi lugar";
  const price   = typeof f.priceMXN === "number" ? f.priceMXN : 490;

  // Fecha
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

  const track = (placement: string) => {
    try { window.dataLayer?.push({ event: "cta_click", placement, type: f.type || "webinar" }); } catch {}
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: title,
    description: summary,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    ...(dateISO ? { startDate: dateISO } : {}),
    organizer: { "@type": "Organization", name: "Huerta Consulting" },
    location: { "@type": "VirtualLocation", url: href },
    ...(f.imageUrl ? { image: [f.imageUrl] } : {}),
    offers: {
      "@type": "Offer",
      url: href,
      priceCurrency: "MXN",
      price: price,
      availability: "https://schema.org/InStock",
      ...(dateISO ? { validFrom: dateISO } : {})
    }
  };

  return (
    <section className="section section--surface featured" aria-labelledby="featured-webinar-title">
      <div className="container">
        <div className="featured-grid" role="group" aria-label="Webinar destacado">
          {/* Card */}
          <article className="featured-card c-card shadow-soft" aria-describedby="featured-webinar-desc">
            <span className="badge badge--live" aria-label="En vivo">
              <span aria-hidden="true">●</span> EN VIVO
            </span>

            <h2 id="featured-webinar-title">{title}</h2>

            <p className="featured-meta small">
              {dateHuman ? (
                <>
                  <span role="img" aria-hidden="true">📅</span>{" "}
                  <time dateTime={dateISO}>{dateHuman}</time> · Hora CDMX
                </>
              ) : (
                <>martes, 30 de septiembre, 08:30 p.m. · Hora CDMX</>
              )}
            </p>

            <p id="featured-webinar-desc" className="u-small">{summary}</p>

            <ul className="list-check" role="list">
              <li>Claridad inmediata sobre tus ventas e ingresos.</li>
              <li>Detecta qué productos y clientes sostienen tu negocio.</li>
              <li>Reportes simples que muestran tu crecimiento real.</li>
              <li>Decisiones basadas en datos, no en intuición.</li>
            </ul>

            {/* Fila de precio + CTA */}
            <div className="cluster-4" aria-label="Acciones">
              <div className="featured-price price" aria-label="Precio">${price} MXN</div>
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
              priority={false}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 1200px) 520px, (min-width: 768px) 60vw, 90vw"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}
