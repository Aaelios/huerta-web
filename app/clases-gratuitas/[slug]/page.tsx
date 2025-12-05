// app/clases-gratuitas/[slug]/page.tsx
/**
 * Página server-side de la landing de clases gratuitas.
 * - Resuelve el slug dinámico.
 * - Carga los datos de FreeClassPage desde los loaders del backend.
 * - Maneja 404 cuando la página no existe.
 * - Renderiza el componente cliente con UI y formulario.
 * - Metadata SEO completa (Bloque 6 · landing hard-noindex).
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FreeClassLandingPageClient from "@/components/clases-gratuitas/FreeClassLandingPageClient";
import { loadFreeClassPageBySlug } from "@/lib/freeclass/load";
import { buildMetadata } from "@/lib/seo/buildMetadata";

type PageParams = {
  slug: string;
};

// ---------------------------------------------------------------------------
// Metadata SEO (Bloque 6.A · wiring final)
// ---------------------------------------------------------------------------
export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadFreeClassPageBySlug(slug);

  // Si no existe, fallback mínimo
  if (!page) {
    return buildMetadata({
      typeId: "landing",
      pathname: `/clases-gratuitas/${slug}`,
      title: "Clase gratuita",
      description: "Clase gratuita en LOBRÁ.",
    });
  }

  // Derivar pathname desde canonical absoluto
  const canonicalUrl = new URL(page.seo.canonical);
  const pathname = canonicalUrl.pathname;

  return buildMetadata({
    typeId: "landing",
    pathname,                     // "/clases-gratuitas/fin-freeintro"
    title: page.seo.title,
    description: page.seo.description,
    ogImageUrl: page.seo.ogImage,
    // keywords ignoradas: Next no las utiliza
  });
}

// ---------------------------------------------------------------------------
// Render principal
// ---------------------------------------------------------------------------
export default async function Page(
  { params }: { params: Promise<PageParams> }
) {
  const { slug } = await params;
  const page = await loadFreeClassPageBySlug(slug);

  if (!page) notFound();

  return <FreeClassLandingPageClient page={page} />;
}
