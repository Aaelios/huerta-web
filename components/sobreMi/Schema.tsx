// components/sobreMi/Schema.tsx

export default function Schema() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Roberto Huerta",
    url: "https://huerta.consulting/",
    image:
      "https://framerusercontent.com/images/DPS7XFoHAjv6wyFe2yWcBSP4WSk.jpg",
    sameAs: [
      "https://www.linkedin.com/in/robertohuerta",
      "https://www.instagram.com/rh.university/",
      "https://www.youtube.com/@rhuniversity",
    ],
    jobTitle: "Consultor en soluciones prácticas para emprendedores",
    worksFor: {
      "@type": "Organization",
      name: "Huerta Consulting",
      url: "https://huerta.consulting/",
    },
    description:
      "Consultor con visión completa de negocio que aterriza tecnología e IA en soluciones prácticas para pymes.",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
