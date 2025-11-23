// components/home/FeaturedWebinar.tsx
/**
 * FeaturedWebinar — Render de webinar destacado (Client)
 * - Preserva la UI actual del bloque destacado.
 * - Fecha en zona horaria del cliente con Intl.DateTimeFormat.
 * - Analítica: featured_view (una vez) y cta_click.
 * - Sin JSON-LD inline; los schemas se manejan desde la capa SEO central.
 */

"use client";

import React, { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { renderAccent } from "@/lib/ui/renderAccent";
import type { FeaturedDTO, FulfillmentType } from "@/lib/dto/catalog";
import { track } from "@/lib/analytics/track";

// ============================
// Bloque A — Tipos y helpers
// ============================

type Props = {
  dto: FeaturedDTO; // Datos unificados del featured
  href: string; // Normalizado por el servidor: "/{slug}" o "/webinars"
};

function formatClientDate(iso?: string): { iso?: string; human?: string } {
  if (!iso) return {};
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return {};
  const human = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return { iso: d.toISOString(), human };
}

function pick<T = string>(obj: unknown, keys: string[]): T | undefined {
  const bag = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = bag?.[k];
    if (typeof v === "string" || typeof v === "number") return v as unknown as T;
    if (Array.isArray(v)) return v as unknown as T;
  }
  return undefined;
}

function pickTitle(dto: FeaturedDTO): string {
  return pick<string>(dto, ["title", "name"]) ?? "Webinar en vivo";
}

function pickSummary(dto: FeaturedDTO): string {
  return pick<string>(dto, ["summary", "description"]) ?? "Sesión en vivo para dueños de negocio.";
}

function pickImage(dto: FeaturedDTO): string | undefined {
  return pick<string>(dto, ["image_url", "imageUrl", "image"]);
}

function pickBullets(dto: FeaturedDTO): string[] | undefined {
  const v = pick<string[] | string>(dto, ["bullets"]);
  if (!v) return undefined;
  return Array.isArray(v) ? v : [v];
}

function pickPriceMXN(dto: FeaturedDTO): number | undefined {
  const cents = pick<number>(dto, ["price_total_cents"]);
  if (typeof cents === "number") return Math.round(cents / 100);
  const priceObj = (dto as unknown as { price?: { total?: number; total_currency?: string } }).price;
  if (priceObj && priceObj.total_currency === "MXN" && typeof priceObj.total === "number") {
    return priceObj.total;
  }
  const mxn = pick<number>(dto, ["priceMXN"]);
  return typeof mxn === "number" ? mxn : undefined;
}

function pickEyebrow(dto: FeaturedDTO): string | undefined {
  return pick<string>(dto, ["eyebrow"]);
}

function pickCtaLabel(dto: FeaturedDTO): string {
  return pick<string>(dto, ["cta_label", "ctaText"]) ?? "Quiero mi lugar";
}

// ============================
// Bloque B — Componente
// ============================

export default function FeaturedWebinar({ dto, href }: Props) {
  // Derivados seguros y memorizados
  const title = useMemo(() => pickTitle(dto), [dto]);
  const summary = useMemo(() => pickSummary(dto), [dto]);
  const imageUrl = useMemo(() => pickImage(dto), [dto]);
  const priceMXN = useMemo(() => pickPriceMXN(dto) ?? 490, [dto]);
  const eyebrow = useMemo(() => pickEyebrow(dto), [dto]);
  const bullets =
    useMemo(() => pickBullets(dto), [dto]) ??
    [
      "Claridad inmediata sobre tus ingresos.",
      "Detecta qué productos y clientes sostienen tu negocio.",
      "Reportes simples para ver tu crecimiento real.",
      "Decisiones basadas en datos.",
    ];
  const ctaLabel = useMemo(() => pickCtaLabel(dto), [dto]);

  const nextStartAt = (dto as unknown as { next_start_at?: string }).next_start_at;
  const { iso: dateISO, human: dateHuman } = useMemo(
    () => formatClientDate(nextStartAt),
    [nextStartAt],
  );

  // Analítica: featured_view una sola vez
  const viewedRef = useRef(false);
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    const sku = (dto as unknown as { sku?: string }).sku || "";
    const t: FulfillmentType =
      (dto as unknown as { type?: FulfillmentType }).type ?? "live_class";
    track("featured_view", { placement: "home_featured", sku, type: t });
  }, [dto]);

  // Click handler con analítica
  const onCtaClick = () => {
    const sku = (dto as unknown as { sku?: string }).sku || "";
    const t: FulfillmentType =
      (dto as unknown as { type?: FulfillmentType }).type ?? "live_class";
    track("cta_click", { placement: "home_featured", sku, type: t });
  };

  // ============================
  // Bloque C — Render
  // ============================

  return (
    <section className="section section--surface featured" aria-labelledby="featured-webinar-title">
      <div className="container">
        <div className="featured-grid" role="group" aria-label="Webinar destacado">
          {/* Card */}
          <article className="featured-card c-card shadow-soft" aria-describedby="featured-webinar-desc">
            <span className="badge badge--live" aria-label="En vivo">
              <span aria-hidden="true">●</span> EN VIVO
            </span>

            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}

            <h2 id="featured-webinar-title">{renderAccent(title)}</h2>

            <p className="featured-meta small">
              {dateHuman ? (
                <>
                  <span role="img" aria-hidden="true">
                    📅
                  </span>{" "}
                  <time dateTime={dateISO}>{dateHuman}</time>
                </>
              ) : (
                <>Próximamente</>
              )}
            </p>

            <p id="featured-webinar-desc" className="u-small">
              {renderAccent(summary)}
            </p>

            <ul className="list-check" role="list">
              {bullets.map((b, i) => (
                <li key={i}>{renderAccent(b)}</li>
              ))}
            </ul>

            {/* Fila de precio + CTA */}
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

            <p className="small">Aplica tu cupón en el checkout. Cupo limitado.</p>
          </article>

          {/* Imagen */}
          <div className="l-hero-imgCol" aria-hidden="true">
            <Image
              src={imageUrl || "/images/home/roberto-huerta-webinar-800x1000.jpg"}
              alt="Roberto Huerta, presentador del webinar"
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
    </section>
  );
}
