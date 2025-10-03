// /app/page.tsx
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

export default async function Home() {
  // obtiene el evento destacado (o el más próximo) ya mapeado a props
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
