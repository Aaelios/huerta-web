/**
 * Componente — SectionGrid
 * Sección con título y grilla responsive. Server RSC.
 */

import type { HubItemDTO } from './types';
import { WebinarCard } from './WebinarCard';

export function SectionGrid(props: {
  title: string;
  items: HubItemDTO[];
  featured?: boolean;
  className?: string; // nueva prop opcional para override de layout
}) {
  const baseClass = props.featured ? 'featured-grid' : 'grid-auto';
  const combinedClass = props.className ? `${baseClass} ${props.className}` : baseClass;

  return (
    <section className="section" aria-labelledby={props.title.replace(/\s+/g, '-').toLowerCase()}>
      <h2 id={props.title.replace(/\s+/g, '-').toLowerCase()} className="h4">
        {props.title}
      </h2>
      <div className={combinedClass} role="list">
        {props.items.map((it) => (
          <WebinarCard key={it.sku} {...it} />
        ))}
      </div>
    </section>
  );
}
