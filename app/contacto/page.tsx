// app/contacto/page.tsx
import type { Metadata } from "next";
import FormularioContacto from "../../components/contacto/FormularioContacto";

export const metadata: Metadata = {
  title: "Contacto | Huerta Consulting",
  description:
    "Ponte en contacto con Huerta Consulting. Respondemos normalmente en un plazo de 2 días hábiles.",
  alternates: {
    canonical: "https://huerta.consulting/contacto",
  },
};

export default function ContactoPage() {
  return (
    <main id="main-content">
      <FormularioContacto />
    </main>
  );
}
