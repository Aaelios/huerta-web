// app/webinars/Pagination.tsx
/**
 * Componente — Pagination
 * Paginación client-side sincronizada con querystring.
 */

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Props = { page: number; pageSize: number; total: number };

export function Pagination({ page, pageSize, total }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const go = (n: number) => {
    const q = new URLSearchParams(sp.toString());
    q.set('page', String(n));
    router.push(`${pathname}?${q.toString()}`);
  };

  if (pages <= 1) return null;

  return (
    <nav className="l-cluster" aria-label="Paginación">
      <button className="c-btn" type="button" onClick={() => go(Math.max(1, page - 1))} aria-disabled={page <= 1}>
        Anterior
      </button>
      <span className="muted">
        Página {page} de {pages}
      </span>
      <button
        className="c-btn"
        type="button"
        onClick={() => go(Math.min(pages, page + 1))}
        aria-disabled={page >= pages}
      >
        Siguiente
      </button>
    </nav>
  );
}

