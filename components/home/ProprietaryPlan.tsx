// components/home/ProprietaryPlan.tsx
"use client";

import Link from "next/link";
import Script from "next/script";
import { useMemo } from "react";

export default function ProprietaryPlan() {
  const track = (label: string) => {
    try {
      window.dataLayer?.push({ event: "cta_click", placement: "plan", label });
    } catch {}
  };

  // Memoizar para que no cambie en cada render
  const pillars = useMemo(
    () =>
      [
        {
          id: "pillar-claridad",
          title: "Mapea tu claridad",
          desc: "Entiende tu situación con números simples. Sin hojas de cálculo eternas.",
          href: "/webinars#claridad",
          cta: "Ver cómo empezar",
          label: "claridad",
          icon: (
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
              <path d="M4 12h16M12 4v16" fill="none" stroke="currentColor" strokeWidth="2" opacity=".9" />
            </svg>
          ),
        },
        {
          id: "pillar-oferta",
          title: "Diseña una oferta que conecta",
          desc: "Explica valor en palabras claras para que tu cliente piense “lo necesito”.",
          href: "/servicios#oferta",
          cta: "Ejemplo práctico de oferta",
          label: "oferta",
          icon: (
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
              <path d="M4 7h16M4 12h10M4 17h8" fill="none" stroke="currentColor" strokeWidth="2" opacity=".9" />
            </svg>
          ),
        },
        {
          id: "pillar-sistema",
          title: "Implementa un sistema simple",
          desc: "Rutinas de ventas y seguimiento sostenibles para crecer sin abrumarte.",
          href: "/servicios#sistema",
          cta: "Ver rutina práctica",
          label: "sistema",
          icon: (
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
              <path d="M6 7h12v10H6zM9 7V4m6 3V4m-9 13h12" fill="none" stroke="currentColor" strokeWidth="2" opacity=".9" />
            </svg>
          ),
        },
      ] as const,
    []
  );

  const itemListJSON = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Plan de 3 pilares",
        itemListElement: pillars.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.title,
          url: p.href,
        })),
      }),
    [pillars]
  );

  return (
    <section className="section--dark" aria-labelledby="plan-title" role="region">
      <div className="container">
        <h2 id="plan-title">Nuestro plan para lograrlo</h2>
        <p className="lead">
          Un camino de 3 pasos aplicado por emprendedores en LATAM para pasar de dudas a acciones medibles.
        </p>

        <ul className="grid" role="list">
          {pillars.map((p) => (
            <li key={p.id} id={p.id} className="card shadow-soft item">
              <div className="icon" aria-hidden="true">
                {p.icon}
              </div>
              <h3 className="title">{p.title}</h3>
              <p className="desc">{p.desc}</p>
              <Link href={p.href} className="ctaMinor" onClick={() => track(p.label)} aria-label={p.cta}>
                {p.cta}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ctaWrap">
          <Link
            href="/webinars?src=plan"
            className="btn-pill"
            onClick={() => track("cta-principal")}
            aria-label="Empezar con el plan en el próximo webinar"
          >
            Empezar con el plan
          </Link>
        </div>
      </div>

      <Script id="plan-itemlist" type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListJSON }} />

      <style jsx>{`
        section.section--dark {
          background: var(--bg);
          padding: 56px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        h2 {
          color: var(--fg);
          margin: 0 0 8px;
          letter-spacing: -0.01em;
        }

        .lead {
          color: var(--fg-80);
          margin: 0 0 24px;
          max-width: 760px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          padding: 0;
          margin: 0;
          list-style: none;
        }
        @media (min-width: 1024px) {
          .grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .item {
          background: var(--surface);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 14px;
          padding: 20px;
          color: var(--fg);
          min-height: 196px;
          transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease;
        }
        .item:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.18);
          background-color: rgba(255, 255, 255, 0.03);
        }

        .icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          margin-bottom: 10px;
          color: var(--primary-2);
          background: rgba(80, 200, 120, 0.08);
          border: 1px solid rgba(80, 200, 120, 0.25);
        }

        .title {
          margin: 0 0 8px;
          font-size: 1.25rem;
          font-weight: 800;
          line-height: 1.2;
          color: var(--fg);
        }

        .desc {
          color: var(--fg-80);
          margin: 0 0 12px;
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

        .ctaWrap {
          text-align: center;
          margin-top: 28px;
        }
      `}</style>
    </section>
  );
}
