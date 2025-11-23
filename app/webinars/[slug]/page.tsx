// app/webinars/[slug]/page.tsx
// Página de detalle de webinars y módulos (venta pública).
// Metadata SEO centralizada vía buildMetadata (seoConfig + buildMetadata).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWebinar } from "@/lib/webinars/load";
import { loadWebinars } from "@/lib/webinars/loadWebinars";
import { loadModulesIndex } from "@/lib/modules/loadModulesIndex";
import SalesHero from "@/components/webinars/SalesHero";
import SalesClase from "@/components/webinars/SalesClase";
import { getCheckoutUrl } from "@/lib/ui_checkout/getCheckoutUrl";
import { loadModuleDetail } from "@/lib/modules/loadModuleDetail";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { ViewContentTracker } from "@/components/analytics/ViewContentTracker";
import { buildMetadata } from "@/lib/seo/buildMetadata";

// ISR para páginas de detalle de webinar/módulo (venta pública)
export const revalidate = 3600;

/**
 * generateStaticParams
 * Pre-genera páginas de:
 * - Webinars definidos en data/webinars.jsonc
 * - Módulos/bundles cuyo pageSlug empieza con "webinars/"
 * Normaliza pageSlug → [slug] removiendo el prefijo "webinars/".
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const [webinarsMap, modulesIndex] = await Promise.all([
    loadWebinars(),
    loadModulesIndex(),
  ]);

  const webinarSlugs = Object.keys(webinarsMap);

  const moduleSlugs = modulesIndex
    .map((item) => item.pageSlug)
    .filter((pageSlug) => pageSlug.startsWith("webinars/"))
    .map((pageSlug) => pageSlug.replace(/^webinars\//, ""));

  const uniqueSlugs = Array.from(new Set([...webinarSlugs, ...moduleSlugs]));

  return uniqueSlugs.map((slug) => ({ slug }));
}

// ---- Helpers

function formatDateLabel(iso: string): string {
  const dt = new Date(iso);
  const dateStr = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Mexico_City",
  }).format(dt);
  const timeStr = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Mexico_City",
  }).format(dt);
  return `${capitalize(dateStr)} · ${timeStr} CDMX`;
}

function formatPriceLabel(amountCents: number, currency: string): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function resolveModulePageSlug(slug: string): string {
  return slug.startsWith("webinars/") ? slug : `webinars/${slug}`;
}

// ---- Metadata (SEO centralizado)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pathname = `/webinars/${slug}`;

  // 1) Intento como MÓDULO / BUNDLE (sales_pages.jsonc)
  const modulePageSlug = resolveModulePageSlug(slug);
  const moduleDetail = await loadModuleDetail(modulePageSlug);

  if (moduleDetail?.sales?.seo) {
    const seo = moduleDetail.sales.seo;
    return buildMetadata({
      typeId: "module",
      pathname,
      title: seo.title, // título crudo, sin "| LOBRÁ"
      description: seo.description,
    });
  }

  // 2) Fallback: WEBINAR / LIVE_CLASS (webinars.jsonc)
  const webinar = await getWebinar(slug);

  if (!webinar.sales || !webinar.sales.seo) {
    // Sin SEO explícito: usa defaults del tipo "webinar".
    return buildMetadata({
      typeId: "webinar",
      pathname,
    });
  }

  const seo = webinar.sales.seo;

  return buildMetadata({
    typeId: "webinar",
    pathname,
    title: seo.title, // crudo
    description: seo.description,
  });
}

// ---- Page

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1) MÓDULO / BUNDLE
  const modulePageSlug = resolveModulePageSlug(slug);
  const moduleDetail = await loadModuleDetail(modulePageSlug);

  if (moduleDetail) {
    return (
      <main>
        <ViewContentTracker
          contentType="bundle"
          contentId={moduleDetail.sku}
          title={moduleDetail.title}
        />
        <ModuleLayout module={moduleDetail} />
      </main>
    );
  }

  // 2) WEBINAR / LIVE_CLASS
  const webinar = await getWebinar(slug);
  const { shared, sales } = webinar;
  if (!sales) notFound();

  const dateLabel = formatDateLabel(shared.startAt);
  const priceLabel = formatPriceLabel(
    shared.pricing.amountCents,
    shared.pricing.currency,
  );

  const ctaHref = getCheckoutUrl(shared.slug, {
    mode: shared.pricing.interval === "recurring" ? "subscription" : "payment",
  });

  return (
    <main>
      <ViewContentTracker
        contentType="live_class"
        contentId={shared.sku}
        title={sales.hero.title}
      />

      <SalesHero
        eyebrow={sales.hero.eyebrow}
        title={sales.hero.title}
        subtitle={sales.hero.subtitle}
        dateLabel={dateLabel}
        priceLabel={priceLabel}
        imgSrc={sales.hero.heroImageSrc}
        imgAlt={sales.hero.heroImageAlt}
        ctaHref={ctaHref}
        ctaText={sales.hero.ctaText}
        note={sales.hero.note}
      />

      <SalesClase
        eyebrow={sales.clasePractica.eyebrow}
        title={sales.clasePractica.title}
        intro={sales.clasePractica.intro}
        leftTitle={sales.clasePractica.leftTitle}
        bullets={sales.clasePractica.bullets}
        deliverableTitle={sales.clasePractica.deliverableTitle}
        deliverableBullets={sales.clasePractica.deliverableBullets}
        priceLine={sales.clasePractica.priceLine}
        guarantee={sales.clasePractica.guarantee}
        ctaHref={ctaHref}
        ctaText={sales.clasePractica.ctaText}
      />
    </main>
  );
}
