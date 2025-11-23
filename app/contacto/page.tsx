// app/contacto/page.tsx
// Página estática — Contacto LOBRÁ
// Metadata centralizada vía buildMetadata (seoConfig + buildMetadata)

import { buildMetadata } from "@/lib/seo/buildMetadata";
import type { Metadata } from "next";
import FormularioContacto from "../../components/contacto/FormularioContacto";

export const metadata: Metadata = buildMetadata({
  typeId: "contacto",
  pathname: "/contacto",
  title: "Contacto",
  description:
    "Ponte en contacto con LOBRÁ. Respondemos normalmente en un plazo de 2 días hábiles.",
});

export default function ContactoPage() {
  return (
    <main id="main-content">
      <FormularioContacto />
    </main>
  );
}
