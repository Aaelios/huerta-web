// app/webinars/[slug]/prelobby/page.tsx
// Ruta: app/webinars/[slug]/prelobby/page.tsx
// Descripción del programa:
// Página de prelobby de webinar (no index). Resuelve el webinar por slug
// y entrega el view model a los componentes de shell y cliente.
//
// Cambio actual — 2026-04-08:
// - se elimina resolución local desde JSON vía loadWebinars
// - se sustituye por getWebinar(slug) como punto único de resolución
// - se mantiene zoomJoinUrl como dato editorial temporal fuera de alcance

import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo/buildMetadata";
import PrelobbyShell from "@/components/webinars/prelobby/PrelobbyShell";
import PrelobbyClient from "@/components/webinars/prelobby/PrelobbyClient";
import { getWebinar } from "@/lib/webinars/load";

type PrelobbyPageParams = {
  params: Promise<{ slug: string }>;
};

// Metadata: tipo "prelobby" siempre noindex según seoConfig/buildMetadata.
export async function generateMetadata({ params }: PrelobbyPageParams) {
  const { slug } = await params;

  return buildMetadata({
    typeId: "prelobby",
    pathname: `/webinars/${slug}/prelobby`,
    title: "Acceso al prelobby del webinar",
    description: "Revisa los detalles y materiales previos antes de tu webinar en vivo.",
  });
}

export default async function PrelobbyPage({ params }: PrelobbyPageParams) {
  const { slug } = await params;

  // Resolución única del webinar vía helper aprobado en CT-03.
  // No se hace lookup directo sobre JSON en esta ruta.
  try {
    const webinar = await getWebinar(slug);

    return (
      <PrelobbyShell webinar={webinar}>
        <PrelobbyClient webinar={webinar} />
      </PrelobbyShell>
    );
  } catch {
    return notFound();
  }
}