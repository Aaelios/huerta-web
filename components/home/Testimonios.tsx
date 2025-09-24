// components/home/Testimonios.tsx
"use client";

import Link from "next/link";

type Testimonio = {
  quote: string;
  name: string;
  role: string;
};

const testimonios: Testimonio[] = [
  {
    quote:
      'En el primer paso entendí mis números y dejé de adivinar. Ahora tengo <span class="accent">claridad</span> y cobro con <span class="accent">confianza</span>.',
    name: "Judit Elek",
    role: "Dueña de estudio fotográfico",
  },
  {
    quote:
      'Desde el inicio reduje horas de caos. Hoy trabajo con <span class="accent">más tiempo libre</span> y ventas <span class="accent">más claras</span>.',
    name: "Edgar Villegas",
    role: "Socio fundador en Waicura Technologies",
  },
];

export default function Testimonios() {
  return (
    <section className="l-testimonios" aria-labelledby="testimonios-title">
      <div className="container">
        <h2 id="testimonios-title" className="u-text-center">
          Lo que lograron con <span className="accent">LOBRÁ</span>
        </h2>
        <p className="u-small u-text-center">Resultados reales desde el primer paso.</p>

        <ul className="l-testimoniosGrid" role="list">
          {testimonios.map((t) => (
            <li key={t.name} role="listitem">
              <figure
                className="c-card c-quote"
                tabIndex={0}
                role="group"
                aria-label={`Testimonio de ${t.name}`}
              >
                <blockquote
                  className="c-quote__text"
                  // Permitimos spans de acento dentro del quote
                  dangerouslySetInnerHTML={{ __html: t.quote }}
                />
                <figcaption className="c-quote__meta">
                  <strong>{t.name}</strong>, {t.role}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>

        <p className="u-text-center">
          <Link href="/webinars" className="c-btn c-btn--solid c-btn--pill" aria-label="Próximos webinars">
            Próximos webinars
          </Link>
        </p>
      </div>
    </section>
  );
}
