// components/home/FAQ.tsx
"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import Script from "next/script";
import Link from "next/link";

type QA = { q: string; a: string; id: string; href?: string };

export default function FAQ() {
  // Memo para estabilidad y evitar warnings de deps
  const items: QA[] = useMemo(
    () => [
      {
        id: "exp-previa",
        q: "¿Necesito experiencia previa?",
        a: "No. Empezamos con fundamentos claros: números básicos, prioridades y una oferta entendible. Si vienes de un empleo o estás arrancando, el plan está pensado para ti."
      },
      {
        id: "precio",
        q: "¿Es caro o cuánto cuesta empezar?",
        a: "Puedes iniciar con un webinar accesible y luego avanzar según resultados. La idea es que recuperes tu inversión rápido con pasos prácticos y medibles. Revisa las próximas fechas en la página de webinars.",
        href: "/webinars"
      },
      {
        id: "resultados",
        q: "¿Cuándo veo resultados?",
        a: "Aplicando lo visto, lo común es notar mayor claridad en 1 semana y señales de ventas más constantes entre la semana 4 y 8, según tu punto de partida."
      },
      {
        id: "tiempo",
        q: "¿Cuánto tiempo debo dedicar por semana?",
        a: "Entre 2 y 4 horas bien enfocadas. El sistema prioriza acciones de alto impacto y plantillas listas para usar para no perderte en tareas interminables.",
        href: "/plantillas"
      },
      {
        id: "reembolsos",
        q: "¿Hay garantía o reembolsos?",
        a: "Sí. Si no obtienes valor aplicable en los primeros 7 días hábiles, escríbenos con tu caso y te apoyamos con alternativas o reembolso según los términos.",
        href: "/legales/reembolsos"
      },
      {
        id: "soporte",
        q: "¿Tendré soporte si me trabo?",
        a: "Sí. Tienes sesiones en vivo según el formato y un canal para resolver dudas puntuales. Buscamos que avances sin quedarte atorado."
      },
      {
        id: "herramientas",
        q: "¿Qué herramientas necesito?",
        a: "Usamos opciones simples y accesibles. Empezamos con lo que ya tienes y, si hace falta, sugerimos herramientas gratuitas o de bajo costo."
      },
      {
        id: "latam",
        q: "¿Funciona para emprendedores en LATAM?",
        a: "Sí. El método considera realidades de LATAM: flujos irregulares, presupuesto limitado y enfoque práctico para volver el negocio más rentable."
      },
      {
        id: "pago",
        q: "¿Qué métodos de pago aceptan?",
        a: "Stripe Embedded Checkout: tarjeta, wallets y opciones locales como OXXO y SPEI. Recibes confirmación por correo al completar el pago."
      },
      {
        id: "propiedad",
        q: "¿Qué obtengo exactamente al comprar?",
        a: "Acceso al contenido indicado, plantillas incluidas y, según el producto, participación en sesiones en vivo. Todo queda en tu panel de compras."
      }
    ],
    []
  );

  const refs = useRef<Array<HTMLDetailsElement | null>>([]);

  const onToggle = useCallback(
    (idx: number) => {
      const cur = refs.current[idx];
      if (cur?.open) {
        refs.current.forEach((el, i) => {
          if (i !== idx && el?.open) el.removeAttribute("open");
        });
      }
      try {
        window.dataLayer?.push({ event: "cta_click", placement: "faq", label: `faq-${items[idx].id}` });
      } catch {}
    },
    [items]
  );

  // Abrir por hash y hacer scroll con offset
  useEffect(() => {
    const openFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      const idx = items.findIndex((it) => `faq-${it.id}` === hash || it.id === hash);
      if (idx >= 0) {
        const el = refs.current[idx];
        if (el) {
          el.setAttribute("open", "");
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };
    const t = setTimeout(openFromHash, 0);
    window.addEventListener("hashchange", openFromHash);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", openFromHash);
    };
  }, [items]);

  // JSON-LD FAQPage
  const faqJSON = useMemo(() => {
    const mainEntity = items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a }
    }));
    return JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity });
  }, [items]);

  // Copiar enlace directo a cada pregunta
  const copyLink = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#faq-${id}`;
    navigator.clipboard?.writeText(url);
    try {
      window.dataLayer?.push({ event: "cta_click", placement: "faq", label: `copylink-${id}` });
    } catch {}
  };

  return (
    <section className="section--dark" aria-labelledby="faq-title" role="region">
      <div className="container">
        <h2 id="faq-title">Preguntas frecuentes</h2>

        <div className="list" role="list">
          {items.map((item, i) => {
            const anchorId = `faq-${item.id}`;
            return (
              <details
                key={item.id}
                id={anchorId}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                onToggle={() => onToggle(i)}
                className="faq"
              >
                <summary className="summary">
                  <span className="badge" aria-hidden="true">
                    ?
                  </span>
                  <h3 className="q">{item.q}</h3>

                  <button
                    className="copy"
                    aria-label="Copiar enlace de esta pregunta"
                    onClick={(e) => copyLink(item.id, e)}
                    type="button"
                  >
                    🔗
                  </button>
                </summary>

                <div className="panel">
                  <p className="a">
                    {item.a}
                    {item.href ? (
                      <>
                        {" "}
                        <Link href={item.href} className="alink">
                          Ver más
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
              </details>
            );
          })}
        </div>

        <div className="ctaRow">
          <Link
            href="/contacto?from=faq"
            className="ctaMinor"
            aria-label="Escríbeme tu duda"
            onClick={() => {
              try {
                window.dataLayer?.push({ event: "cta_click", placement: "faq", label: "faq-contacto" });
              } catch {}
            }}
          >
            ¿No ves tu pregunta? Escríbeme
          </Link>
        </div>
      </div>

      <Script id="faq-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJSON }} />

      <style jsx>{`
        section.section--dark {
          background: var(--bg);
          padding: 56px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        h2 {
          color: var(--fg);
          margin: 0 0 16px;
        }

        .list {
          display: grid;
          gap: 12px;
        }

        .faq {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 8px 12px;
          scroll-margin-top: 84px;
        }

        .summary {
          list-style: none;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .summary::-webkit-details-marker {
          display: none;
        }
        .summary:focus-visible {
          outline: 2px solid var(--primary-1);
          outline-offset: 2px;
          border-radius: 8px;
        }

        .badge {
          width: 24px;
          height: 24px;
          border-radius: 8px;
          background: var(--primary-2);
          color: #0a0a0a;
          display: inline-grid;
          place-items: center;
          font-weight: 800;
        }

        .q {
          margin: 0;
          color: var(--fg);
          font-size: 1rem;
          font-weight: 800;
          line-height: 1.2;
        }

        .copy {
          opacity: 0;
          transition: opacity 0.18s ease;
          background: transparent;
          border: 0;
          color: var(--fg-70);
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
        }
        .faq:hover .copy,
        .copy:focus-visible {
          opacity: 1;
        }
        .copy:focus-visible {
          outline: 2px solid var(--primary-1);
          outline-offset: 2px;
        }

        .panel {
          margin: 8px 0 4px 32px;
          content-visibility: auto;
        }
        .a {
          margin: 0;
          color: var(--fg-80);
        }
        .alink {
          color: var(--primary-2);
          text-decoration: underline;
        }

        .ctaRow {
          margin-top: 16px;
        }
        .ctaMinor {
          display: inline-block;
          font-weight: 600;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(80, 200, 120, 0.35);
          color: var(--fg);
          text-decoration: none;
        }
        .ctaMinor:focus-visible {
          outline: 2px solid var(--primary-1);
          outline-offset: 2px;
        }
      `}</style>
    </section>
  );
}
