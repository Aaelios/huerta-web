// app/webinars/oct-2025-01/page.tsx
import type { Metadata } from "next";
import Hero from "@/components/webinars/Hero";
import Transformacion from "@/components/webinars/Transformacion";

// ---------- Metadata ----------
export const metadata: Metadata = {
  title: "Taller de Tranquilidad Financiera · Webinar 7 oct 2025 (CDMX)",
  description:
    "En 90 minutos sabrás cuánto realmente ganas y qué funciona en tu negocio. Claridad y confianza para decidir.",
  alternates: { canonical: "https://lobra.net/webinars/oct-2025-01" },
  openGraph: {
    title: "Taller de Tranquilidad Financiera · 7 oct 2025",
    description:
      "En 90 minutos sabrás exactamente cuánto ganas y qué funciona en tu negocio.",
    type: "article",
    locale: "es_MX",
    url: "https://lobra.net/webinars/oct-2025-01",
  },
  robots: { index: true, follow: true },
};

// ---------- Helpers ----------
function resolveString(v?: string | string[]) {
  if (Array.isArray(v)) return v[0];
  return v || "";
}

const EVENT_DATE_LABEL = "7 de octubre de 2025, 8:30 pm (CDMX)";
const PRICE_LABEL = "$490 MXN";

// ---------- Page ----------
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const spPrice = resolveString(sp?.price_id);
  const spSku = resolveString(sp?.sku);

  // Fallbacks
  const envPrice = process.env.NEXT_PUBLIC_PRICE_ID_WEBINAR_OCT2025 || "";
  const envSku = process.env.NEXT_PUBLIC_SKU_WEBINAR_OCT2025 || "";

  const priceId = spPrice || envPrice;
  const sku = spSku || envSku;

  const ctaHref =
    `/checkout?mode=payment` +
    (priceId ? `&price_id=${encodeURIComponent(priceId)}` : "") +
    (sku ? `&sku=${encodeURIComponent(sku)}` : "");

  return (
    <main>
<Hero
  eyebrow="Taller de Tranquilidad Financiera"
  title={<> <span className="accent">Claridad</span> de tus ingresos, <span className="accent">tranquilidad</span> y <span className="accent">confianza</span>. </>}
  subtitle={<> En 90 minutos sabrás exactamente cuánto ganas y qué funciona en tu negocio. Decides con calma y certeza. </>}
  dateLabel={EVENT_DATE_LABEL}
  priceLabel={PRICE_LABEL}
  imgSrc="/images/webinars/oct-2025-01/webinar-finanzas-lobra-oct-2025-roberto-huerta.jpg"
  imgAlt="Roberto Huerta, Webinar Finanzas LOBRÁ Octubre 2025"
  ctaHref={ctaHref}
  ctaText="Quiero mi claridad financiera hoy"
  note="Empieza hoy con claridad y paz."
/>


      <Transformacion ctaHref={ctaHref} />
    </main>
  );
}
