// /app/dev/test-featured/route.ts
/**
 * Ruta de prueba — getFeatured()
 * Server-only. No UI. Devuelve FeaturedDTO en JSON para validación manual.
 * No modifica páginas reales ni endpoints públicos.
 */

import 'server-only';
import { getFeatured } from '@/lib/data/getFeatured';

export async function GET(): Promise<Response> {
  try {
    const dto = await getFeatured();

    return new Response(JSON.stringify({ ok: true, featured: dto }), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
}
