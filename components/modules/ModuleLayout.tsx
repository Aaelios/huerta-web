// components/modules/ModuleLayout.tsx
// Propósito: Orquestar la página de detalle de módulo (bundle) usando ModuleHero, ModuleSummary y ModuleClasses.

import React from "react";
import Link from "next/link";
import type { ModuleDetail } from "@/lib/modules/loadModuleDetail";
import { ModuleHero } from "@/components/modules/ModuleHero";
import { ModuleSummary } from "@/components/modules/ModuleSummary";
import { ModuleClasses } from "@/components/modules/ModuleClasses";
import { ModuleStatement } from "@/components/modules/ModuleStatement";
import { StickyCTA } from "@/components/modules/StickyCTA";
import { LocalDateTime } from "@/components/modules/common/LocalDateTime";

type ModuleLayoutProps = {
  module: ModuleDetail;
};

export function ModuleLayout({ module }: ModuleLayoutProps) {
  const dateLabel = formatDateTimeLabel(module.nextStartAt);
  const priceLabel = formatPriceLabel(
    module.pricing.amountCents,
    module.pricing.currency
  );

  /**
   * Decisión de UI local:
   * - Usamos un CTA genérico hacia checkout por SKU.
   * - Si en el futuro se usa Stripe Embedded u otra ruta, este href se puede centralizar.
   */
  /**
   * Decisión de UI local:
   * - Para módulos, construimos el checkout por slug público, no por SKU.
   * - Tomamos la última parte de pageSlug (ej. "webinars/ms-foo" → "ms-foo").
   * - Si por alguna razón no hubiera pageSlug, caemos al checkout por SKU.
   */
  const pageSlug = module.pageSlug;
  const checkoutSlug =
    typeof pageSlug === "string" && pageSlug.length > 0
      ? pageSlug.split("/").pop() ?? module.sku
      : module.sku;

  const ctaHref = `/checkout/${checkoutSlug}?mode=payment`;
  const hero = module.sales.hero;

  // Datos para el bloque introductorio corto debajo del hero.
  const beneficiosList = Array.isArray(module.sales.beneficios)
    ? module.sales.beneficios
    : [];
  const introBullets = beneficiosList.slice(0, 2);

  // CTA intermedio configurable desde sales (ctaMid) con fallbacks seguros.
  const ctaMid = module.sales.ctaMid;

  const ctaMidTitle =
    ctaMid?.title ??
    "¿Listo para dejar de adivinar y [[tener claridad financiera]]?";
  const ctaMidBody =
    ctaMid?.body ??
    "Domina ingresos, controla egresos y toma decisiones con datos, no con ansiedad. Empieza con el módulo completo y evita aprender solo por partes.";

  return (
    <main aria-labelledby="module-hero-title">
      {/* 1) Hero principal */}
      <ModuleHero
        module={module}
        dateLabel={dateLabel}
        priceLabel={priceLabel}
        ctaHref={ctaHref}
      />

      {/* 2) Resumen del módulo: statement responsivo y limpio */}
      <ModuleStatement text={module.sales.statement?.text ?? ""} />

      {/* 3–4) Bloques de resumen detallado */}
      <ModuleSummary sales={module.sales} />

      {/* 5) CTA intermedio, antes del detalle de clases */}
      <section
        className="section section--surface"
        aria-labelledby="module-cta-mid-heading"
        style={{
          paddingTop: "var(--space-5)",
          paddingBottom: "var(--space-8)",
        }}
      >
        <div className="container">
          <div
            className="l-ctaInner l-ctaInner--bare"
            style={{
              maxWidth: "860px",
              marginInline: "auto",
              padding: "3rem 2.5rem 3.5rem",
              borderRadius: "28px",
              backgroundColor: "var(--surface-elevated)",
              border: "1px solid var(--border-dark-1)",
              boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
              textAlign: "center",
              color: "var(--text-on-dark)",
            }}
          >
            <h2
              id="module-cta-mid-heading"
              style={{
                margin: 0,
                fontSize: "clamp(28px, 3.8vw, 36px)",
                lineHeight: 1.25,
              }}
            >
              {renderAccent(ctaMidTitle)}
            </h2>

            <p
              className="u-maxw-prose"
              style={{
                margin: "var(--space-4) auto var(--space-5)",
                fontSize: "1.12rem",
                color: "var(--text-on-dark)",
                opacity: 0.92,
              }}
            >
              {renderAccent(ctaMidBody)}
            </p>

            <div
              className="u-maxw-prose"
              style={{ margin: "0 auto var(--space-6)" }}
            >
              <p
                className="small u-mb-1"
                style={{
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.85,
                }}
              >
                Inicio del módulo
              </p>

              <p style={{ fontWeight: 600, marginBottom: "var(--space-3)" }}>
                <LocalDateTime iso={module.nextStartAt} />
              </p>

              <p className="small u-mb-1" style={{ opacity: 0.85 }}>
                Inversión total
              </p>

              <p
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  marginBottom: "var(--space-2)",
                }}
              >
                {priceLabel}
              </p>

              <p
                className="small"
                style={{
                  color: "var(--accent)",
                  opacity: 0.9,
                }}
              >
                La forma más simple y completa de tomar control de tu dinero.
              </p>
            </div>

            <Link
              href={ctaHref}
              className="c-btn c-btn--solid c-btn--pill"
              prefetch={false}
              aria-label={hero.ctaText}
              style={{
                paddingInline: "3.25rem",
                paddingBlock: "1rem",
                fontSize: "1.05rem",
                fontWeight: 600,
              }}
            >
              {hero.ctaText}
            </Link>
          </div>
        </div>
      </section>

      {/* 6) Clases incluidas en el módulo */}
      <ModuleClasses module={module} />

      {/* 7) CTA final compacto de refuerzo */}
      <section
        className="section"
        aria-label="Confirmar inscripción al módulo completo"
        style={{
          paddingTop: "var(--space-4)",
          paddingBottom: "var(--space-6)",
        }}
      >
        <div className="container">
          <div className="u-text-center">
            <Link
              href={ctaHref}
              className="c-btn c-btn--solid c-btn--pill"
              prefetch={false}
              aria-label={hero.ctaText}
            >
              {hero.ctaText}
            </Link>
          </div>
        </div>
      </section>

      {/* 8) Sticky CTA flotante para móviles */}
      <StickyCTA ctaText={hero.ctaText} ctaHref={ctaHref} />
    </main>
  );
}

/**
 * Formatea amountCents + currency a una etiqueta legible para UI.
 */
function formatPriceLabel(
  amountCents: number,
  currency: ModuleDetail["pricing"]["currency"]
): string {
  const amount = amountCents / 100;

  try {
    const formatter = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });

    return formatter.format(amount);
  } catch {
    // Fallback simple en caso de error con Intl.
    return `${amount.toFixed(0)} ${currency}`;
  }
}

/**
 * Devuelve una etiqueta legible para la próxima fecha/hora del módulo.
 * Si no hay fecha, regresa un mensaje genérico.
 *
 * Nota: esto sigue ejecutándose en server para el Hero.
 * La hora del cliente se resuelve con LocalDateTime en las secciones donde se usa.
 */
function formatDateTimeLabel(nextStartAt: string | null): string {
  if (!nextStartAt) {
    return "Fechas por anunciar";
  }

  const date = new Date(nextStartAt);
  if (Number.isNaN(date.getTime())) {
    return "Fecha por confirmar";
  }

  try {
    const formatter = new Intl.DateTimeFormat("es-MX", {
      dateStyle: "full",
      timeStyle: "short",
    });
    return formatter.format(date);
  } catch {
    return "Fecha por confirmar";
  }
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