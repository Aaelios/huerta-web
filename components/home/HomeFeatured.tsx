// components/home/HomeFeatured.tsx
/**
 * HomeFeatured — Orquestador de Featured en Home (Server Component)
 * - Fuente primaria: getFeatured() (Supabase). Fallback: JSONC (pickFeaturedForHome()).
 * - Render condicional por type: 'live_class' | 'bundle' | 'one_to_one'.
 * - CTA: page_slug → "/{slug}", si falta → "/webinars".
 * - Estricto al contrato FeaturedDTO. Sin JSON-LD ni tracking aquí.
 */

import 'server-only';
import React from 'react';
import type { JSX } from 'react';
import { getFeatured } from '@/lib/data/getFeatured';
import type { FeaturedDTO, FulfillmentType } from '@/lib/dto/catalog';

// Wrappers Client
import FeaturedWebinar from '@/components/home/FeaturedWebinar';
import FeaturedBundle from '@/components/home/FeaturedBundle';
import FeaturedOneToOne from '@/components/home/FeaturedOneToOne';

// ============================
// Bloque A — Utilidades puras
// ============================

/** Normaliza el href del CTA según page_slug con fallback a /webinars. */
function resolveCtaHref(pageSlug: string): string {
  const slug = pageSlug?.trim();
  if (slug && slug.length > 0) {
    const clean = slug.startsWith('/') ? slug : `/${slug}`;
    return clean.replace(/\/{2,}/g, '/');
  }
  return '/webinars';
}

/** Adaptador de fallback JSONC → FeaturedDTO estricto. */
async function fallbackFromJSONC(): Promise<FeaturedDTO | null> {
  try {
    const mod = await import('@/lib/webinars/homeFeatured');
    const pick = (mod as {
      pickFeaturedForHome: () => Promise<{
        title?: string;
        summary?: string;
        href?: string;
        ctaLabel?: string;
        startAt?: string;
        imageUrl?: string;
        priceMXN?: number;
        eyebrow?: string;
        bullets?: string[];
      } | undefined>;
    }).pickFeaturedForHome;

    const w = await pick();
    if (!w) return null;

    // Derivar slug desde href existente; si no hay, usar "webinars" para mantener CTA por defecto.
    const derivedSlug =
      typeof w.href === 'string'
        ? w.href
            .replace(/^https?:\/\/[^/]+/i, '') // quitar dominio si viene absoluto
            .replace(/^\/?/, '') // quitar barra inicial
        : 'webinars';

    // Asegurar slug válido: si apunta a una ruta completa de webinars, quedarse con "webinars" base.
    const page_slug = derivedSlug.length > 0 ? derivedSlug : 'webinars';

    const dto: FeaturedDTO = {
      sku: '', // desconocido en JSONC
      type: 'live_class',
      title: w.title ?? 'Webinar en vivo',
      subtitle: null,
      page_slug,
      price_mxn: typeof w.priceMXN === 'number' ? Math.round(w.priceMXN * 100) : null,
      compare_at_total: null,
      next_start_at: w.startAt ?? null,
    };

    return dto;
  } catch {
    return null;
  }
}

/** Obtiene FeaturedDTO con Supabase y fallback JSONC. */
async function loadFeaturedDTO(): Promise<FeaturedDTO | null> {
  try {
    const dto = await getFeatured();
    if (dto) return dto;
  } catch {
    // silenciar y caer al fallback
  }
  return await fallbackFromJSONC();
}

// ====================================
// Bloque B — Render por tipo (switch)
// ====================================

function renderByType(dto: FeaturedDTO): JSX.Element | null {
  const href = resolveCtaHref(dto.page_slug);
  const t: FulfillmentType = dto.type;

  switch (t) {
    case 'live_class':
      return <FeaturedWebinar dto={dto} href={href} />;
    case 'bundle':
      return <FeaturedBundle dto={dto} href={href} />;
    case 'one_to_one':
      return <FeaturedOneToOne dto={dto} href={href} />;
    default:
      return null;
  }
}

// ============================
// Bloque C — Componente raíz
// ============================

export default async function HomeFeatured(): Promise<JSX.Element | null> {
  const dto = await loadFeaturedDTO();
  if (!dto) return null;
  return renderByType(dto);
}
