// components/sobreMi/Schema.tsx

// Componente legacy de schema Person para la página "Sobre mí".
// La arquitectura SEO actual centraliza todos los JSON-LD en layout y builders.
// Este componente se deja como no-op para evitar romper imports existentes.

export default function Schema() {
  // Intencionalmente no renderiza nada.
  // Cualquier schema de tipo Person/Organization se define en la capa global.
  return null;
}
