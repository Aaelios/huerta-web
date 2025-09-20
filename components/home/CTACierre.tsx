// components/home/CTACierre.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

export default function CTACierre() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const descId = "cta-final-desc";

  const handleClick = useCallback(() => {
    try {
      window.dataLayer?.push({
        event: "cta_click",
        placement: "home_cta_final",
        label: "webinars",
      });
    } catch {}
  }, []);

  // Dispara cta_view cuando el bloque es visible ≥50% (una sola vez)
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    let viewed = false;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!viewed && entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          viewed = true;
          try {
            window.dataLayer?.push({
              event: "cta_view",
              placement: "home_cta_final",
            });
          } catch {}
          io.disconnect();
        }
      },
      { threshold: [0.5] }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="section--surface" role="region" aria-labelledby="cta-final-title">
      <div className="container">
        <div ref={cardRef} className="ctaCard shadow-soft">
          <h2 id="cta-final-title" className="title">
            Tu negocio no tiene que ser una ruleta de ingresos
          </h2>

          <p id={descId} className="subtitle">
            Con pasos claros y herramientas prácticas, puedes ver tus primeras ventas constantes en
            semanas, no años.
          </p>

          <Link
            href="/webinars"
            onClick={handleClick}
            className="btn-pill"
            aria-label="Empezar ahora con el plan para ingresos estables"
            aria-describedby={descId}
          >
            Quiero empezar ahora
          </Link>

          <p className="note">Acceso inmediato. Sin fórmulas complicadas, sin rodeos.</p>
        </div>
      </div>

      <style jsx>{`
        .ctaCard {
          max-width: 880px;
          margin: clamp(16px, 3vw, 28px) auto clamp(36px, 5vw, 56px);
          padding: clamp(24px, 4vw, 40px);
          text-align: center;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: #f4f7f7;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        .title {
          margin: 0 0 12px;
          line-height: 1.2;
          max-width: 22ch;
          margin-inline: auto;
          font-size: clamp(1.9rem, 5.2vw, 2.6rem);
          color: #0b0f10;
          letter-spacing: -0.01em;
        }
        .subtitle {
          margin: 0 auto 20px;
          max-width: 60ch;
          font-size: 0.98rem;
          color: #0b0f10;
          opacity: 0.88;
        }
        .note {
          margin: 18px 0 0;
          color: #4a5458;
        }
      `}</style>
    </section>
  );
}
