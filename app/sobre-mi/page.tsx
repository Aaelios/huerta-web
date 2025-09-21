// app/sobre-mi/page.tsx
import type { Metadata } from "next";
import {
  Hero,
  Credibilidad,
  MiniBio,
  EnQueAyudo,
  CTA,
  Schema,
} from "@/components/sobreMi";

export const metadata: Metadata = {
  title: "Sobre mí | Huerta Consulting",
  description:
    "Consultoría práctica para emprendedores en LATAM. Visión integral de negocio y uso real de IA para ordenar, vender y crecer con resultados tangibles.",
  alternates: { canonical: "/sobre-mi" },
};

export default function SobreMiPage() {
  return (
    <>
      <Schema />

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
