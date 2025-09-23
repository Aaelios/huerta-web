// components/home/Hero.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  const track = (placement: string, label: string) => {
    try {
      window.dataLayer?.push({ event: "cta_click", placement, label });
    } catch {}
  };

  return (
    <section className="l-hero" aria-labelledby="hero-title">
      <div className="container">
        <div className="l-heroGrid">
          {/* Columna texto */}
          <div>
            <p className="small">
              Para dueños de pequeños negocios en LATAM
            </p>

            <h1 id="hero-title">
              Convierte tu negocio en una{" "}
              <span className="accent">máquina rentable</span>, clara y{" "}
              <span className="accent">accionable</span>.
            </h1>

            <p className="small">
              Estrategias simples y prácticas para lograr resultados reales sin humo.
            </p>

            {/* Cluster de CTAs + texto siguiente */}
            <div className="cluster-3">
              <Link
                href="/webinars"
                className="c-btn c-btn--solid c-btn--pill"
                onClick={() => track("hero", "webinars")}
                aria-label="Ver próximos webinars"
              >
                Ver próximos webinars
              </Link>

              <Link
                href="/sobre-mi"
                onClick={() => track("hero", "conoceme")}
                aria-label="Conóceme"
                className="c-btn c-btn--ghost c-btn--pill"
              >
                Conóceme
              </Link>

              <p className="small">
                Sin fórmulas mágicas. Pasos claros que ya aplicaron emprendedores como tú.
              </p>

            </div>
          </div>

          {/* Columna imagen */}
          <div className="l-hero-imgCol">
            <Image
              src="/images/home/roberto-huerta-consultor-finanzas-home-hero-800x1000.jpg"
              alt="Roberto Huerta, consultor de pequeños negocios"
              width={800}
              height={1000}
              priority
              fetchPriority="high"
              sizes="(min-width: 1200px) 480px, 100vw"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
