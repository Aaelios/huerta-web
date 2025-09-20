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
    <section className="hero" aria-labelledby="hero-title">
      <div className="container">
        <div className="heroGrid">
          {/* Columna texto */}
          <div>
            <p style={{ color: "var(--fg-60)", fontWeight: 700, margin: "0 0 8px" }}>
              Para dueños de pequeños negocios en LATAM
            </p>

            <h1
              id="hero-title"
              style={{
                margin: "0 0 8px",
                lineHeight: 1.15,
                fontWeight: 800,
                fontSize: "clamp(28px, 6vw, 56px)",
              }}
            >
              Convierte tu negocio en una{" "}
              <span style={{ color: "var(--primary-2)" }}>máquina rentable</span>, clara y{" "}
              <span style={{ color: "var(--primary-2)" }}>accionable</span>.
            </h1>

            <p className="small" style={{ marginBottom: 12, lineHeight: 1.5 }}>
              Estrategias simples y prácticas para lograr resultados reales sin humo.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <Link
                href="/webinars"
                className="btn-pill"
                onClick={() => track("hero", "webinars")}
                aria-label="Ver próximos webinars"
              >
                Ver próximos webinars
              </Link>

              <Link
                href="/sobre-mi"
                onClick={() => track("hero", "conoceme")}
                aria-label="Conóceme"
                className="btn-ghost"
              >
                Conóceme
              </Link>
            </div>

            <p className="small" style={{ color: "var(--fg-60)" }}>
              Sin fórmulas mágicas. Pasos claros que ya aplicaron emprendedores como tú.
            </p>
          </div>

          {/* Columna imagen */}
          <div className="imgCol">
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

      <style jsx>{`
        .hero {
          padding: 40px 0 24px;
        }

        .heroGrid {
          display: grid;
          gap: 24px;
          align-items: start;
          grid-template-columns: 1fr;
        }

        .imgCol {
          justify-self: center;
          width: min(480px, 100%);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          aspect-ratio: 4/5;
          min-height: 360px;
        }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          height: 44px;
          padding: 0 16px;
          border-radius: 999px;
          font-weight: 700;
          border: 1.5px solid var(--primary-2);
          color: var(--primary-2);
          background: transparent;
          text-decoration: none;
          transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }
        .btn-ghost:hover {
          background: color-mix(in oklab, var(--primary-2) 22%, transparent);
          color: #fff;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
        }

        @media (max-width: 600px) {
          .hero {
            padding: 12px 0 16px !important;
          }
        }

        @media (min-width: 1200px) {
          .heroGrid {
            grid-template-columns: 1.15fr 0.85fr !important;
            gap: 40px;
          }
          .imgCol {
            justify-self: end;
          }
        }
      `}</style>
    </section>
  );
}
