// components/home/Transformacion.tsx
"use client";

import type { ReactNode } from "react";

export default function Transformacion() {
  type Item = { id: string; before: string; after: ReactNode; label: string };

  const items: Item[] = [
    {
      id: "dinero",
      label: "Dinero y control financiero",
      before: "Ganas poco o ni siquiera sabes si realmente ganas.",
      after: (
        <>
          <span className="accent">Aumentas ingresos</span> y tienes claridad para saber qué funciona.
        </>
      ),
    },
    {
      id: "tiempo",
      label: "Tiempo y libertad",
      before: "Querías libertad, pero trabajas más que nunca.",
      after: (
        <>
          <span className="accent">Recuperas tiempo</span> al ordenar y automatizar tu operación.
        </>
      ),
    },
    {
      id: "estancamiento",
      label: "Frustración y estancamiento",
      before: "Estudias mucho, pero sigues estancado.",
      after: (
        <>
          <span className="accent">Avanzas</span> porque cada hora de aprendizaje se vuelve progreso tangible.
        </>
      ),
    },
    {
      id: "ansiedad",
      label: "Ansiedad y estrés",
      before: "Vives con estrés y dudas si vale la pena tu esfuerzo.",
      after: (
        <>
          <span className="accent">Ganas confianza</span> y claridad: sabes en qué etapa estás y qué sigue.
        </>
      ),
    },
    {
      id: "dependencia",
      label: "Dependencia de terceros",
      before: "Para todo necesitas ayuda costosa y ajena.",
      after: (
        <>
          <span className="accent">Decides y ejecutas</span> sin depender de otros.
        </>
      ),
    },
    {
      id: "comparacion",
      label: "Envidia y comparación",
      before: "Ves a otros avanzar más rápido y disfrutar la libertad que no tienes.",
      after: (
        <>
          <span className="accent">Muestras resultados</span>: ingresos, tiempo libre y seguridad.
        </>
      ),
    },
  ];

  return (
    <section className="section section--dark l-transformacion" aria-labelledby="transformacion-title">
      <div className="container u-text-center">
        <h2 id="transformacion-title">
          La transformación que logras con <span className="accent">LOBRÁ</span>
        </h2>
        <p className="u-small">De la confusión y el estrés a ingresos claros y tiempo libre.</p>
      </div>

      <div className="container">
        <ul className="grid-3 u-grid-equal" role="list">
          {items.map((it) => (
            <li key={it.id} role="listitem">
              <article
                className="c-card stack-3"
                role="group"
                aria-label={`Antes y después: ${it.label}`}
              >
                <p className="u-small">
                  <strong>Antes:</strong>{" "}
                  <span className="u-muted">{it.before}</span>
                </p>
                <p className="u-lead">
                  <strong>Después:</strong> {it.after}
                </p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
