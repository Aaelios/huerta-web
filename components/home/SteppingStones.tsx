// components/home/SteppingStones.tsx
"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useMemo } from "react";

export default function SteppingStones() {
  const track = useCallback((label: string) => {
    try {
      window.dataLayer?.push({ event: "cta_click", placement: "steps", label });
    } catch {}
  }, []);

  const items = useMemo(
    () =>
      [
        {
          id: "step-1",
          position: 1,
          title: "Organiza tu base",
          desc: "Ten claridad sobre tus números y prioridades. El punto de partida que trabajamos en el webinar.",
          href: "/webinars",
          cta: "Reservar lugar en el webinar",
          label: "organiza-tu-base",
        },
        {
          id: "step-2",
          position: 2,
          title: "Crea una oferta que conecta",
          desc: "Presenta lo que vendes para que tu cliente piense “lo necesito”.",
          href: "/servicios#oferta",
          cta: "Ver ejemplo de oferta",
          label: "oferta-que-conecta",
        },
        {
          id: "step-3",
          position: 3,
          title: "Implementa un sistema simple",
          desc: "Diseña rutinas de ventas y seguimiento sostenibles sin abrumarte.",
          href: "/servicios#sistema",
          cta: "Ver rutina sugerida",
          label: "sistema-simple",
        },
        {
          id: "step-4",
          position: 4,
          title: "Recupera tu tiempo",
          desc: "Usa herramientas y plantillas que te devuelven horas para enfocarte en lo que importa.",
          href: "/plantillas",
          cta: "Explorar plantillas",
          label: "recupera-tiempo",
        },
      ] as const,
    []
  );

  const itemListJSON = useMemo(() => {
    const elements = items.map((it) => ({
      "@type": "ListItem",
      position: it.position,
      name: it.title,
      url: it.href,
    }));
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: elements,
      name: "Pasos para avanzar",
    });
  }, [items]);

  return (
    <section className="section--dark" aria-labelledby="steppingstones-title" role="region">
      <div className="container">
        <h2 id="steppingstones-title">Los pasos para avanzar</h2>

        <ol className="steps" role="list">
          {items.map((it) => (
            <li key={it.id} id={it.id} className="step card shadow-soft">
              <span className="kicker" aria-hidden="true">
                {it.position}.
              </span>
              <h3 className="stepTitle">{it.title}</h3>
              <p className="stepDesc">{it.desc}</p>

              <Link
                href={it.href}
                className={it.position === 1 ? "btn-pill" : "ctaMinor"}
                aria-label={it.cta}
                onClick={() => track(`cta-${it.label}`)}
              >
                {it.cta}
              </Link>
            </li>
          ))}
        </ol>
      </div>

      <Script id="steps-itemlist" type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListJSON }} />

      <style jsx>{`
        section.section--dark {
          background: var(--bg);
          padding: 56px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        h2 {
          color: var(--fg);
          margin: 0 0 16px;
          letter-spacing: -0.01em;
        }

        .steps {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin: 24px 0 0;
          padding: 0;
          list-style: none;
        }

        @media (min-width: 1024px) {
          .steps {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .step {
          background: var(--surface);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 14px;
          padding: 20px;
          color: var(--fg);
          transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease;
        }
        .step:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.18);
          background-color: rgba(255, 255, 255, 0.03);
        }

        .kicker {
          color: var(--fg-70);
          font-variant-numeric: tabular-nums;
          display: inline-block;
          margin-bottom: 6px;
        }

        .stepTitle {
          margin: 0 0 8px;
          font-size: 1.375rem;
          font-weight: 800;
          line-height: 1.2;
          color: var(--fg);
        }

        .stepDesc {
          margin: 0 0 14px;
          color: var(--fg-80);
        }

        .ctaMinor {
          display: inline-block;
          font-weight: 600;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(80, 200, 120, 0.35);
          color: var(--fg);
          text-decoration: none;
        }
        .ctaMinor:focus-visible,
        .btn-pill:focus-visible {
          outline: 2px solid var(--primary-1);
          outline-offset: 2px;
        }
      `}</style>
    </section>
  );
}
