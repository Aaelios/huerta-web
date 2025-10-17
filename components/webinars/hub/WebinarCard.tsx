// components/webinars/hub/WebinarCard.tsx
/**
 * Componente — WebinarCard (actualizado)
 * - Badges explícitas: Nivel, Estado/Fecha, Tema
 * - Precio antes del CTA
 * - CTA primario con icono
 * - Sin cambios de contrato con la API
 */

'use client';

import Link from 'next/link';
import type { HubItemDTO } from './types';
import * as analytics from './analytics';
import s from './WebinarsHub.module.css';

type Props = Pick<
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
  | 'instance_count_upcoming'
  | 'instance_slug'
  | 'fulfillment_type'
>;

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
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return '';
  }
}

function mapLevel(lv: Props['level']) {
  switch (lv) {
    case 'basico':
      return 'Básico';
    case 'intermedio':
      return 'Intermedio';
    case 'avanzado':
      return 'Avanzado';
    default:
      return null;
  }
}

export function WebinarCard(props: Props) {
  const price = fmtPrice(props.price_cents, props.currency);
  const formattedDate = fmtDateISO(props.next_start_at);
  const levelLabel = mapLevel(props.level);
  const topic = props.topics?.[0] ?? null;

  const isLiveClass = props.fulfillment_type === 'live_class';
  const isPurchasableLive = isLiveClass && props.purchasable === true;
  const instanceHref = isPurchasableLive && props.instance_slug ? `/webinars/${props.instance_slug}` : undefined;

  const ctaLabel = isPurchasableLive ? 'Más detalles' : 'Ver módulo';

  const onSelect = () => {
    if (instanceHref) analytics.select_item(props.sku);
  };

  return (
    <article className={s.card} role="listitem">
      <div className={s.cardMedia}>
        {props.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.cover} alt="" loading="lazy" />
        ) : (
          <div className={s.placeholder} aria-hidden="true" />
        )}
      </div>

      <div className={s.cardBody}>
        <h3 className={`${s.cardTitle} ${
          props.fulfillment_type === 'bundle' || props.fulfillment_type === 'course' ? s.titleBundle : s.titleClass
          }`}>
            {props.title}
        </h3>


        <div className={s.metaRow} aria-label="Metadatos del webinar">
          {levelLabel && (
            <span className={`${s.badge} ${s['badge--level']}`}>Nivel: {levelLabel}</span>
          )}

          {props.next_start_at ? (
            <span className={`${s.badge} ${s['badge--state']}`}>Fecha: {formattedDate}</span>
          ) : (
            <span className={`${s.badge} ${s['badge--state']}`}>Estado: Próximamente</span>
          )}

          {topic && <span className={`${s.badge} ${s['badge--topic']}`}>Tema: {topic}</span>}
        </div>

        <div className={s.cardFooter}>
          {price && <span className={s.price}>{price}</span>}

          {instanceHref ? (
            <Link href={instanceHref} className={s.btnPrimary} aria-label={`${ctaLabel}: ${props.title}`} onClick={onSelect}>
              {ctaLabel}
              <svg width="16" height="16" aria-hidden="true" viewBox="0 0 24 24">
                <path fill="currentColor" d="M5 12h14m0 0-6-6m6 6-6 6" />
              </svg>
            </Link>
          ) : (
            <button className={s.btnPrimary} aria-disabled="true" title="Pronto disponible">
              {ctaLabel}
              <svg width="16" height="16" aria-hidden="true" viewBox="0 0 24 24">
                <path fill="currentColor" d="M5 12h14m0 0-6-6m6 6-6 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
