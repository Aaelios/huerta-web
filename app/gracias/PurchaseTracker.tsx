'use client';

import { useEffect, useRef } from 'react';
import {
  initDataLayer,
  pushAnalyticsEvent,
  type AnalyticsEventBase,
} from '@/lib/analytics/dataLayer';

type PurchaseEventPayload = AnalyticsEventBase & {
  event: 'purchase';
  order_id: string;
  stripe_session_id: string;
  payment_status: 'paid';
};

type Props = {
  payload: PurchaseEventPayload;
};

export function PurchaseTracker({ payload }: Props) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!payload) return;
    if (firedRef.current) return;

    const storageKey = `purchase_sent_${payload.order_id}`;

    if (typeof window !== 'undefined') {
      try {
        const already = window.sessionStorage.getItem(storageKey);
        if (already === '1') {
          firedRef.current = true;
          return;
        }
      } catch {
        // ignorar errores de storage
      }
    }

    initDataLayer();
    pushAnalyticsEvent(payload);

    firedRef.current = true;

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(storageKey, '1');
      } catch {
        // ignorar errores de storage
      }
    }

    if (process.env.NEXT_PUBLIC_DEBUG === '1') {
      // eslint-disable-next-line no-console
      console.log('[analytics] purchase fired', payload);
    }
  }, [payload]);

  return null;
}
