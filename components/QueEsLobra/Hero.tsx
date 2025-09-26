// app/components/QueEsLobra/Hero.tsx
"use client";

import Link from "next/link";

export default function Hero() {
  const track = (placement: string, label: string) => {
    try {
      window.dataLayer?.push({ event: "cta_click", placement, label });
    } catch {}
  };

  return (
    <section className="l-hero" aria-labelledby="hero-title">
      <div className="container u-center-text-block stack-5">
        {/* Título principal */}
        <h1 id="hero-title">Qué es <span className="accent">LOBRÁ</span></h1>

        {/* PTR aspiracional (más grande, más recordable) */}
        <p className="u-lead u-maxw-prose">
          Más ingresos, más tiempo libre y confianza en ti mismo.
        </p>

        {/* Definición oficial (tono explicativo, un nivel abajo en jerarquía) */}
        <p className="medium u-maxw-prose">
          LOBRÁ es el método práctico que convierte cada hora en un{" "}
          <span className="accent">logro real</span> para tu negocio y tu vida.
        </p>

        {/* CTA principal + microcopy de confianza */}
        <div className="stack-2 u-center">
          <Link
            href="/webinars"
            className="c-btn c-btn--solid c-btn--pill c-btn--block"
            onClick={() => track("que-es-lobra_hero", "Explorar Webinars")}
            aria-label="Explorar Webinars"
          >
            Explorar Webinars
          </Link>

          <p className="small" style={{ color: "var(--fg-70)" }}>
            Sin fórmulas mágicas. Acciones que ya usan emprendedores en LATAM.
          </p>
        </div>
      </div>
    </section>
  );
}
