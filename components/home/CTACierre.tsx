// components/home/CTACierre.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

export default function CTACierre() {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const titleId = "cta-title";
  const descId = "cta-desc";

  const handleClick = useCallback(() => {
    try {
      window.dataLayer?.push({ event: "cta_click", placement: "home_cta_final", label: "webinars" });
    } catch {}
  }, []);

  // cta_view una sola vez cuando ≥50% visible
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    let viewed = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!viewed && entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          viewed = true;
          try { window.dataLayer?.push({ event: "cta_view", placement: "home_cta_final" }); } catch {}
          io.disconnect();
        }
      },
      { threshold: [0.5] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="l-cta" aria-labelledby={titleId} role="region">
      <div className="container">
        <div ref={boxRef} className="l-ctaInner l-ctaInner--accent">
          <h2 id={titleId} className="c-cta__title">
            Tu negocio no tiene que ser una ruleta de ingresos
          </h2>

          <p id={descId} className="c-cta__lead u-center u-maxw-lg">
            Con pasos claros y herramientas prácticas, puedes ver tus primeras ventas constantes en semanas, no años.
          </p>

          <div className="l-ctaActions" aria-label="Acciones">
            <Link
              href="/webinars"
              className="c-btn c-btn--solid c-btn--pill"
              onClick={handleClick}
              aria-describedby={descId}
            >
              Quiero empezar ahora
            </Link>
          </div>

          <p className="u-small">Acceso inmediato. Sin fórmulas complicadas, sin rodeos.</p>
        </div>
      </div>
    </section>
  );
}
