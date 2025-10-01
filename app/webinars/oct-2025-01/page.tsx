// app/webinars/oct-2025-01/page.tsx
import type { Metadata } from "next";
import Hero from "@/components/webinars/Hero";
import ClasePractica from "@/components/webinars/ClasePractica";
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

// ---------- Fallback constants ----------
const FALLBACK_PRICE_ID = "price_1S97ubQ8dpmAG0o28zqhJkTP";
const FALLBACK_PRODUCT_ID = "prod_T5IVV5Nyf0v1oQ";
const FALLBACK_SKU = "webinar-oct-2025-01";

// ---------- Page ----------
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const spPrice = resolveString(sp?.price_id);
  const spProduct = resolveString(sp?.product_id);
  const spSku = resolveString(sp?.sku);

  const priceId = spPrice || FALLBACK_PRICE_ID;
  const productId = spProduct || FALLBACK_PRODUCT_ID;
  const sku = spSku || FALLBACK_SKU;

  const ctaHref =
    `/checkout?mode=payment` +
    (priceId ? `&price_id=${encodeURIComponent(priceId)}` : "") +
    (productId ? `&product_id=${encodeURIComponent(productId)}` : "") +
    (sku ? `&sku=${encodeURIComponent(sku)}` : "");

  return (
    <main>
      <Hero
        eyebrow="Taller de Tranquilidad Financiera"
        title={
          <>
            <span className="accent">Claridad</span> de tus ingresos,{" "}
            <span className="accent">tranquilidad</span> y{" "}
            <span className="accent">confianza</span>.
          </>
        }
        subtitle={
          <>
            Clase práctica para registrar tus ingresos con una herramienta
            personalizada que usarás desde el día 1.
          </>
        }
        dateLabel={EVENT_DATE_LABEL}
        priceLabel={PRICE_LABEL}
        imgSrc="/images/webinars/oct-2025-01/webinar-finanzas-lobra-oct-2025-roberto-huerta.jpg"
        imgAlt="Roberto Huerta, Webinar Finanzas LOBRÁ Octubre 2025"
        ctaHref={ctaHref}
        ctaText="Reservar mi lugar en la clase"
        note="Empieza hoy con claridad y paz."
      />

<ClasePractica
  eyebrow="Taller interactivo"
  title={
    <>Aprende a poner en orden tus <span className="accent">ingresos</span> en una sola sesión</>
  }
  intro={
    <>En vivo, <span className="accent">práctico</span> y aplicado a tu negocio. <span className="accent">No teoría</span>, resultados.</>
  }
  leftTitle={<>¿Te suena <span className="accent">familiar</span>?</>}
  bullets={[
    <>No sabes cuál es tu <span className="accent">venta promedio</span>.</>,
    <>No tienes claro cuánto ganaste el <span className="accent">mes pasado</span>.</>,
    <>No ves si tus ingresos van <span className="accent">subiendo</span> o bajando.</>,
    <>No puedes decir quién es tu <span className="accent">mejor cliente</span>.</>,
    <>Todo esto se resuelve con <span className="accent">5 min al día</span>.</>,
  ]}
  deliverableTitle={<>Lo que te <span className="accent">llevas</span></>}
  deliverableBullets={[
    <>Tu registro <span className="accent">listo</span> para usar desde mañana.</>,
    <><span className="accent">Método simple</span> que te toma máximo 5 minutos al día.</>,
    <><strong>Duración:</strong> 90 minutos.</>,
    <><strong>Modalidad:</strong> En vivo por <strong>Zoom</strong> (sin Excel/Sheets también aplicas los conceptos).</>,
  ]}
  priceLine={<> <span className="accent">Hoy $490 MXN · Cupo limitado</span> </>}
  guarantee={<> <strong>Garantía total:</strong> si no quedas conforme, reembolso. </>}
  ctaHref={ctaHref}
  ctaText="Reservar mi lugar ahora"
/>


      <Transformacion ctaHref={ctaHref} />
    </main>
  );
}
