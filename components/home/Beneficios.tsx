// components/home/Beneficios.tsx
"use client";

import type { ReactNode } from "react";

function IconCheck() {
  return (
    <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24">
      <path fill="currentColor" d="M9.5 16.2 5.8 12.5l-1.6 1.6 5.3 5.3L20 9.9l-1.6-1.6-8.9 7.9Z" />
    </svg>
  );
}
function IconSteps() {
  return (
    <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24">
      <path fill="currentColor" d="M4 17h6v-2H4v2Zm0-4h10v-2H4v2Zm0-4h16V7H4v2Z" />
    </svg>
  );
}
function IconSupport() {
  return (
    <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24">
      <path fill="currentColor" d="M12 2a7 7 0 0 0-7 7v1H3v6h6v-6H7V9a5 5 0 1 1 10 0v1h-2v6h6V10h-2V9a7 7 0 0 0-7-7Z" />
    </svg>
  );
}
function IconTools() {
  return (
    <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24">
      <path fill="currentColor" d="m21 7-2 2-4-4 2-2a5 5 0 0 0-6.2 6.2L3 16v5h5l7.8-7.8A5 5 0 0 0 21 7Z" />
    </svg>
  );
}

type Item = { icon: ReactNode; title: string; desc: string };

const items: Item[] = [
  { icon: <IconCheck />,  title: "Claridad financiera",   desc: "Entiende en minutos cómo está tu negocio sin perderte en hojas de cálculo." },
  { icon: <IconSteps />,  title: "Pasos accionables",     desc: "Guías simples para que sepas qué hacer primero y qué dejar de hacer." },
  { icon: <IconSupport />,title: "Acompañamiento",        desc: "No aprendes solo: cada paso está pensado para negocios reales en LATAM." },
  { icon: <IconTools />,  title: "Herramientas prácticas",desc: "Plantillas y recursos listos para usar que te ahorran tiempo y errores." },
];

export default function Beneficios() {
  return (
    <section className="l-beneficios" aria-labelledby="beneficios-title">
      <div className="container u-text-center">
        <h2 id="beneficios-title">Lo que obtienes</h2>
      </div>

      <div className="container">
        <ul className="l-beneficiosGrid" role="list">
          {items.map((it) => (
            <li key={it.title} role="listitem">
              <article className="c-card c-card--benefit" tabIndex={0}>
                <header>
                  <span className="c-card__icon" aria-hidden="true">{it.icon}</span>
                  <h3>{it.title}</h3>
                </header>
                <p className="u-small">{it.desc}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
