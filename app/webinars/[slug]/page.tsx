// app/webinars/[slug]/page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWebinar } from "@/lib/webinars/load";
import SalesHero from "@/components/webinars/SalesHero";
import SalesClase from "@/components/webinars/SalesClase";
import { getCheckoutUrl } from "@/lib/ui_checkout/getCheckoutUrl";

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

// ---- Metadata

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const w = await getWebinar(slug);

  if (!w.sales) return {};
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

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const webinar = await getWebinar(slug);
  const { shared, sales } = webinar;
  if (!sales) notFound();

  const dateLabel = formatDateLabel(shared.startAt);
  const priceLabel = formatPriceLabel(shared.pricing.amountCents, shared.pricing.currency);

  // CTA → /checkout/[slug] con modo opcional si es recurrente
  const ctaHref = getCheckoutUrl(shared.slug, {
    mode: shared.pricing.interval === "recurring" ? "subscription" : "payment",
  });

  return (
    <main>
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
