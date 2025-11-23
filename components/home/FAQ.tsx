// components/home/FAQ.tsx
"use client";

// FAQ de la home: acordeón accesible de preguntas frecuentes sin JSON-LD inline.
// La capa de schemas se maneja ahora desde la infraestructura SEO central.

import { useMemo, useState, useId } from "react";

type QA = { id: string; q: string; a: string };

export default function FAQ() {
  // Contenido: sin links por ahora
  const items = useMemo<QA[]>(
    () => [
      {
        id: "exp-previa",
        q: "¿Necesito experiencia previa?",
        a: "No. LOBRÁ empieza desde cero y cada paso te da resultados visibles, aunque vengas de un empleo o apenas estés arrancando.",
      },
      {
        id: "precio",
        q: "¿Cuál es el precio para empezar con LOBRÁ?",
        a: "Puedes iniciar con un webinar accesible. La idea es que recuperes tu inversión desde el primer resultado práctico.",
      },
      {
        id: "resultados",
        q: "¿Cuándo veo resultados?",
        a: "Lo común es notar claridad en la primera semana y avances medibles entre la semana 4 y 8, según tu punto de partida.",
      },
      {
        id: "tiempo",
        q: "¿Cuánto tiempo debo dedicar por semana?",
        a: "Entre 2 y 4 horas bien enfocadas. Cada sesión está diseñada para dejarte algo usable al momento.",
      },
      {
        id: "garantia",
        q: "¿Y si no veo resultados?",
        a: "Tienes garantía: si en los primeros 7 días no encuentras valor aplicable, te apoyamos con alternativas o reembolso según los términos.",
      },
      {
        id: "soporte",
        q: "¿Tendré soporte si me trabo?",
        a: "Sí. Incluye sesiones en vivo según el plan y un canal de ayuda rápida para que avances sin quedarte atorado.",
      },
      {
        id: "herramientas",
        q: "¿Qué herramientas necesito?",
        a: "Usamos opciones simples y accesibles. Arrancas con lo que ya tienes y, si hace falta, sugerimos herramientas gratuitas o de bajo costo.",
      },
      {
        id: "freelancers",
        q: "¿Funciona para freelancers y emprendedores en LATAM?",
        a: "Sí. LOBRÁ está diseñado para la realidad de LATAM: ingresos irregulares, poco tiempo y necesidad de resultados rápidos.",
      },
      {
        id: "pago",
        q: "¿Qué métodos de pago aceptan?",
        a: "Stripe Embedded Checkout: tarjeta, wallets y opciones locales como OXXO y SPEI. Recibes confirmación inmediata al pagar.",
      },
      {
        id: "primer-dia",
        q: "¿Qué recibo desde el primer día?",
        a: "Acceso inmediato al contenido, plantillas listas para usar y, según el plan, participación en sesiones en vivo.",
      },
    ],
    [],
  );

  // Acordeón de un solo panel abierto
  const [openId, setOpenId] = useState<string | null>(null);
  const ns = useId(); // evita colisiones si hay más de un FAQ en la página

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section aria-labelledby="faq-title" role="region">
      <div className="container">
        <h2 id="faq-title">Preguntas frecuentes</h2>

        <ul className="l-faqGrid" role="list">
          {items.map((it, idx) => {
            const qId = `q-${ns}-${idx + 1}`;
            const aId = `a-${ns}-${idx + 1}`;
            const expanded = openId === it.id;
            return (
              <li key={it.id} role="listitem">
                <article className="c-faq">
                  <h3>
                    <button
                      id={qId}
                      className="c-faq__q"
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={aId}
                      onClick={() => toggle(it.id)}
                    >
                      <span>{it.q}</span>
                      <span className="caret" aria-hidden="true">
                        ⌄
                      </span>
                    </button>
                  </h3>

                  <div
                    id={aId}
                    role="region"
                    aria-labelledby={qId}
                    className="c-faq__a"
                    hidden={!expanded}
                  >
                    <p>{it.a}</p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
