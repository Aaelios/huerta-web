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
          desc:
            "Ten claridad sobre tus números y prioridades. El punto de partida que trabajamos en el webinar.",
          href: "/webinars",
          cta: "Reservar lugar en el webinar",
          label: "organiza-tu-base",
        },
        {
          id: "step-2",
          position: 2,
          title: "Crea una oferta que conecta",
          desc:
            "Presenta lo que vendes para que tu cliente piense “lo necesito”.",
          href: "/servicios#oferta",
          cta: "Ver ejemplo de oferta",
          label: "oferta-que-conecta",
        },
        {
          id: "step-3",
          position: 3,
          title: "Implementa un sistema simple",
          desc:
            "Diseña rutinas de ventas y seguimiento sostenibles sin abrumarte.",
          href: "/servicios#sistema",
          cta: "Ver rutina sugerida",
          label: "sistema-simple",
        },
        {
          id: "step-4",
          position: 4,
          title: "Recupera tu tiempo",
          desc:
            "Usa herramientas y plantillas que te devuelven horas para enfocarte en lo que importa.",
          href: "/plantillas",
          cta: "Explorar plantillas",
          label: "recupera-tiempo",
        },
      ] as const,
    []
  );

  // JSON-LD para la secuencia de pasos
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
    <section className="l-steps" aria-labelledby="steps-title" role="region">
      <div className="container">
        <header>
          <h2 id="steps-title">Los pasos para avanzar</h2>
        </header>

        <ol className="l-stepsGrid" role="list">
          {items.map((it) => (
            <li key={it.id} id={it.id} role="listitem">
              <article className="c-step" role="group" aria-labelledby={`${it.id}-title`}>
                <span className="c-step__num" aria-hidden="true">
                  {it.position}
                </span>

                <h3 id={`${it.id}-title`} className="c-step__title">
                  {it.title}
                </h3>

                <p className="c-step__desc">{it.desc}</p>

                {it.position === 1 ? (
                  <Link
                    href={it.href}
                    className="c-btn c-btn--solid c-btn--pill"
                    aria-label={it.cta}
                    onClick={() => track(`cta-${it.label}`)}
                  >
                    {it.cta}
                  </Link>
                ) : (
                  <Link
                    href={it.href}
                    className="c-link"
                    aria-label={it.cta}
                    onClick={() => track(`cta-${it.label}`)}
                  >
                    {it.cta}
                  </Link>
                )}
              </article>
            </li>
          ))}
        </ol>
      </div>

      <Script
        id="steps-itemlist"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: itemListJSON }}
      />
    </section>
  );
}
