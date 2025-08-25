import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const res = NextResponse.next();

  // Si el host contiene huerta-consulting.com → marcar noindex
  if (host.includes('huerta-consulting.com')) {
    res.headers.set('X-Robots-Tag', 'noindex,nofollow');
  }

  return res;
}
