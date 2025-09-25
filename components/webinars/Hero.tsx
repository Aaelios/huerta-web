// components/webinars/Hero.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

export type HeroProps = {
  eyebrow: string;
  title: ReactNode;      // permite <span className="accent">...</span>
  subtitle: ReactNode;   // idem
  dateLabel: string;
  priceLabel: string;
  imgSrc: string;
  imgAlt: string;
  ctaHref: string;
  ctaText: string;
  note?: ReactNode;      // microcopy opcional bajo el botón
};

export default function Hero({
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
}: HeroProps) {
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

            <h1 id="webinar-hero-title">{title}</h1>

            <p className="u-lead u-maxw-prose">{subtitle}</p>

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
