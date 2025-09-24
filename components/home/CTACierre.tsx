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
    <section className="section section--dark l-cta" aria-labelledby={titleId} role="region">
      <div className="container">
        <div ref={boxRef} className="c-card l-ctaInner">
          <h2 id={titleId} className="c-cta__title">
            Orgullo y seguridad en cada logro personal.
          </h2>

            <p id={descId} className="c-cta__lead u-center u-maxw-lg">
              Con <span className="accent">LOBRÁ</span> obtienes educación práctica para emprendedores y freelancers en LATAM. 
              Desde el primer paso generas un avance real:{" "}
              <span className="accent">más ingresos</span>,{" "}
              <span className="accent">más tiempo libre</span> y{" "}
              <span className="accent">confianza</span> sin fórmulas mágicas.
            </p>

          <div className="l-ctaActions" aria-label="Acciones">
            <Link
              href="/webinars"
              className="c-btn c-btn--solid c-btn--pill"
              onClick={handleClick}
              aria-describedby={descId}
            >
              Ver próximos webinars
            </Link>
          </div>

          <p className="u-small">Acceso inmediato. Webinars en vivo y bajo demanda. Pago seguro con Stripe.</p>
        </div>
      </div>
    </section>
  );
}
