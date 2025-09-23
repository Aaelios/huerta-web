// components/home/FAQ.tsx
"use client";

import { useMemo, useState, useId } from "react";

type QA = { id: string; q: string; a: string };

export default function FAQ() {
  // Contenido: sin links por ahora
  const items: QA[] = useMemo(
    () => [
      {
        id: "exp-previa",
        q: "¿Necesito experiencia previa?",
        a: "No. Empezamos con fundamentos claros: números básicos, prioridades y una oferta entendible. Si vienes de un empleo o estás arrancando, el plan está pensado para ti.",
      },
      {
        id: "precio",
        q: "¿Es caro o cuánto cuesta empezar?",
        a: "Puedes iniciar con un webinar accesible y luego avanzar según resultados. La idea es que recuperes tu inversión rápido con pasos prácticos y medibles.",
      },
      {
        id: "resultados",
        q: "¿Cuándo veo resultados?",
        a: "Aplicando lo visto, lo común es notar mayor claridad en 1 semana y señales de ventas más constantes entre la semana 4 y 8, según tu punto de partida.",
      },
      {
        id: "tiempo",
        q: "¿Cuánto tiempo debo dedicar por semana?",
        a: "Entre 2 y 4 horas bien enfocadas. El sistema prioriza acciones de alto impacto y plantillas listas para usar para no perderte en tareas interminables.",
      },
      {
        id: "reembolsos",
        q: "¿Hay garantía o reembolsos?",
        a: "Sí. Si no obtienes valor aplicable en los primeros 7 días hábiles, escríbenos con tu caso y te apoyamos con alternativas o reembolso según los términos.",
      },
      {
        id: "soporte",
        q: "¿Tendré soporte si me trabo?",
        a: "Sí. Tienes sesiones en vivo según el formato y un canal para resolver dudas puntuales. Buscamos que avances sin quedarte atorado.",
      },
      {
        id: "herramientas",
        q: "¿Qué herramientas necesito?",
        a: "Usamos opciones simples y accesibles. Empezamos con lo que ya tienes y, si hace falta, sugerimos herramientas gratuitas o de bajo costo.",
      },
      {
        id: "latam",
        q: "¿Funciona para emprendedores en LATAM?",
        a: "Sí. El método considera realidades de LATAM: flujos irregulares, presupuesto limitado y enfoque práctico para volver el negocio más rentable.",
      },
      {
        id: "pago",
        q: "¿Qué métodos de pago aceptan?",
        a: "Stripe Embedded Checkout: tarjeta, wallets y opciones locales como OXXO y SPEI. Recibes confirmación por correo al completar el pago.",
      },
      {
        id: "propiedad",
        q: "¿Qué obtengo exactamente al comprar?",
        a: "Acceso al contenido indicado, plantillas incluidas y, según el producto, participación en sesiones en vivo. Todo queda en tu panel de compras.",
      },
    ],
    []
  );

  // Acordeón de un solo panel abierto
  const [openId, setOpenId] = useState<string | null>(null);
  const ns = useId(); // evita colisiones si hay más de un FAQ en la página

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  // JSON-LD básico para SEO
  const jsonLd = useMemo(() => {
    const mainEntity = items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    }));
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity,
    };
  }, [items]);

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
                      <span className="caret" aria-hidden="true">⌄</span>
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
