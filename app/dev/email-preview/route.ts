// app/dev/email-preview/route.ts
// Vista previa local de correos sin envío. Requiere ALLOW_DEV_TESTS=1

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { renderEmail, type NextAny } from '@/lib/emails/renderers';
import type { NextBundle } from '@/lib/emails/renderers/renderEmailBundleAccess';

type Variant = 'prelobby' | 'bundle' | 'generic' | 'download' | 'schedule' | 'community';

function getCtx() {
  return {
    appUrl: (process.env.APP_URL || 'http://localhost:3000').trim(),
    supportEmail: 'soporte@lobra.net',
    from: process.env.RESEND_FROM || 'LOBRÁ <no-reply@mail.lobra.net>',
    subjectPrefix: process.env.EMAIL_SUBJECT_PREFIX || null,
  };
}

function parseJSON<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  if (process.env.ALLOW_DEV_TESTS !== '1') {
    return new Response('Disabled. Set ALLOW_DEV_TESTS=1', { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams;
  const variant = (q.get('variant') || 'prelobby') as Variant;

  // Permite enviar el objeto completo como ?payload=<json>
  const payload = parseJSON<NextAny>(q.get('payload'));

  let next: NextAny;

  if (payload) {
    next = payload;
  } else {
    switch (variant) {
      case 'prelobby': {
        const title = q.get('title') || 'Acceso a tu clase en vivo';
        const href = q.get('href') || '/webinars/2025-10-21-2000/prelobby';
        const label = q.get('label') || 'Ir al prelobby';
        const startAt = q.get('startAt') || '2025-10-21T20:00:00-06:00';
        next = { variant: 'prelobby', title, href, label, startAt };
        break;
      }
      case 'bundle': {
        const itemsJson = q.get('items');
        const items =
          parseJSON<NextBundle['items']>(itemsJson) ||
          ([
            {
              title: 'Clase en vivo · Ingresos · Oct 2025',
              when: '2025-10-21 20:00 (CDMX)',
              href: '/webinars/2025-10-21-2000/prelobby',
              label: 'Ir al prelobby',
              type: 'live_class',
            },
            {
              title: 'Clase en vivo · Egresos · Oct 2025',
              when: '2025-10-28 20:00 (CDMX)',
              href: null,
              label: 'Próximamente',
              type: 'live_class',
            },
          ] satisfies NextBundle['items']);
        next = { variant: 'bundle', items };
        break;
      }
      case 'download':
      case 'schedule':
      case 'community':
      case 'generic':
      default: {
        const href = q.get('href') || '/mis-compras';
        const label = q.get('label') || 'Continuar';
        const title = q.get('title') || 'Pago confirmado';
        next = { variant: variant === 'generic' ? 'generic' : variant, href, label, title };
        break;
      }
    }
  }

  const { html } = renderEmail(next, getCtx());
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
