// components/webinars/Transformacion.tsx
"use client";

// Transformacion (webinars) — Bloque emocional 'De la confusión a la tranquilidad financiera'.
// UI y analítica se conservan. Sin JSON-LD inline; los schemas viven en la capa SEO central.

import Link from "next/link";
import { useCallback, useMemo } from "react";

type Props = {
  ctaHref: string;
  ctaText?: string;
};

export default function Transformacion({
  ctaHref,
  ctaText = "Quiero mi claridad financiera hoy",
}: Props) {
  const track = useCallback((label: string) => {
    try {
      window.dataLayer?.push({ event: "cta_click", placement: "mid_section", label });
    } catch {}
  }, []);

  // Headline PTR
  const ptrHeadline = "De la confusión a la tranquilidad financiera.";
  const ptrSub = "En 90 minutos conviertes ansiedad en claridad y confianza sobre tu dinero.";

  // Antes / Después (emocional)
  const before = useMemo(
    () => [
      "Angustia cada vez que llegan las facturas.",
      "Miedo de gastar porque no sabes si alcanza.",
      "Cansancio de sentir que trabajas todo el día sin descanso.",
      "Ansiedad al no saber qué pasará con tu negocio mañana.",
      "Frustración de compararte con otros que avanzan más rápido.",
    ],
    [],
  );

  const after = useMemo(
    () => [
      "Confianza de saber que tu esfuerzo sí genera resultados.",
      "Orgullo al ver logros concretos y sentir progreso real.",
      "Tranquilidad de dormir sin la carga de la incertidumbre.",
      "Alegría de disfrutar tus avances sin culpa ni comparación.",
      "Paz de tener claridad y decidir sin miedo.",
    ],
    [],
  );

  // Pasos L-O-B-R
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
        desc: "Alivio de ver por fin tus ingresos reales y dejar la incertidumbre atrás.",
      },
      {
        id: "O",
        title: (
          <>
            Organizar piezas: <span className="accent">orden y control</span>
          </>
        ),
        plainTitle: "Organizar piezas: orden y control",
        desc: "Seguridad al descubrir qué fuente de ingreso te da más valor y cuáles no.",
      },
      {
        id: "B",
        title: (
          <>
            Base sólida: <span className="accent">prioridades claras</span>
          </>
        ),
        plainTitle: "Base sólida: prioridades claras",
        desc: "Confianza al enfocarte en lo que sí da frutos y soltar lo que drena tu energía.",
      },
      {
        id: "R",
        title: (
          <>
            Red integral: <span className="accent">visión de crecimiento</span>
          </>
        ),
        plainTitle: "Red integral: visión de crecimiento",
        desc: "Orgullo de sentirte dueño de tus decisiones y proyectar estabilidad.",
      },
    ],
    [],
  );

  return (
    <section className="section" aria-labelledby="transf-title">
      {/* Encabezado */}
      <div className="container u-text-center">
        <h2 id="transf-title">
          {ptrHeadline} <span className="accent">LOBRÁ</span>
        </h2>
        <p className="u-lead u-maxw-prose">{ptrSub}</p>
      </div>

      {/* Fila 1: 2 columnas (Antes | Después) */}
      <div className="container">
        <div className="l-heroGrid">
          {/* Columna: Antes */}
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

          {/* Columna: Después */}
          <article className="c-card" role="group" aria-labelledby="despues-title">
            <h3 id="despues-title">A la claridad</h3>
            <ul className="u-maxw-prose" role="list">
              {after.map((text, i) => (
                <li key={`a-${i}`} role="listitem">
                  <p>
                    {text.startsWith("Confianza") ? (
                      <>
                        <span className="accent">Confianza</span>
                        {text.replace("Confianza", "")}
                      </>
                    ) : text.startsWith("Orgullo") ? (
                      <>
                        <span className="accent">Orgullo</span>
                        {text.replace("Orgullo", "")}
                      </>
                    ) : text.startsWith("Tranquilidad") ? (
                      <>
                        <span className="accent">Tranquilidad</span>
                        {text.replace("Tranquilidad", "")}
                      </>
                    ) : text.startsWith("Alegría") ? (
                      <>
                        <span className="accent">Alegría</span>
                        {text.replace("Alegría", "")}
                      </>
                    ) : text.startsWith("Paz") ? (
                      <>
                        <span className="accent">Paz</span>
                        {text.replace("Paz", "")}
                      </>
                    ) : (
                      text
                    )}
                  </p>
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
              <li key={s.id} role="listitem" id={`step-mid-${s.id}`}>
                <article
                  className="c-card c-step"
                  role="group"
                  aria-labelledby={`step-mid-${s.id}-title`}
                >
                  <span className="c-step__num accent" aria-hidden="true">
                    {s.id}
                  </span>
                  <h4 id={`step-mid-${s.id}-title`} className="c-step__title">
                    {s.title}
                  </h4>
                  <p className="c-step__desc">{s.desc}</p>
                </article>
              </li>
            ))}
          </ol>

          {/* Á */}
          <article
            className="c-card c-step c-step--goal is-emphasis l-stoneGoal"
            role="group"
            aria-labelledby="step-mid-goal-title"
          >
            <span className="c-step__num accent" aria-hidden="true">
              Á
            </span>
            <h4 id="step-mid-goal-title" className="c-step__title">
              Alcance logrado
            </h4>
            <p className="c-step__desc">Claridad y tranquilidad que te devuelven la confianza.</p>
            <p className="c-step__desc fg-60">
              Control claro de tus ingresos que se traduce en paz, seguridad y orgullo de decidir sin
              miedo.
            </p>
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
    </section>
  );
}
