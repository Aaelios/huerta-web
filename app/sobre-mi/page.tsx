// app/sobre-mi/page.tsx
// Página estática — Sobre mí (LOBRÁ)
// Metadata centralizada vía buildMetadata (seoConfig + buildMetadata)

import { buildMetadata } from "@/lib/seo/buildMetadata";
import type { Metadata } from "next";
import {
  Hero,
  Credibilidad,
  MiniBio,
  EnQueAyudo,
  CTA,
} from "@/components/sobreMi";

export const metadata: Metadata = buildMetadata({
  typeId: "sobre_mi",
  pathname: "/sobre-mi",
  title: "Sobre mí",
  description:
    "Consultoría práctica para emprendedores en LATAM. Visión integral de negocio y uso real de IA para ordenar, vender y crecer con resultados tangibles.",
});

export default function SobreMiPage() {
  return (
    <>
      <section className="section--dark">
        <Hero />
      </section>

      <section className="section--surface">
        <Credibilidad />
      </section>

      <section className="section--dark">
        <MiniBio />
      </section>

      <section className="section--surface">
        <EnQueAyudo />
      </section>

      <section className="section--dark">
        <CTA />
      </section>
    </>
  );
}
