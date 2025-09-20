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
  startAt?: string;
  imageUrl?: string;
  priceMXN?: number;
};

export default function WebinarDestacado({ featured }: { featured?: Featured }) {
  const f = featured || {};
  const href = f.href || "/webinars";
  const title = f.title || "Webinar en vivo — Septiembre 2025";
  const summary =
    f.summary ||
    "Organiza tus finanzas y tu operación para lograr ingresos más estables. Sesión en vivo por Zoom.";
  const cta = f.ctaLabel || "Quiero mi lugar";
  const price = typeof f.priceMXN === "number" ? f.priceMXN : 490;

  // Fecha legible (Hora CDMX)
  let dateText: string | null = null;
  if (f.startAt) {
    try {
      const d = new Date(f.startAt);
      dateText = new Intl.DateTimeFormat("es-MX", {
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
    try {
      window.dataLayer?.push({ event: "cta_click", placement, type: f.type || "webinar" });
    } catch {}
  };

  return (
    <section className="featuredWebinar section--surface" aria-labelledby="featured-webinar-title">
      <div className="container">
        <div className="grid">
          {/* Columna de texto (card) */}
          <div className="card">
            <span className="liveBadge">
              <span className="dot" aria-hidden /> EN VIVO
            </span>

            <h2 id="featured-webinar-title" className="title">
              {title}
            </h2>

            {dateText && <p className="small muted">📅 {dateText} · Hora CDMX</p>}
            {!dateText && <p className="small muted">martes, 30 de septiembre, 08:30 p.m. · Hora CDMX</p>}

            <p className="desc">{summary}</p>

            <ul className="bullets" role="list">
              <li>✓ Paso a paso claro para ordenar.</li>
              <li>✓ Plantillas listas para usar.</li>
              <li>✓ Próxima acción concreta en 7 días.</li>
            </ul>

            <div className="price">${price} MXN</div>

            <div className="ctaRow">
              <Link href={href} className="btn-pill" onClick={() => track("featured_webinar")}>
                {cta}
              </Link>
            </div>

            <p className="small muted note">Aplica tu cupón en el checkout. Cupo limitado.</p>
          </div>

          {/* Columna imagen */}
          <div className="media">
            <div className="imgWrap">
              <Image
                src={f.imageUrl || "/images/home/roberto-huerta-webinar-800x1000.jpg"}
                alt="Foto del instructor del webinar"
                width={800}
                height={1000}
                priority={false}
                loading="lazy"
                decoding="async"
                sizes="(min-width:1200px) 520px, (min-width:768px) 60vw, 90vw"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .featuredWebinar {
          padding: 28px 0;
        }

        .grid {
          display: grid;
          gap: 24px;
          grid-template-columns: 1fr;
          align-items: start;
        }

        .card {
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 20px;
        }

        .liveBadge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          font-size: 13px;
          background: rgba(92, 242, 142, 0.14);
          border: 1px solid rgba(92, 242, 142, 0.32);
          color: var(--primary-1);
          padding: 6px 10px;
          border-radius: 999px;
          margin-bottom: 12px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--primary-1);
        }

        .title {
          color: var(--fg);
          margin: 0 0 6px;
          line-height: 1.15;
          font-weight: 800;
          font-size: clamp(26px, 4.6vw, 40px);
        }

        .muted {
          color: var(--fg-70);
        }
        .desc {
          color: var(--fg-80);
          margin: 8px 0 10px;
        }

        .bullets {
          list-style: none;
          padding: 0;
          margin: 8px 0 14px;
          display: grid;
          gap: 6px;
          color: var(--fg);
        }

        .price {
          font-weight: 800;
          color: var(--fg);
          margin: 8px 0 10px;
        }

        .ctaRow {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 8px;
        }

        .note {
          margin: 0;
        }

        .media {
          justify-self: center;
          width: min(520px, 100%);
        }
        .imgWrap {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          aspect-ratio: 4/5;
          min-height: 360px;
        }

        @media (min-width: 1200px) {
          .grid {
            grid-template-columns: 1.15fr 0.85fr;
            gap: 36px;
          }
          .media {
            justify-self: end;
          }
          .card {
            padding: 24px;
          }
        }
      `}</style>
    </section>
  );
}
