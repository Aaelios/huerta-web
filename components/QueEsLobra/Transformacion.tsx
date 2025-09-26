// app/components/QueEsLobra/Transformacion.tsx
"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useMemo } from "react";

export default function Transformacion() {
  const ctaHref = "/webinars";
  const ctaText = "Empieza a lograr hoy";

  const track = useCallback((label: string) => {
    try {
      window.dataLayer?.push({
        event: "cta_click",
        placement: "que-es-lobra_transformacion",
        label,
      });
    } catch {}
  }, []);

  // Encabezado de sección
  const headline = "De la confusión a la claridad que impulsa tu negocio.";
  const sub = "Convierte horas de aprendizaje en avances visibles y utilizables, paso a paso con LOBRÁ.";

  // Antes / Después (emocional, genérico al método)
  const before = useMemo(
    () => [
      "Ingresos y esfuerzos sin relación clara.",
      "Agenda llena y sensación de no avanzar.",
      "Teoría acumulada que no se traduce en resultados.",
      "Ansiedad por no saber cuál es el siguiente paso.",
      "Dependencia de terceros para tareas básicas.",
    ],
    []
  );

  const after = useMemo(
    () => [
      "Más ingresos con control sobre qué funciona y qué no.",
      "Tiempo libre al ordenar y automatizar lo importante.",
      "Cada taller deja un entregable listo para usar.",
      "Ruta clara: sabes dónde estás y qué sigue.",
      "Avanzas con tus propias manos y decides con confianza.",
    ],
    []
  );

  // Pasos L-O-B-R (stepping stones)
  const steps = useMemo(
    () => [
      {
        id: "L",
        title: (
          <>
            Logro inicial: <span className="accent">claridad inmediata</span>
          </>
        ),
        plainTitle: "Logro inicial: claridad inmediata",
        desc: "En 1–2 horas obtienes un entregable visible que te da tracción real.",
      },
      {
        id: "O",
        title: (
          <>
            Organizar piezas: <span className="accent">orden y control</span>
          </>
        ),
        plainTitle: "Organizar piezas: orden y control",
        desc: "Conectas resultados aislados dentro de un mismo tema para multiplicar su efecto.",
      },
      {
        id: "B",
        title: (
          <>
            Base sólida: <span className="accent">prioridades claras</span>
          </>
        ),
        plainTitle: "Base sólida: prioridades claras",
        desc: "Dominas una competencia práctica completa lista para operar en tu negocio.",
      },
      {
        id: "R",
        title: (
          <>
            Red integral: <span className="accent">visión de crecimiento</span>
          </>
        ),
        plainTitle: "Red integral: visión de crecimiento",
        desc: "Integras varias competencias en un sistema que produce resultados consistentes.",
      },
    ],
    []
  );

  // JSON-LD (ItemList) para los pasos
  const itemListJSON = useMemo(() => {
    const elements = [
      ...steps.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${s.id} · ${s.plainTitle}`,
        url: ctaHref,
      })),
      {
        "@type": "ListItem",
        position: steps.length + 1,
        name: "Á · Alcance logrado",
        url: ctaHref,
      },
    ];
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: elements,
      name: "Pasos LOBRÁ",
    });
  }, [steps, ctaHref]);

  return (
    <section className="section" aria-labelledby="transf-title">
      {/* Encabezado */}
      <div className="container u-text-center">
        <h2 id="transf-title">
          {headline} <span className="accent">LOBRÁ</span>
        </h2>
        <p className="u-lead u-maxw-prose">{sub}</p>
      </div>

      {/* Fila 1: 2 columnas (Antes | Después) */}
      <div className="container">
        <div className="l-heroGrid">
          {/* Antes */}
          <article className="c-card" role="group" aria-labelledby="antes-title">
            <h3 id="antes-title">De la confusión</h3>
            <ul className="u-maxw-prose" role="list">
              {before.map((text, i) => (
                <li key={`b-${i}`} role="listitem">
                  <p>{text}</p>
                </li>
              ))}
            </ul>
          </article>

          {/* Después */}
          <article className="c-card" role="group" aria-labelledby="despues-title">
            <h3 id="despues-title">A la claridad</h3>
            <ul className="u-maxw-prose" role="list">
              {after.map((text, i) => (
                <li key={`a-${i}`} role="listitem">
                  <p>{text}</p>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>

      {/* L-O-B-R */}
      <div className="section section--dark">
        <div className="container">
          <ol className="l-stepsGrid u-grid-auto l-stonesRow is-compact" role="list">
            {steps.map((s) => (
              <li key={s.id} role="listitem" id={`step-${s.id}`}>
                <article className="c-card c-step" role="group" aria-labelledby={`step-${s.id}-title`}>
                  <span className="c-step__num accent" aria-hidden="true">
                    {s.id}
                  </span>
                  <h4 id={`step-${s.id}-title`} className="c-step__title">
                    {s.title}
                  </h4>
                  <p className="c-step__desc">{s.desc}</p>
                </article>
              </li>
            ))}
          </ol>

          {/* Á: PTR como cierre */}
          <article className="c-card c-step c-step--goal is-emphasis l-stoneGoal" role="group" aria-labelledby="step-goal-title">
            <span className="c-step__num accent" aria-hidden="true">
              Á
            </span>
            <h4 id="step-goal-title" className="c-step__title">
              Alcance logrado
            </h4>
            <p className="c-step__desc">Más ingresos, más tiempo libre y confianza en ti mismo.</p>
            <p className="c-step__desc fg-60">Resultados visibles que sostienen tu autonomía y tranquilidad.</p>
          </article>

          {/* CTA */}
          <div className="u-text-center l-stoneCTA is-band">
            <div className="cluster-3">
              <Link
                href={ctaHref}
                className="c-btn c-btn--solid c-btn--pill"
                onClick={() => track("transformacion_cta")}
                aria-label={ctaText}
                aria-describedby="stone-cta-help"
              >
                {ctaText}
              </Link>
              <p id="stone-cta-help" className="small" style={{ color: "var(--fg-60)" }}>
                Empieza hoy con claridad y paz.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* JSON-LD */}
      <Script id="que-es-lobra-transformacion-itemlist" type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListJSON }} />
    </section>
  );
}
