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
            <p className="small">Para emprendedores, freelancers y pequeños negocios en LATAM</p>

            <h1 id="hero-title">
              Más <span className="accent">ingresos</span>, más <span className="accent">tiempo</span> libre y <span className="accent">confianza</span> en ti mismo.
            </h1>

            <p className="u-lead u-maxw-prose">
              LOBRÁ es un Método de aprendizaje <span className="accent">inovador</span> con webinars y cursos que generan avances rápidos, <span className="accent">concretos</span> y con <span className="accent">herramientas</span> listas para usar.
            </p>

            <p className="small u-maxw-prose">
              No es un curso teórico, cada hora de aprendizaje la conviertes en <span className="accent">progreso visible</span>, aplicable de inmediato y con resultados tangibles.
            </p>

            {/* Cluster de CTAs + nota de confianza */}
            <div className="cluster-3">
              <Link
                href="/webinars"
                className="c-btn c-btn--solid c-btn--pill"
                onClick={() => track("hero", "webinars")}
                aria-label="Empieza con los webinars"
              >
                Empieza con los webinars
              </Link>

              <Link
                href="#steps-title"
                onClick={() => track("hero", "como-funciona")}
                aria-label="Cómo funciona LOBRÁ"
                className="c-btn c-btn--ghost c-btn--pill"
              >
                Cómo funciona LOBRÁ
              </Link>

              <p className="small" style={{ color: "var(--fg-60)" }}>
                Sin fórmulas mágicas. Acciones que ya usan emprendedores en LATAM.
              </p>
            </div>
          </div>

          {/* Columna imagen */}
          <div className="l-hero-imgCol">
            <Image
              src="/images/home/roberto-huerta-consultor-finanzas-home-hero-800x1000.jpg"
              alt="Método LOBRÁ: educación y herramientas para emprendedores"
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
