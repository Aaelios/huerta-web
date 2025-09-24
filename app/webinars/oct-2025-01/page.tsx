// app/webinars/oct-2025-01/page.tsx
import Script from "next/script";
import type { Metadata } from "next";

import Hero from "@/components/webinars/Hero";
import Ptr from "@/components/webinars/Ptr";
import Stones from "@/components/webinars/Stones";
import Benefits from "@/components/webinars/Benefits";
import Includes from "@/components/webinars/Includes";
import Audience from "@/components/webinars/Audience";
import Faq from "@/components/webinars/Faq";

export const metadata: Metadata = {
  title: "Taller de Tranquilidad Financiera | Webinar 7 oct 2025",
  description:
    "En una sola sesión tendrás la claridad de cuánto ganas, sabrás qué funciona en tu negocio y podrás decidir con confianza tus próximos pasos.",
};

// Fallbacks locales (no secretos)
const FALLBACK_PRICE_ID = "price_1S97ubQ8dpmAG0o28zqhJkTP";
const FALLBACK_SKU_ID = "prod_T5IVV5Nyf0v1oQ";

// Resolver prioridad: searchParams → env → fallback
function resolveString(input: string | string[] | undefined): string | undefined {
  if (Array.isArray(input)) return input[0];
  return input;
}

type SearchParams =
  | { [key: string]: string | string[] | undefined }
  | undefined;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const spObj = (await searchParams) || {};
  const spPrice = resolveString(spObj.price_id);
  const spSku = resolveString(spObj.sku);

  const envPrice = process.env.NEXT_PUBLIC_PRICE_ID_WEBINAR_OCT2025;
  const envSku = process.env.NEXT_PUBLIC_SKU_WEBINAR_OCT2025;

  const priceId = spPrice || envPrice || FALLBACK_PRICE_ID;
  const skuId = spSku || envSku || FALLBACK_SKU_ID;

  const checkoutUrl = `/checkout?price_id=${encodeURIComponent(priceId)}&sku=${encodeURIComponent(
    skuId
  )}&mode=payment`;

  const content = {
    hero: {
      title: "Taller de Tranquilidad Financiera: claridad inmediata sobre tus ingresos",
      tagline:
        "Tranquilidad sobre tus ventas e ingresos: sabes cuánto entra, qué funciona y hacia dónde creces.",
      datetime: "7 de octubre de 2025, 8:30 pm (CDMX)",
      price: "$490 MXN",
      ctaText: "Inscribirme",
      checkoutUrl,
    },
    ptr: "En una sola sesión tendrás la claridad de cuánto ganas, sabrás qué funciona en tu negocio y podrás decidir con confianza tus próximos pasos.",
    stones: [
      {
        k: "Visualizar",
        sub: "Logro inicial",
        text: "Registras tus ingresos de forma clara y ordenada.",
      },
      {
        k: "Analizar",
        sub: "Organizar piezas",
        text: "Detectas fortalezas y debilidades: qué productos o servicios generan más.",
      },
      {
        k: "Entender",
        sub: "Base sólida",
        text: "Reportes básicos que, con el tiempo, muestran ciclos y comparaciones mensuales.",
      },
      {
        k: "Decidir",
        sub: "Red integral",
        text: "Tomas decisiones fundamentadas en datos reales, no en suposiciones.",
      },
    ],
    benefits: [
      "Claridad inmediata sobre tus ventas e ingresos.",
      "Detecta qué productos y clientes sostienen tu negocio.",
      "Reportes simples que muestran tu crecimiento real.",
      "Decisiones basadas en datos, no en intuición.",
    ],
    includes: [
      "Sesión en vivo (60–90 min) el 7 de octubre de 2025.",
      "Plantilla inicial en Excel para registrar ingresos.",
      "14 días de soporte por email para resolver dudas.",
    ],
    audience: [
      "Emprendedores que no tienen claro cuánto realmente ganan.",
      "Freelancers que quieren ordenar sus ingresos y detectar patrones.",
      "Pequeños negocios en LATAM que necesitan confianza en sus números.",
    ],
    faq: [
      {
        q: "¿Qué necesito antes del curso?",
        a: "Zoom instalado y probado en computadora (ideal). Microsoft Excel. La plantilla se comparte antes de la sesión.",
      },
      {
        q: "¿Cómo puedo pagar mi inscripción?",
        a: "Con tarjeta de crédito o débito a través de Stripe Checkout.",
      },
      {
        q: "¿Qué pasa si no termino durante la clase?",
        a: "Tienes 14 días de soporte por email para resolver dudas y completar tu tablero.",
      },
      {
        q: "¿Habrá grabación disponible?",
        a: "De momento no está confirmado. El diseño es que salgas con tu herramienta lista en vivo.",
      },
    ],
  };

  return (
    <main>
      <Hero {...content.hero} />
      <Ptr text={content.ptr} />
      <Stones items={content.stones} />
      <Benefits items={content.benefits} />
      <Includes items={content.includes} />
      <Audience items={content.audience} />
      <Faq items={content.faq} />

      {/* Tracking CTA */}
      <Script id="cta-click-tracking" strategy="afterInteractive">{`
        (function () {
          function track() {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'cta_click', placement: 'product_page' });
          }
          var btn = document.getElementById('cta-register');
          if (btn) btn.addEventListener('click', track, { passive: true });
        })();
      `}</Script>
    </main>
  );
}
