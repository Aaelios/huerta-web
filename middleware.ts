import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname.toLowerCase();

  // Bloqueo 404 para probes comunes (WordPress, Joomla, archivos sensibles)
  if (
    p === '/xmlrpc.php' ||
    /^\/wp(\/|$)/.test(p) ||
    /^\/wordpress(\/|$)/.test(p) ||
    /^\/wp-includes(\/|$)/.test(p) ||
    /^\/media\/system(\/|$)/.test(p) ||
    /^\/\.env/.test(p) ||
    /^\/\.git/.test(p) ||
    p === '/.ds_store'
  ) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Noindex para dominio de staging
  const host = req.headers.get('host') || '';
  const res = NextResponse.next();
  if (host.includes('huerta-consulting.com')) {
    res.headers.set('X-Robots-Tag', 'noindex,nofollow');
  }

  return res;
}
