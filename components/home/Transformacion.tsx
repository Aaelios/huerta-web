// components/home/Transformacion.tsx
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
    <section className="l-transformacion" aria-labelledby="transform-title">
      <div className="container">
        <header className="u-text-center">
          <h2 id="transform-title">{title}</h2>
          <p className="small u-center u-maxw-lg">{subtitle}</p>
        </header>

        <div className="l-transformacionGrid">
          <section aria-labelledby="before-title" className="c-card c-card--light">
            <h3 id="before-title">Antes</h3>
            <ul>
              {itemsBefore.map((it, i) => (
                <li key={`b-${i}`}>{it}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="after-title" className="c-card c-card--light">
            <h3 id="after-title"><span className="accent">Después</span></h3>
            <ul>
              {itemsAfter.map((it, i) => (
                <li key={`a-${i}`}>{it}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
