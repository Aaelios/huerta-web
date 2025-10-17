// components/webinars/hub/FiltersBar.tsx
/**
 * Componente — FiltersBar
 * Barra de filtros y orden. Actualiza querystring y emite analítica no-op.
 * Facetas vienen de backend (topics, levels). Client component.
 */

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as analytics from '@/components/webinars/hub/analytics';

type Level = 'basico' | 'intermedio' | 'avanzado';

type Props = {
  topics: string[];
  levelOptions: Level[];
  selected: { topics: string[]; level?: string; sort: string };
};

export function FiltersBar({ topics, levelOptions, selected }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const apply = (next: { topics: string[]; level?: string; sort: string }) => {
    const q = new URLSearchParams(sp.toString());

    // reset page when filtering
    q.set('page', '1');

    // topics (multi)
    q.delete('topic');
    for (const t of next.topics) q.append('topic', t);

    // level (single)
    if (next.level) q.set('level', next.level);
    else q.delete('level');

    // sort
    q.set('sort', next.sort);

    analytics.filter_applied({ topics: next.topics, level: next.level });
    analytics.sort_applied(next.sort);

    router.push(`${pathname}?${q.toString()}`);
  };

  const toggleTopic = (t: string) => {
    const set = new Set(selected.topics ?? []);
    if (set.has(t)) set.delete(t);
    else set.add(t);
    apply({ topics: Array.from(set), level: selected.level, sort: selected.sort });
  };

  return (
    <div className="l-cluster" role="form" aria-label="Filtros de webinars">
      <div className="l-cluster">
        <span className="muted">Temas:</span>
        {topics.map((t) => {
          const active = selected.topics?.includes(t);
          return (
            <button
              key={t}
              type="button"
              className={`c-btn ${active ? 'c-btn--solid' : 'c-btn--outline'}`}
              aria-pressed={active}
              onClick={() => toggleTopic(t)}
            >
              {t}
            </button>
          );
        })}
      </div>

      <label className="sr-only" htmlFor="level">
        Nivel
      </label>
      <select
        id="level"
        className="c-form-control"
        value={selected.level ?? ''}
        onChange={(e) => apply({ topics: selected.topics, level: e.target.value || undefined, sort: selected.sort })}
      >
        <option value="">Todos los niveles</option>
        {levelOptions.map((lv) => (
          <option key={lv} value={lv}>
            {lv}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="sort">
        Ordenar por
      </label>
      <select
        id="sort"
        className="c-form-control"
        value={selected.sort}
        onChange={(e) => apply({ topics: selected.topics, level: selected.level, sort: e.target.value })}
      >
        <option value="recent">Próxima fecha</option>
        <option value="price_asc">Precio ↑</option>
        <option value="price_desc">Precio ↓</option>
        <option value="featured">Destacados primero</option>
      </select>
    </div>
  );
}
