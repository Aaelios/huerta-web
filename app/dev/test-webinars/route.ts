// Huerta Consulting — Dev Test Endpoint — 2025-10-06
// app/dev/test-webinars/route.ts

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { resolveNextStep } from '@/lib/postpurchase/resolveNextStep';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /dev/test-webinars?sku=...&fulfillment_type=...&success_slug=...&send=0|1&email=...
 *
 * Propósito:
 * - Probar resolveNextStep() sin afectar DB ni webhooks.
 * - (Opcional) Enviar un correo de prueba con el HTML inline actual. No escribe en DB.
 *
 * Seguridad:
 * - Bloqueado en producción salvo override explícito via ALLOW_DEV_TESTS=1.
 *
 * Reglas:
 * - Construye href absoluto con APP_URL.
 * - Si send=1 y SEND_RECEIPTS==='1' y hay email, envía correo de prueba.
 */

function isProd() {
  // VERCEL_ENV: 'production' | 'preview' | 'development' (cuando existe)
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || '';
  return env === 'production';
}

function absUrl(relOrAbs: string): string {
  const base = (process.env.APP_URL || '').replace(/\/+$/, '');
  if (!base) throw new Error('APP_URL not set');
  if (/^https?:\/\//i.test(relOrAbs)) return relOrAbs;
  return `${base}${relOrAbs.startsWith('/') ? '' : '/'}${relOrAbs}`;
}

export async function GET(req: Request) {
  try {
    // Seguridad: bloquear en prod salvo override
    if (isProd() && process.env.ALLOW_DEV_TESTS !== '1') {
      return NextResponse.json({ ok: false, error: 'forbidden_in_production' }, { status: 403 });
    }

    const url = new URL(req.url);
    const sku = url.searchParams.get('sku') || undefined;
    const fulfillment_type = url.searchParams.get('fulfillment_type') || undefined;
    const success_slug = url.searchParams.get('success_slug') || undefined;
    const send = url.searchParams.get('send') === '1';
    const email = url.searchParams.get('email') || '';

    // Resolver siguiente paso
    const next = await resolveNextStep({ fulfillment_type, sku, success_slug });

    // Normalización de label y href relativo
    const label = 'label' in next && next.label ? next.label : 'Continuar';
    const rel = 'href' in next && next.href ? next.href : `/${(success_slug || 'mi-cuenta').replace(/^\/+/, '')}`;
    const href = absUrl(rel);

    const payload = {
      ok: true,
      input: { sku, fulfillment_type, success_slug, send, email },
      next: { ...next, label, href },
      env: {
        vercel_env: process.env.VERCEL_ENV || null,
        send_receipts: process.env.SEND_RECEIPTS || null,
        app_url: process.env.APP_URL || null,
      },
    };

    // Envío opcional de correo de prueba, sin tocar DB
    if (send) {
      if (!email) {
        return NextResponse.json({ ...payload, ok: false, error: 'missing_email_for_send' }, { status: 400 });
      }
      if (process.env.SEND_RECEIPTS !== '1') {
        return NextResponse.json({ ...payload, ok: false, error: 'SEND_RECEIPTS_not_enabled' }, { status: 400 });
      }

      const resend = new Resend(process.env.RESEND_API_KEY || '');
      const from = process.env.RESEND_FROM || 'LOBRÁ <no-reply@mail.lobra.net>';

      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto">
          <h1>Prueba de acceso</h1>
          <p>Este es un correo de prueba usando <code>resolveNextStep</code>.</p>
          <p><strong>SKU:</strong> ${sku || '(sin sku)'} · <strong>Tipo:</strong> ${fulfillment_type || '(n/a)'}</p>
          <p><a href="${href}" style="display:inline-block;padding:12px 16px;background:#000;color:#fff;text-decoration:none;border-radius:8px">${label}</a></p>
          <p style="color:#666;font-size:12px;margin-top:24px">Si el botón no funciona, copia y pega: ${href}</p>
        </div>
      `;

      const subject = 'Prueba: CTA dinámico de acceso';
      const sendRes = await resend.emails.send({ from, to: email, subject, html });

      return NextResponse.json({
        ...payload,
        send_result: sendRes,
      });
    }

    // Solo respuesta JSON sin envío
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'unexpected_error' },
      { status: 500 }
    );
  }
}
