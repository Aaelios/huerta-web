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
  title: "Webinar en vivo — Septiembre 2025",
  summary:
    "Organiza tus finanzas y tu operación para lograr ingresos más estables. Sesión en vivo por Zoom.",
  href: "webinars/oct-2025-01",
  ctaLabel: "Quiero mi lugar",
  type: "webinar" as const,
  startAt: "2025-09-30T20:30:00-06:00", // martes 30 septiembre, 8:30 PM CDMX
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
