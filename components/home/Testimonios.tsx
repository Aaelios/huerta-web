// components/home/Testimonios.tsx
"use client";

type Testimonio = {
  quote: string;
  name: string;
  role: string;
};

const testimonios: Testimonio[] = [
  {
    quote:
      "Con el método de Roberto pude ordenar mis finanzas y dejar de sentir que cada mes era incierto. Ahora tengo claridad para crecer mi estudio.",
    name: "Judit Elek",
    role: "Dueña de estudio fotográfico",
  },
  {
    quote:
      "Aplicamos sus herramientas en Waicura y logramos procesos más claros para vender sin improvisar. Una inversión que valió la pena.",
    name: "Edgar Villegas",
    role: "Socio fundador en Waicura Technologies",
  },
];

export default function Testimonios() {
  return (
    <div className="l-testimonios" aria-labelledby="testimonios-title">
      <div className="container">
        <h2 id="testimonios-title" className="u-text-center">
          Lo que dicen otros emprendedores
        </h2>

        <ul className="l-testimoniosGrid" role="list">
          {testimonios.map((t) => (
            <li key={t.name} role="listitem">
              <figure
                className="c-card c-card--light c-quote"
                tabIndex={0}
                role="group"
                aria-label={`Testimonio de ${t.name}`}
              >
                <blockquote className="c-quote__text">{t.quote}</blockquote>
                <figcaption className="c-quote__meta">
                  <strong>{t.name}</strong>, {t.role}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
