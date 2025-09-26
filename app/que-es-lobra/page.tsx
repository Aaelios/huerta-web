// app/que-es-lobra/page.tsx
import Hero from "../../components/QueEsLobra/Hero";
import Transformacion from "../../components/QueEsLobra/Transformacion";
import Diferenciadores from "../../components/QueEsLobra/Diferenciadores";
import CTAFinal from "../../components/QueEsLobra/CTAFinal";

export const metadata = {
  title: "¿Qué es LOBRÁ? | lobra.net",
  description:
    "Más ingresos, más tiempo libre y confianza en ti mismo. Descubre qué es LOBRÁ, el método práctico que convierte cada hora en un logro real para tu negocio y tu vida.",
};

export default function Page() {
  return (
    <>
      <Hero />
      <Transformacion />
      <Diferenciadores />
      <CTAFinal />
    </>
  );
}
