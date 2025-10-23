// components/home/FeaturedOneToOne.tsx
/**
 * FeaturedOneToOne — Render de 1-a-1 destacado (Client)
 * - Título, resumen, precio y CTA.
 * - Analítica: featured_view (una vez) y cta_click.
 * - JSON-LD: schema.org/Service.
 */

"use client";

import React, { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { FeaturedDTO, FulfillmentType } from "@/lib/dto/catalog";
import { track } from "@/lib/analytics/track";
import { renderAccent } from "@/lib/ui/renderAccent";

// ============================
// Bloque A — Tipos y helpers
// ============================

type Props = {
  dto: FeaturedDTO;
  href: string;
};

function pick<T = string>(obj: unknown, keys: string[]): T | undefined {
  const bag = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = bag?.[k];
    if (typeof v === "string" || typeof v === "number") return v as unknown as T;
  }
  return undefined;
}

function pickTitle(dto: FeaturedDTO): string {
  return pick<string>(dto, ["title", "name"]) ?? "Asesoría 1-a-1";
}

function pickSummary(dto: FeaturedDTO): string {
  return (
    pick<string>(dto, ["summary", "description"]) ??
    "Sesión privada de 30 minutos enfocada en tu negocio."
  );
}

function pickImage(dto: FeaturedDTO): string | undefined {
  return pick<string>(dto, ["image_url", "imageUrl", "image"]);
}

function pickPriceMXN(dto: FeaturedDTO): number | undefined {
  const priceObj = (dto as unknown as { price?: { total?: number; total_currency?: string } }).price;
  if (priceObj && priceObj.total_currency === "MXN" && typeof priceObj.total === "number") {
    return priceObj.total;
  }
  const mxn = pick<number>(dto, ["priceMXN"]);
  return typeof mxn === "number" ? mxn : undefined;
}

function pickCtaLabel(dto: FeaturedDTO): string {
  return pick<string>(dto, ["cta_label", "ctaText"]) ?? "Agendar";
}

// ============================
// Bloque B — Componente
// ============================

export default function FeaturedOneToOne({ dto, href }: Props) {
  const title = useMemo(() => pickTitle(dto), [dto]);
  const summary = useMemo(() => pickSummary(dto), [dto]);
  const imageUrl = useMemo(() => pickImage(dto), [dto]);
  const priceMXN = useMemo(() => pickPriceMXN(dto) ?? 1490, [dto]);
  const ctaLabel = useMemo(() => pickCtaLabel(dto), [dto]);

  // Analítica: featured_view una sola vez
  const viewedRef = useRef(false);
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    const sku = (dto as unknown as { sku?: string }).sku || "";
    const t: FulfillmentType =
      (dto as unknown as { type?: FulfillmentType }).type ?? "one_to_one";
    track("featured_view", { placement: "home_featured", sku, type: t });
  }, [dto]);

  // JSON-LD Service
  const jsonLd = useMemo(() => {
    const sku = (dto as unknown as { sku?: string }).sku || "";
    const img = imageUrl ? [imageUrl] : undefined;
    const base: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: title,
      description: summary,
      ...(img ? { image: img } : {}),
      ...(sku ? { sku } : {}),
      offers: {
        "@type": "Offer",
        priceCurrency: "MXN",
        price: priceMXN,
        url: href,
        availability: "https://schema.org/InStock",
      },
      provider: { "@type": "Organization", name: "Huerta Consulting" },
      areaServed: "MX",
    };
    return JSON.stringify(base);
  }, [dto, href, title, summary, priceMXN, imageUrl]);

  // Click handler con analítica
  const onCtaClick = () => {
    const sku = (dto as unknown as { sku?: string }).sku || "";
    const t: FulfillmentType =
      (dto as unknown as { type?: FulfillmentType }).type ?? "one_to_one";
    track("cta_click", { placement: "home_featured", sku, type: t });
  };

  // ============================
  // Bloque C — Render
  // ============================

  return (
    <section className="section section--surface featured" aria-labelledby="featured-121-title">
      <div className="container">
        <div className="featured-grid" role="group" aria-label="Asesoría 1-a-1 destacada">
          <article className="featured-card c-card shadow-soft" aria-describedby="featured-121-desc">
            <h2 id="featured-121-title">{renderAccent(title)}</h2>

            <p id="featured-121-desc" className="u-small">
              {renderAccent(summary)}
            </p>

            <div className="cluster-4" aria-label="Acciones">
              <div className="featured-price price" aria-label="Precio">
                ${priceMXN} MXN
              </div>
              <Link
                href={href}
                className="c-btn c-btn--solid c-btn--pill"
                onClick={onCtaClick}
                aria-label={`${ctaLabel}: ${title}`}
              >
                {ctaLabel}
              </Link>
            </div>
          </article>

          <div className="l-hero-imgCol" aria-hidden="true">
            <Image
              src={imageUrl || "/images/home/default-121.jpg"}
              alt="Asesoría personalizada uno a uno"
              width={800}
              height={1000}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 1200px) 520px, (min-width: 768px) 60vw, 90vw"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </section>
  );
}
