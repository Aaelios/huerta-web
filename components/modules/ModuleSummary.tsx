// components/modules/ModuleSummary.tsx
// Propósito: Sección de resumen de módulo usando bloques de SalesPage.

import React from "react";
import type { SalesPage } from "@/lib/views/loadSalesPageBySku";
import styles from "@/components/webinars/hub/WebinarsHub.module.css";

type ModuleSummaryProps = {
  sales: SalesPage;
};

export function ModuleSummary({ sales }: ModuleSummaryProps) {
  // Normalizamos a arrays seguros
  const paraQuienList = Array.isArray(sales.paraQuien) ? sales.paraQuien : [];
  const beneficiosList = Array.isArray(sales.beneficios) ? sales.beneficios : [];
  const aprendizajeList = Array.isArray(sales.aprendizaje) ? sales.aprendizaje : [];
  const incluyeList = Array.isArray(sales.incluye) ? sales.incluye : [];

  const hasParaQuien = paraQuienList.length > 0;
  const hasBeneficios = beneficiosList.length > 0;
  const hasAprendizaje = aprendizajeList.length > 0;
  const hasIncluye = incluyeList.length > 0;

  const hasAnyBlock =
    hasBeneficios || hasIncluye || hasParaQuien || hasAprendizaje;

  if (!hasAnyBlock) return null;

  return (
    <section
      className={`section ${styles.hub}`}
      aria-labelledby="module-summary-label"
    >
      <div className="container">
        {/* Micro-header, NO H2 grande */}
        <p
          id="module-summary-label"
          className="small u-text-center u-mb-8"
          style={{ opacity: 0.7 }}
        >
          Más detalle del módulo
        </p>

        {/* Dos bloques grandes */}
        <div className="grid-2 u-grid-equal">
          {/* Bloque A: Para quién es + Beneficios clave */}
          {(hasParaQuien || hasBeneficios) && (
            <article
              className="c-card stack-4"
              role="group"
              aria-label="Para quién es este módulo y beneficios clave"
            >
              {hasParaQuien && (
                <div>
                  <h3 className="u-mb-3">
                    {renderAccent("¿Para quién?")}
                  </h3>
                  <ul className="u-maxw-prose" role="list">
                    {paraQuienList.map((item, index) => (
                      <Li key={`pq-${index.toString()}`} icon="✅">
                        {renderAccent(item)}
                      </Li>
                    ))}
                  </ul>
                </div>
              )}

              {hasBeneficios && (
                <div>
                  <h3 className="u-mb-3">
                    {renderAccent("Beneficios")}
                  </h3>
                  <ul className="u-maxw-prose" role="list">
                    {beneficiosList.map((item, index) => (
                      <Li key={`b-${index.toString()}`} icon="✅">
                        {renderAccent(item)}
                      </Li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          )}

          {/* Bloque B: Qué incluye + Lo que aprenderás */}
          {(hasIncluye || hasAprendizaje) && (
            <article
              className="c-card stack-4"
              role="group"
              aria-label="Qué incluye el programa y lo que aprenderás"
            >
              {hasIncluye && (
                <div>
                  <h3 className="u-mb-3">
                    {renderAccent("Incluye")}
                  </h3>
                  <ul className="u-maxw-prose" role="list">
                    {incluyeList.map((item, index) => (
                      <Li key={`i-${index.toString()}`} icon="✅">
                        {renderAccent(item)}
                      </Li>
                    ))}
                  </ul>
                </div>
              )}

              {hasAprendizaje && (
                <div>
                  <h3 className="u-mb-3">
                    {renderAccent("Aprenderás")}
                  </h3>
                  <ul className="u-maxw-prose" role="list">
                    {aprendizajeList.map((item, index) => (
                      <Li key={`a-${index.toString()}`} icon="✅">
                        {renderAccent(item)}
                      </Li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          )}
        </div>
      </div>
    </section>
  );
}

type LiProps = {
  icon: React.ReactNode;
  children: React.ReactNode;
};

function Li({ icon, children }: LiProps) {
  return (
    <li role="listitem" className="c-li">
      <span aria-hidden="true" className="c-li__icon c-li__icon--ok">
        {icon}
      </span>
      <span className="c-li__text">{children}</span>
    </li>
  );
}

/** Convierte [[texto]] en <span className="accent">texto</span>. */
function renderAccent(input: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\[\[(.+?)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      parts.push(input.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="accent">
        {match[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    parts.push(input.slice(lastIndex));
  }

  return parts;
}
