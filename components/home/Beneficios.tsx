// components/home/Beneficios.tsx
"use client";
import React, { useState } from "react";

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

type Item = { icon: React.ReactNode; title: string; desc: string };

const items: Item[] = [
  { icon: <IconCheck />,  title: "Claridad financiera",  desc: "Entiende en minutos cómo está tu negocio sin perderte en hojas de cálculo." },
  { icon: <IconSteps />,  title: "Pasos accionables",    desc: "Guías simples para que sepas qué hacer primero y qué dejar de hacer." },
  { icon: <IconSupport />,title: "Acompañamiento",       desc: "No aprendes solo: cada paso está pensado para negocios reales en LATAM." },
  { icon: <IconTools />,  title: "Herramientas prácticas", desc: "Plantillas y recursos listos para usar que te ahorran tiempo y errores." },
];

function Card({ children }: { children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <article
      className="card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: "100%",
        borderRadius: 12,
        padding: "18px 22px",
        border: "1px solid rgba(255,255,255,.10)",
        transition: "transform .15s ease, box-shadow .15s ease",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hovered ? "0 2px 8px rgba(0,0,0,.06)" : "none",
        outlineOffset: 2,
      }}
    >
      {children}
    </article>
  );
}

export default function Beneficios() {
  return (
    <section
      aria-labelledby="beneficios-title"
      style={{
        background: "var(--surface)",
        padding: "clamp(48px,6vw,72px) 0",
        borderBottom: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <div className="container" style={{ textAlign: "center" }}>
        <h2
          id="beneficios-title"
          style={{ marginBottom: 20, fontSize: "clamp(1.6rem,6vw,2.2rem)" }}
        >
          Lo que obtienes
        </h2>

        <ul
          role="list"
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 auto",
            maxWidth: "var(--maxw)",
            display: "grid",
            gap: "clamp(16px,2.5vw,24px)",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            textAlign: "left",
          }}
        >
          {items.map((it) => (
            <li role="listitem" key={it.title}>
              <Card>
                <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: "rgba(255,255,255,.06)",
                      color: "var(--primary-1)",
                      border: "1px solid rgba(255,255,255,.14)",
                      flex: "0 0 34px",
                    }}
                  >
                    {it.icon}
                  </span>
                  <h5 style={{ margin: 0, fontSize: 21 }}>{it.title}</h5>
                </header>

                <p style={{ margin: 0, color: "var(--fg-70)" }}>{it.desc}</p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
