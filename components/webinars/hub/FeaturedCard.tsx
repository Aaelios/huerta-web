// components/webinars/hub/FeaturedCard.tsx
// SOLUCIÓN TEMPORAL:
// Forzar navegación al landing fijo para live_class, bundles y courses.
// Si existe instance_slug, se pasa como query (?i=) para preselección en el landing.
// Mantener hasta que el orquestador de rutas maneje instancias múltiples de forma nativa.

'use client';

import Link from 'next/link';
import type { HubItemDTO } from './types';
import * as analytics from './analytics';
import s from './WebinarsHub.module.css';

type Base = Pick<
  HubItemDTO,
  | 'sku'
  | 'title'
  | 'cover'
  | 'level'
  | 'topics'
  | 'price_cents'
  | 'currency'
  | 'purchasable'
  | 'next_start_at'
  | 'instance_slug'
  | 'fulfillment_type'
  | 'landing_slug' // habilita CTA para módulos/cursos y landing de live_class
>;

// Si existe, llega como string. No forma parte garantizada de HubItemDTO.
type Props = Base & { summary?: string | null };

function fmtPrice(price_cents: number | null, currency: string | null) {
  if (price_cents == null || currency == null) return '';
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(price_cents / 100);
  } catch {
    return `$${(price_cents / 100).toFixed(0)} ${currency}`;
  }
}

function fmtDateISO(iso: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch {
    return '';
  }
}

function mapLevel(lv: Props['level']) {
  switch (lv) {
    case 'Fundamentos': return 'Fundamentos';
    case 'Profundización': return 'Profundización';
    case 'Impacto': return 'Impacto';
    default: return null;
  }
}

// Normaliza slugs que llegan sin "/"
function normHref(v?: string | null) {
  if (!v) return undefined;
  return v.startsWith('/') ? v : `/${v}`;
}

export function FeaturedCard(props: Props) {
  const price = fmtPrice(props.price_cents, props.currency);
  const formattedDate = fmtDateISO(props.next_start_at);
  const levelLabel = mapLevel(props.level);

  // topics → primer tema visible
  const topic =
    Array.isArray(props.topics) && props.topics.length > 0
      ? String(props.topics[0])
      : null;

  const isLiveClass = props.fulfillment_type === 'live_class';
  const isPurchasableLive = isLiveClass && props.purchasable === true;

  // TEMP: siempre mandar al landing fijo. Si hay instance_slug, lo pasamos en query (?i=)
  const base = normHref(props.landing_slug);
  const href =
    base && props.instance_slug
      ? `${base}?i=${encodeURIComponent(String(props.instance_slug))}`
      : base;

  const ctaLabel = isPurchasableLive ? 'Más detalles' : 'Ver módulo';

  const onSelect = () => {
    if (href) analytics.select_item(props.sku);
  };

  return (
    <article className={s.featuredCard} role="listitem">
      <div className={s.featuredGrid}>
        <div className={s.featuredMedia}>
          {props.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.cover} alt="" loading="lazy" />
          ) : (
            <div className={s.placeholder} aria-hidden="true" />
          )}
        </div>

        <div className={s.featuredContent}>
          <h3 className={s.featuredTitle}>{props.title}</h3>

          {typeof (props as { summary?: string | null }).summary === 'string' &&
          (props as { summary?: string | null }).summary?.trim() !== '' ? (
            <p className={s.featuredSummary}>{(props as { summary?: string | null }).summary}</p>
          ) : null}

          <div className={s.metaRow} aria-label="Metadatos del webinar">
            {levelLabel && <span className={`${s.badge} ${s['badge--level']}`}>Nivel: {levelLabel}</span>}
            {props.next_start_at ? (
              <span className={`${s.badge} ${s['badge--state']}`}>Fecha: {formattedDate}</span>
            ) : (
              <span className={`${s.badge} ${s['badge--state']}`}>Estado: Próximamente</span>
            )}
            {topic && <span className={`${s.badge} ${s['badge--topic']}`}>Tema: {topic}</span>}
          </div>

          <div className={s.featuredFooter}>
            {price && <span className={s.featuredPrice}>{price}</span>}

            {href ? (
              <Link
                href={href}
                className={s.btnPrimary}
                aria-label={`${ctaLabel}: ${props.title}`}
                onClick={onSelect}
              >
                {ctaLabel}
                <svg width="16" height="16" aria-hidden="true" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M5 12h14m0 0-6-6m6 6-6 6" />
                </svg>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
