// app/webinars/[slug]/prelobby/page.tsx
// Prelobby de webinar (no index) — Metadata centralizada vía buildMetadata

import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo/buildMetadata";
import PrelobbyShell from "@/components/webinars/prelobby/PrelobbyShell";
import PrelobbyClient from "@/components/webinars/prelobby/PrelobbyClient";
import { loadWebinars } from "@/lib/webinars/loadWebinars";

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

  const webinars = await loadWebinars();
  const webinar = webinars[slug];

  if (!webinar) {
    notFound();
  }

  return (
    <PrelobbyShell webinar={webinar}>
      <PrelobbyClient webinar={webinar} />
    </PrelobbyShell>
  );
}
