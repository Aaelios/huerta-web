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
import { pickFeaturedForHome } from "@/lib/webinars/homeFeatured";
import { buildMetadata } from "@/lib/seo/buildMetadata";

// Metadata SEO centralizada para Home, usando la infraestructura del Bloque 01A
export const metadata = buildMetadata({
  typeId: "home",
  pathname: "/",
});

// ISR para Home: se regenera como máximo cada 15 minutos
export const revalidate = 3600;

export default async function Home() {
  // Obtiene el evento destacado (o el más próximo) ya mapeado a props
  const featured = await pickFeaturedForHome();

  return (
    <>
      <section className="section--dark">
        <Hero />
      </section>

      <section className="section--dark">
        <Transformacion />
      </section>

      <WebinarDestacado featured={featured} />

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
