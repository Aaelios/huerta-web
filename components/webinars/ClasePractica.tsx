// components/webinars/ClasePractica.tsx
"use client";

import Link from "next/link";
import { ReactNode, useCallback } from "react";

export type ClasePracticaProps = {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  leftTitle: ReactNode;
  bullets: ReactNode[];               // columna izquierda (problemas)
  deliverableTitle: ReactNode;
  deliverableBullets: ReactNode[];    // columna derecha (beneficios)
  info?: {
    duration?: ReactNode;
    modality?: ReactNode;
    requirements?: ReactNode;
  };
  priceLine?: ReactNode;              // ej. "Hoy $490 MXN · Cupo limitado"
  guarantee?: ReactNode;              // ej. "Garantía total..."
  ctaHref: string;
  ctaText?: string;
  leftIcon?: ReactNode;               // por defecto ⚠️
  rightIcon?: ReactNode;              // por defecto ✅
};

export default function ClasePractica({
  eyebrow,
  title,
  intro,
  leftTitle,
  bullets,
  deliverableTitle,
  deliverableBullets,
  info,
  priceLine,
  guarantee,
  ctaHref,
  ctaText = "Reservar mi lugar en la clase",
  leftIcon = "⚠️",
  rightIcon = "✅",
}: ClasePracticaProps) {
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
          <h2 id="cp-title">{title}</h2>
          {intro && <p className="u-lead">{intro}</p>}

          {/* Badge de precio + CTA arriba */}
          {priceLine && (
            <div className="u-inline-block u-mt-3">
              <span className="badge badge--accent">{priceLine}</span>
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
            <h3 id="cp-left-title">{leftTitle}</h3>
            <ul className="u-maxw-prose" role="list">
              {bullets?.map((node, i) => (
                <Li key={`cp-left-${i}`} icon={leftIcon} tone="warn">
                  {node}
                </Li>
              ))}
            </ul>
          </article>

          {/* Columna derecha: beneficios */}
          <article className="c-card" role="group" aria-labelledby="cp-right-title">
            <h3 id="cp-right-title">{deliverableTitle}</h3>
            <ul className="u-maxw-prose" role="list">
              {deliverableBullets?.map((node, i) => (
                <Li key={`cp-right-${i}`} icon={rightIcon} tone="ok">
                  {node}
                </Li>
              ))}
            </ul>

            {(info?.duration || info?.modality || info?.requirements) && (
              <div className="stack-2 u-mt-3">
                {info?.duration && (
                  <p className="small">
                    <strong>Duración:</strong> {info.duration}
                  </p>
                )}
                {info?.modality && (
                  <p className="small">
                    <strong>Modalidad:</strong> {info?.modality}
                  </p>
                )}
                {info?.requirements && (
                  <p className="small">
                    <strong>Requisitos:</strong> {info?.requirements}
                  </p>
                )}
              </div>
            )}
          </article>
        </div>

        {/* CTA abajo */}
        <div className="u-text-center u-mt-6">
          {priceLine && (
            <div className="u-inline-block u-mb-3">
              <span className="badge badge--accent">{priceLine}</span>
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
                <strong>Garantía total:</strong> {guarantee}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
