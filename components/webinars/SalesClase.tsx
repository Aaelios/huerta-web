// components/webinars/SalesClase.tsx
"use client";

import Link from "next/link";
import React, { ReactNode, useCallback } from "react";

export type SalesClaseProps = {
  eyebrow: string;
  title: string;                 // usa [[...]] para acentos
  intro?: string;                // idem
  leftTitle: string;             // [[...]] permitido
  bullets: string[];             // columna izquierda (problemas) - [[...]] permitido
  deliverableTitle: string;      // [[...]] permitido
  deliverableBullets: string[];  // columna derecha (beneficios) - [[...]] permitido
  priceLine?: string;            // ej. "Hoy $490 MXN · Cupo limitado"
  guarantee?: string;            // ej. "Garantía total..."
  ctaHref: string;
  ctaText?: string;
  leftIcon?: ReactNode;          // por defecto ⚠️
  rightIcon?: ReactNode;         // por defecto ✅
};

export default function SalesClase({
  eyebrow,
  title,
  intro,
  leftTitle,
  bullets,
  deliverableTitle,
  deliverableBullets,
  priceLine,
  guarantee,
  ctaHref,
  ctaText = "Reservar mi lugar en la clase",
  leftIcon = "⚠️",
  rightIcon = "✅",
}: SalesClaseProps) {
  const track = useCallback((placement: string) => {
    try {
      window.dataLayer?.push({ event: "cta_click", placement, label: "clase_practica_cta" });
    } catch {}
  }, []);

  const Li = ({ icon, children, tone }: { icon: ReactNode; children: ReactNode; tone: "warn" | "ok" }) => (
    <li role="listitem" className="c-li">
      <span
        aria-hidden="true"
        className={`c-li__icon ${tone === "warn" ? "c-li__icon--warn" : "c-li__icon--ok"}`}
      >
        {icon}
      </span>
      <span className="c-li__text">{children}</span>
    </li>
  );

  return (
    <section className="section" aria-labelledby="cp-title">
      <div className="container">
        {/* Encabezado */}
        <header className="u-text-center u-maxw-prose">
          <p className="small">{eyebrow}</p>
          <h2 id="cp-title">{renderAccent(title)}</h2>
          {intro && <p className="u-lead">{renderAccent(intro)}</p>}

          {/* Badge de precio + CTA arriba */}
          {priceLine && (
            <div className="u-inline-block u-mt-3">
              <span className="badge badge--accent">{renderAccent(priceLine)}</span>
            </div>
          )}

          <div className="cluster-3 u-mt-3">
            <Link
              href={ctaHref}
              className="c-btn c-btn--solid c-btn--pill"
              prefetch={false}
              onClick={() => track("clase_practica_top")}
              aria-label={ctaText}
              aria-describedby="cp-cta-top-help"
            >
              {ctaText}
            </Link>
            <p id="cp-cta-top-help" className="small u-color-subtle">
              Empieza hoy con claridad y paz.
            </p>
          </div>
        </header>

        {/* Contenido principal */}
        <div className="l-transformacionGrid u-mt-6">
          {/* Columna izquierda: problemas */}
          <article className="c-card" role="group" aria-labelledby="cp-left-title">
            <h3 id="cp-left-title">{renderAccent(leftTitle)}</h3>
            <ul className="u-maxw-prose" role="list">
              {bullets?.map((txt, i) => (
                <Li key={`cp-left-${i}`} icon={leftIcon} tone="warn">
                  {renderAccent(txt)}
                </Li>
              ))}
            </ul>
          </article>

          {/* Columna derecha: beneficios */}
          <article className="c-card" role="group" aria-labelledby="cp-right-title">
            <h3 id="cp-right-title">{renderAccent(deliverableTitle)}</h3>
            <ul className="u-maxw-prose" role="list">
              {deliverableBullets?.map((txt, i) => (
                <Li key={`cp-right-${i}`} icon={rightIcon} tone="ok">
                  {renderAccent(txt)}
                </Li>
              ))}
            </ul>
          </article>
        </div>

        {/* CTA abajo */}
        <div className="u-text-center u-mt-6">
          {priceLine && (
            <div className="u-inline-block u-mb-3">
              <span className="badge badge--accent">{renderAccent(priceLine)}</span>
            </div>
          )}

          <div className="cluster-3">
            <Link
              href={ctaHref}
              className="c-btn c-btn--outline c-btn--pill"
              prefetch={false}
              onClick={() => track("clase_practica_bottom")}
              aria-label={ctaText}
              aria-describedby="cp-cta-bottom-help"
            >
              {ctaText}
            </Link>
            <p id="cp-cta-bottom-help" className="small u-color-subtle">
              Empieza hoy con claridad y paz.
            </p>
          </div>

          {/* Garantía debajo del CTA inferior */}
          {guarantee && (
            <div className="c-note u-maxw-prose u-mt-3" role="note" aria-label="Garantía">
              <p className="small">
                <strong>Garantía total:</strong> {renderAccent(guarantee)}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Convierte [[texto]] en <span className="accent">texto</span> */
function renderAccent(input: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\[\[(.+?)\]\]/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(input)) !== null) {
    if (m.index > lastIndex) parts.push(input.slice(lastIndex, m.index));
    parts.push(
      <span key={m.index} className="accent">
        {m[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < input.length) parts.push(input.slice(lastIndex));
  return parts;
}
