// app/webinars/[slug]/prelobby/page.tsx

import { notFound } from "next/navigation";
import PrelobbyShell from "@/components/webinars/prelobby/PrelobbyShell";
import PrelobbyClient from "@/components/webinars/prelobby/PrelobbyClient";
import { loadWebinars } from "@/lib/webinars/loadWebinars";

export default async function PrelobbyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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
