// components/home/SteppingStones.tsx
"use client";

// SteppingStones — Pasos L-O-B-R-Á como guía visual de avance.
// Sin JSON-LD inline; los schemas se manejan desde la capa SEO central.

import Link from "next/link";
import { useCallback, useMemo } from "react";

export default function SteppingStones() {
  const track = useCallback((label: string) => {
    try {
      window.dataLayer?.push({ event: "cta_click", placement: "steps", label });
    } catch {}
  }, []);

  // Pasos L-O-B-R-Á
  const steps = useMemo(
    () =>
      [
        {
          id: "L",
          title: "Logro inicial",
          desc: "Primer resultado práctico en 1–2 horas.",
          href: "/webinars",
          cta: "Empezar aquí",
          label: "L-logro",
        },
        {
          id: "O",
          title: "Organizar piezas",
          desc: "Conecta resultados aislados en un mismo tema.",
          href: "/webinars",
          cta: "Ver cómo",
          label: "O-organizar",
        },
        {
          id: "B",
          title: "Base sólida",
          desc: "Dominas un área completa y usable.",
          href: "/webinars",
          cta: "Construir base",
          label: "B-base",
        },
        {
          id: "R",
          title: "Red integral",
          desc: "Integras varias competencias en un sistema.",
          href: "/webinars",
          cta: "Integrar sistema",
          label: "R-red",
        },
        {
          id: "Á",
          title: "Alcance logrado",
          desc: "Más ingresos, tiempo libre y confianza.",
          href: "/webinars",
          cta: "Alcanzar esto",
          label: "A-alcance",
        },
      ] as const,
    [],
  );

  return (
    <section className="section section--dark l-steps" aria-labelledby="steps-title" role="region">
      <div className="container u-text-center">
        <h2 id="steps-title">
          Los pasos para avanzar con <span className="accent">LOBRÁ</span>
        </h2>
        <p className="u-small">
          Cinco piedras que convierten tu aprendizaje en resultados acumulativos.
        </p>
      </div>

      {/* Lista L-O-B-R-Á */}
      <div className="container">
        <ol className="l-stepsGrid u-grid-equal" role="list">
          {steps.map((s) => (
            <li key={s.id} role="listitem" id={`step-${s.id}`}>
              <article
                className="c-card c-step"
                role="group"
                aria-labelledby={`step-${s.id}-title`}
                aria-describedby={`step-${s.id}-desc`}
              >
                <span className="c-step__num accent" aria-hidden="true">
                  {s.id}
                </span>

                <h3 id={`step-${s.id}-title`} className="c-step__title">
                  {s.title}
                </h3>

                <p id={`step-${s.id}-desc`} className="c-step__desc">
                  {s.desc}
                </p>

                <Link
                  href={s.href}
                  className="c-btn c-btn--ghost c-btn--pill"
                  aria-label={`${s.cta}: ${s.title}`}
                  onClick={() => track(`cta-${s.label}`)}
                >
                  {s.cta}
                </Link>
              </article>
            </li>
          ))}
        </ol>
      </div>

      {/* Bloque final: PTR reforzado */}
      <div className="container u-text-center" aria-labelledby="resultados-title">
        <h3 id="resultados-title" className="u-center">
          Resultados que sientes desde el primer paso
        </h3>
        <p className="u-small">
          Con LOBRÁ no necesitas terminar todo para ver cambios. Cada paso te da{" "}
          <span className="accent">libertad</span> y <span className="accent">tranquilidad</span>, con
          un negocio que realmente <span className="accent">te impulsa</span>. Al completar el
          recorrido, el impacto se multiplica.
        </p>
      </div>
    </section>
  );
}