// components/home/MiniBio.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

export default function MiniBio() {
  const track = (label: string) => {
    try {
      window.dataLayer?.push({ event: "cta_click", placement: "mini_bio", label });
    } catch {}
  };

  return (
    <section className="section--dark" aria-labelledby="minibio-title" role="region">
      <div className="container">
        <div className="bioGrid">
          {/* Imagen 1:1 */}
          <div className="bioMedia">
            <div className="bioImgWrap">
              <Image
                src="/images/home/roberto-huerta-minibio-600x600.jpg"
                alt="Roberto Huerta, consultor para emprendedores en LATAM"
                width={600}
                height={600}
                loading="lazy"
                decoding="async"
                sizes="(min-width:1200px) 520px, (min-width:768px) 60vw, 90vw"
                style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
              />
            </div>
          </div>

          <div className="copy">
            <h2 id="minibio-title">¿Quién está detrás?</h2>
            <p className="lead">
              Soy Roberto Huerta. Ayudo a emprendedores a ganar claridad, organizar su dinero y
              tomar decisiones simples que se sostienen en el tiempo.
            </p>

            <ul className="bullets" role="list">
              <li>10+ años mapeando procesos y mejorando márgenes.</li>
              <li>Experiencia en P&amp;G gestionando soluciones SAP.</li>
              <li>Metodología práctica enfocada en resultados rápidos.</li>
              <li>Contenido y sesiones en vivo orientadas a la acción.</li>
            </ul>

            <Link
              href="/sobre-mi"
              className="btn-pill"
              aria-label="Conocer más sobre Roberto Huerta"
              onClick={() => track("conoceme-mas")}
            >
              Conóceme más
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        section.section--dark {
          background: var(--bg);
          padding: 56px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .bioGrid {
          display: grid;
          gap: 24px;
          grid-template-columns: 1fr;
          align-items: start;
          justify-items: center;
        }

        .bioMedia {
          width: min(520px, 100%);
          margin-inline: auto;
          justify-self: center;
        }
        .bioImgWrap {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          aspect-ratio: 1 / 1;
          min-height: 360px;
        }

        .copy { width: 100%; }
        .copy h2 {
          color: var(--fg);
          margin: 0 0 10px;
          letter-spacing: -0.01em;
        }
        .lead {
          color: var(--fg-80);
          margin: 0 0 14px;
          max-width: 60ch;
        }
        .bullets {
          margin: 0 0 16px;
          padding: 0 0 0 18px;
          color: var(--fg-80);
        }
        .bullets li + li { margin-top: 6px; }

        @media (min-width: 1200px) {
          .bioGrid {
            grid-template-columns: 0.95fr 1.05fr;
            gap: 36px;
            justify-items: stretch;
          }
          .bioMedia {
            margin-inline: 0;
            justify-self: start;
          }
        }
      `}</style>
    </section>
  );
}
