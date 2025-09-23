// components/home/ProprietaryPlan.tsx  — v1 CSS centralizado + SVG icons
import Link from "next/link";

export default function ProprietaryPlan() {
  return (
    <section className="section section--dark l-propplan" aria-labelledby="plan-title">
      <div className="container">
        <header className="stack-3 u-maxw-lg">
          <h2 id="plan-title">Nuestro plan para lograrlo</h2>
          <p className="u-lead">
            Un camino de 3 pasos aplicado por emprendedores en LATAM para pasar de dudas a acciones medibles.
          </p>
        </header>

        <ul className="l-propplanGrid" role="list" aria-label="Pilares del método">
          <li>
            <article className="c-card c-pill" aria-labelledby="pill-1-title">
              <span className="c-pill__icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
              <h3 id="pill-1-title" className="c-pill__title">Mapea tu claridad</h3>
              <p className="c-pill__desc">
                Entiende tu situación con números simples. Sin hojas de cálculo eternas.
              </p>
              <Link href="/metodo#claridad" className="c-link">Ver cómo empezar</Link>
            </article>
          </li>

          <li>
            <article className="c-card c-pill" aria-labelledby="pill-2-title">
              <span className="c-pill__icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <circle cx="3" cy="6" r="1" />
                  <circle cx="3" cy="12" r="1" />
                  <circle cx="3" cy="18" r="1" />
                </svg>
              </span>
              <h3 id="pill-2-title" className="c-pill__title">Diseña una oferta que conecta</h3>
              <p className="c-pill__desc">
                Explica valor en palabras claras para que tu cliente piense “lo necesito”.
              </p>
              <Link href="/metodo#oferta" className="c-link">Ejemplo práctico de oferta</Link>
            </article>
          </li>

          <li>
            <article className="c-card c-pill" aria-labelledby="pill-3-title">
              <span className="c-pill__icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <h3 id="pill-3-title" className="c-pill__title">Implementa un sistema simple</h3>
              <p className="c-pill__desc">
                Rutinas de ventas y seguimiento sostenibles para crecer sin abrumarte.
              </p>
              <Link href="/metodo#sistema" className="c-link">Ver rutina práctica</Link>
            </article>
          </li>
        </ul>

        <p className="u-text-center" style={{ marginTop: 24 }}>
          <Link href="/metodo" className="c-btn c-btn--solid c-btn--pill c-btn--lg">
            Empezar con el plan
          </Link>
        </p>

        {/* JSON-LD opcional para SEO: lista de pasos */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Mapea tu claridad", url: "/metodo#claridad" },
                { "@type": "ListItem", position: 2, name: "Diseña una oferta que conecta", url: "/metodo#oferta" },
                { "@type": "ListItem", position: 3, name: "Implementa un sistema simple", url: "/metodo#sistema" },
              ],
            }),
          }}
        />
      </div>
    </section>
  );
}
