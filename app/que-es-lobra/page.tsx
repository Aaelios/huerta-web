// app/que-es-lobra/page.tsx
import Hero from "../../components/QueEsLobra/Hero";
import Transformacion from "../../components/QueEsLobra/Transformacion";
import Diferenciadores from "../../components/QueEsLobra/Diferenciadores";
import CTAFinal from "../../components/QueEsLobra/CTAFinal";

import { buildMetadata } from "@/lib/seo/buildMetadata";

// Metadata SEO centralizada para página informativa pública
export const metadata = buildMetadata({
  typeId: "static",
  pathname: "/que-es-lobra",
  title: "¿Qué es LOBRÁ?",
  description:
    "Descubre qué es LOBRÁ y cómo te ayuda a construir claridad, ingresos estables y confianza real para avanzar en tu negocio.",
});

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
