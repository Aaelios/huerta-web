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
    <section
      className="section--surface"
      aria-labelledby="testimonios-title"
      style={{
        background: "var(--surface)",
        padding: "clamp(48px,6vw,72px) 0",
        borderBottom: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <div className="container">
        <h2 id="testimonios-title" style={{ marginBottom: 20 }}>
          Lo que dicen otros emprendedores
        </h2>

        <div
          style={{
            display: "grid",
            gap: 20,
          }}
        >
          {testimonios.map((t) => (
            <blockquote key={t.name}>
              <p>{`“${t.quote}”`}</p>
              <footer>
                <strong>{t.name}</strong>, {t.role}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
