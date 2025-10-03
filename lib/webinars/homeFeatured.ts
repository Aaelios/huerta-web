// /lib/webinars/homeFeatured.ts
import { loadWebinars as loadWebinarsRaw } from "@/lib/webinars/loadWebinars";
import { WebinarMapSchema } from "@/lib/webinars/schema";

type FeaturedProps = {
  title?: string;
  summary?: string;
  href?: string;
  ctaLabel?: string;
  type?: "webinar";
  startAt?: string;
  imageUrl?: string;
  priceMXN?: number;
  eyebrow?: string;
  bullets?: string[];
};

const pesos = (cents?: number) =>
  typeof cents === "number" ? Math.round(cents / 100) : undefined;

const isFuture = (iso?: string, now = new Date()) => {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getTime() > now.getTime();
};

export async function pickFeaturedForHome(): Promise<FeaturedProps | undefined> {
  const raw = await loadWebinarsRaw();
  const parsed = WebinarMapSchema.safeParse(raw);
  if (!parsed.success) return undefined;

  const items = Object.values(parsed.data)
    .map((n: any) => ({
      slug: n?.shared?.slug as string,
      startAt: n?.shared?.startAt as string,
      featuredHome: !!n?.shared?.flags?.featuredHome,
      priceMXN: pesos(n?.shared?.pricing?.amountCents),
      title: (n?.sales?.hero?.title as string) || (n?.shared?.title as string),
      eyebrow: n?.sales?.hero?.eyebrow as string | undefined,
      subtitle: n?.sales?.hero?.subtitle as string | undefined,
      ctaText: n?.sales?.hero?.ctaText as string | undefined,
      heroImageSrc: n?.sales?.hero?.heroImageSrc as string | undefined,
      bullets: n?.sales?.clasePractica?.deliverableBullets as string[] | undefined,
    }))
    .filter((i) => i.slug && isFuture(i.startAt));

  if (items.length === 0) return undefined;

  const marked = items.filter((i) => i.featuredHome);
  const pool = marked.length ? marked : items;
  pool.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
  const w = pool[0];

  return {
    title: w.title,
    summary: w.subtitle,
    href: `/webinars/${w.slug}`,
    ctaLabel: w.ctaText || "Quiero mi lugar",
    type: "webinar",
    startAt: w.startAt,
    imageUrl: w.heroImageSrc,
    priceMXN: w.priceMXN,
    eyebrow: w.eyebrow,
    bullets: w.bullets && w.bullets.length ? w.bullets : undefined,
  };
}
