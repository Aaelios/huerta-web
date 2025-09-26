// components/QueEsLobra/CTAFinal.tsx
"use client";

import Link from "next/link";
import { useCallback } from "react";

export default function CTAFinal() {
  const track = useCallback((label: string) => {
    try {
      window.dataLayer?.push({ event: "cta_click", placement: "final_section", label });
    } catch {}
  }, []);

  return (
    <section className="section section--light" aria-labelledby="cta-final-title">
      <div className="container u-text-center">
        <h2 id="cta-final-title">Empieza a lograr con <span className="accent">LOBRÁ</span></h2>
        <p className="u-lead">
          Logra resultados reales desde hoy, sin fórmulas mágicas.
        </p>

        <div className="cluster-3 u-mt-24">
          <Link
            href="/webinars"
            className="c-btn c-btn--solid c-btn--pill"
            onClick={() => track("cta_final")}
            aria-label="Empieza a lograr"
          >
            Empieza a lograr
          </Link>
        </div>

        <p className="small u-mt-12 fg-60">
          Acción práctica desde la primera sesión. Pago seguro con Stripe.
        </p>
      </div>
    </section>
  );
}
