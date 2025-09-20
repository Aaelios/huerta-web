// components/home/Transformacion.tsx  ← primera línea del archivo
"use client";

type Props = {
  title?: string;
  subtitle?: string;
  itemsBefore?: string[];
  itemsAfter?: string[];
};

export default function Transformacion({
  title = "De la incertidumbre a la claridad",
  subtitle = "El punto de partida y el resultado que buscamos en tu negocio.",
  itemsBefore = [
    "Ingresos que suben y bajan cada mes.",
    "No saber qué priorizar ni por dónde empezar.",
    "Ansiedad por no tener claridad en números.",
  ],
  itemsAfter = [
    "Ventas más estables y predecibles.",
    "Pasos claros y concretos para avanzar.",
    "Confianza de que tu negocio puede sostenerte.",
  ],
}: Props) {
  return (
    <section className="section--light" aria-labelledby="transform-title">
      <div className="container">
        <header className="t-header">
          <h2 id="transform-title" className="t-title">
            {title}
          </h2>
          <p className="t-sub">{subtitle}</p>
        </header>

        <div className="t-grid">
          <section aria-labelledby="before-title" className="t-card">
            <h3 id="before-title" className="t-h3">
              Antes
            </h3>
            <ul className="t-list">
              {itemsBefore.map((it, i) => (
                <li key={`b-${i}`}>{it}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="after-title" className="t-card">
            <h3 id="after-title" className="t-h3 t-h3--ok">Después</h3>
            <ul className="t-list">
              {itemsAfter.map((it, i) => (
                <li key={`a-${i}`}>{it}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <style jsx>{`
        .t-header { text-align: center; margin: 56px 0 40px; }
        .t-title {
          margin: 0 0 12px;
          font-weight: 800;
          line-height: 1.2;
          font-size: clamp(28px, 4vw, 40px);
          color: #0a0a0a;
        }
        .t-sub { margin: 0 auto; max-width: 820px; color: #3a3a3a; }

        .t-grid { display: grid; gap: 20px; grid-template-columns: 1fr; }
        .t-card {
          background: #fff;
          border: 1px solid rgba(10,10,10,.08);
          border-radius: 16px;
          padding: 20px;
        }
        .t-h3 { margin: 0 0 10px; font-size: 22px; font-weight: 700; color: #0a0a0a; }
        .t-h3--ok { color: var(--primary-2); }
        .t-list { margin: 0; padding-left: 20px; color: #3a3a3a; line-height: 1.6; }

        @media (min-width: 1200px) {
          .t-grid { grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        }
      `}</style>
    </section>
  );
}
