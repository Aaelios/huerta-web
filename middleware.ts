import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname.toLowerCase();

  // Bloqueo 404 para probes comunes (WordPress, Joomla, Drupal, archivos sensibles, backups)
  if (
    // WordPress
    /^\/wp(\/|$)/.test(p) ||
    /^\/wordpress(\/|$)/.test(p) ||
    /^\/wp-includes(\/|$)/.test(p) ||
    /^\/wp-content(\/|$)/.test(p) ||
    /^\/wp-admin(\/|$)/.test(p) ||
    /^\/wp-json(\/|$)/.test(p) ||
    p === '/xmlrpc.php' ||
    p === '/wp-login.php' ||

    // Joomla
    /^\/administrator(\/|$)/.test(p) ||
    /^\/media\/system(\/|$)/.test(p) ||
    /^\/templates(\/|$)/.test(p) ||

    // Drupal
    /^\/sites\/default(\/|$)/.test(p) ||
    p === '/user/login' ||
    /^\/misc\//.test(p) ||

    // Archivos sensibles
    /^\/\.env/.test(p) ||
    /^\/\.git/.test(p) ||
    /^\/\.svn/.test(p) ||
    /^\/\.hg/.test(p) ||
    p === '/.ds_store' ||
    p === '/phpinfo.php' ||
    /^\/vendor\/phpunit(\/|$)/.test(p) ||
    /^\/config(\.php)?$/.test(p) ||

    // Backups comunes
    /^\/[^/]+\.(zip|tar|gz|tgz|sql|bak|7z)$/.test(p) ||

    // CGI y status
    /^\/cgi-bin(\/|$)/.test(p) ||
    p === '/server-status'
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
