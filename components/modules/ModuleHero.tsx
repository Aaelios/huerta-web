// components/modules/ModuleHero.tsx
// Propósito: Hero principal para páginas de detalle de módulo (bundle) usando ModuleDetail + SalesPage.hero.

"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import type { ModuleDetail } from "@/lib/modules/loadModuleDetail";

type ModuleHeroProps = {
  module: ModuleDetail;
  dateLabel: string;
  priceLabel: string;
  ctaHref: string;
};

export function ModuleHero({
  module,
  dateLabel,
  priceLabel,
  ctaHref,
}: ModuleHeroProps) {
  const { hero } = module.sales;

  const track = (placement: string, label: string) => {
    try {
      window.dataLayer?.push({ event: "cta_click", placement, label });
    } catch {
      // Silenciar errores de tracking en cliente.
    }
  };

  return (
    <section className="l-hero" aria-labelledby="module-hero-title">
      <div className="container">
        <div className="l-heroGrid">
          {/* Columna texto */}
          <div>
            <p className="small">{hero.eyebrow}</p>

            <h1 id="module-hero-title">{renderAccent(hero.title)}</h1>

            <p className="u-lead u-maxw-prose">
              {renderAccent(hero.subtitle)}
            </p>

            <p className="small u-maxw-prose">
              <strong>Inicio del módulo:</strong> {dateLabel}
              <br />
              <strong>Inversión:</strong> {priceLabel}
            </p>

            <div className="cluster-3">
              <Link
                id="cta-module-register"
                href={ctaHref}
                className="c-btn c-btn--solid c-btn--pill"
                prefetch={false}
                onClick={() => track("module_page", "module_hero_cta")}
                aria-label={hero.ctaText}
                aria-describedby="module-hero-cta-help"
              >
                {hero.ctaText}
              </Link>

              <p
                id="module-hero-cta-help"
                className="small"
                style={{ color: "var(--fg-60)" }}
              >
                {hero.note ?? "Empieza hoy con claridad y paz."}
              </p>
            </div>
          </div>

          {/* Columna imagen */}
          <div className="l-hero-imgCol">
            <Image
              src={hero.image.src}
              alt={hero.image.alt}
              width={800}
              height={1000}
              priority
              fetchPriority="high"
              quality={70}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
              decoding="async"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEwMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMDAwIiBmaWxsPSIjMTgxODIwIi8+PC9zdmc+"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </div>
      </div>
    </section>
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
