// components/webinars/SalesHero.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";

export type SalesHeroProps = {
  eyebrow: string;
  title: string;      // usa [[...]] para acentos
  subtitle: string;   // usa [[...]] para acentos
  dateLabel: string;  // derivado de startAt
  priceLabel: string; // derivado de pricing
  imgSrc: string;
  imgAlt: string;
  ctaHref: string;    // armado con pricing (price/product/sku)
  ctaText: string;
  note?: string;      // microcopy opcional bajo el botón
};

export default function SalesHero({
  eyebrow,
  title,
  subtitle,
  dateLabel,
  priceLabel,
  imgSrc,
  imgAlt,
  ctaHref,
  ctaText,
  note,
}: SalesHeroProps) {
  const track = (placement: string, label: string) => {
    try {
      window.dataLayer?.push({ event: "cta_click", placement, label });
    } catch {}
  };

  return (
    <section className="l-hero" aria-labelledby="webinar-hero-title">
      <div className="container">
        <div className="l-heroGrid">
          {/* Columna texto */}
          <div>
            <p className="small">{eyebrow}</p>

            <h1 id="webinar-hero-title">{renderAccent(title)}</h1>

            <p className="u-lead u-maxw-prose">{renderAccent(subtitle)}</p>

            <p className="small u-maxw-prose">
              <strong>Fecha y hora:</strong> {dateLabel}
              <br />
              <strong>Precio:</strong> {priceLabel}
            </p>

            <div className="cluster-3">
              <Link
                id="cta-register"
                href={ctaHref}
                className="c-btn c-btn--solid c-btn--pill"
                prefetch={false}
                onClick={() => track("product_page", "hero_cta")}
                aria-label={ctaText}
                aria-describedby="hero-cta-help"
              >
                {ctaText}
              </Link>

              <p id="hero-cta-help" className="small" style={{ color: "var(--fg-60)" }}>
                {note ?? "Empieza hoy con claridad y paz."}
              </p>
            </div>
          </div>

          {/* Columna imagen */}
          <div className="l-hero-imgCol">
            <Image
              src={imgSrc}
              alt={imgAlt}
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

/** Convierte [[texto]] en <span className="accent">texto</span> */
function renderAccent(input: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\[\[(.+?)\]\]/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(input)) !== null) {
    if (m.index > lastIndex) parts.push(input.slice(lastIndex, m.index));
    parts.push(<span key={m.index} className="accent">{m[1]}</span>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < input.length) parts.push(input.slice(lastIndex));
  return parts;
}
