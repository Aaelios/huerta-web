// app/webinars/[slug]/page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWebinar } from "@/lib/webinars/load";
import SalesHero from "@/components/webinars/SalesHero";
import SalesClase from "@/components/webinars/SalesClase";
import { getCheckoutUrl } from "@/lib/ui_checkout/getCheckoutUrl";
import { loadModuleDetail } from "@/lib/modules/loadModuleDetail";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { ViewContentTracker } from "@/components/analytics/ViewContentTracker";

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

// ---- Metadata

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const modulePageSlug = resolveModulePageSlug(slug);
  const moduleDetail = await loadModuleDetail(modulePageSlug);

  if (moduleDetail?.sales?.seo) {
    const seo = moduleDetail.sales.seo;
    return {
      title: seo.title,
      description: seo.description,
      alternates: { canonical: seo.canonical },
      openGraph: {
        title: seo.title,
        description: seo.description,
        type: "article",
        locale: "es_MX",
        url: seo.canonical,
      },
      robots: { index: true, follow: true },
    };
  }

  const w = await getWebinar(slug);

  if (!w.sales || !w.sales.seo) return {};

  return {
    title: w.sales.seo.title,
    description: w.sales.seo.description,
    alternates: { canonical: w.sales.seo.canonical },
    openGraph: {
      title: w.sales.seo.title,
      description: w.sales.seo.description,
      type: "article",
      locale: "es_MX",
      url: w.sales.seo.canonical,
    },
    robots: { index: true, follow: true },
  };
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
    shared.pricing.currency
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
