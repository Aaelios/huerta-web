// app/page.tsx
import {
  Hero,
  Transformacion,
  SteppingStones,
  WebinarDestacado,
  MiniBio,
  Testimonios,
  FAQ,
  CTACierre,
} from "@/components/home";

const FEATURED = {
  title: "Taller de tranquilidad financiera",
  summary:
    "Taller de tranquilidad financiera, claridad inmediata sobre tus ingresos. Sesión en vivo por Zoom.",
  href: "webinars/2025-10-14-2030",
  ctaLabel: "Quiero mi lugar",
  type: "webinar" as const,
  startAt: "2025-10-07T20:30:00-06:00", // martes 07 Octubre, 8:30 PM CDMX
  imageUrl: "/images/home/roberto-huerta-webinar-800x1000.jpg",
};

export default function Home() {
  return (
    <>
      <section className="section--dark">
        <Hero />
      </section>

      <section className="section--dark">
        <Transformacion />
      </section>

      <WebinarDestacado featured={FEATURED} />

      <section className="section--dark">
        <SteppingStones />
      </section>

      <section className="section--dark">
        <MiniBio />
      </section>

      <section className="section--surface">
        <Testimonios />
      </section>

      <section id="faq" className="section--dark">
        <FAQ />
      </section>

      <section className="section--dark">
        <CTACierre />
      </section>
    </>
  );
}
