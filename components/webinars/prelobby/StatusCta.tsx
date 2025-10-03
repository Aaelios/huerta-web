// components/webinars/prelobby/StatusCta.tsx

"use client";

import React from "react";

/**
 * StatusCta
 * Bloque presentacional del encabezado de estado.
 * El CTA, helper y countdown dinámico se renderizan en PrelobbyClient.
 */
export default function StatusCta() {
  return (
    <section className="stack-2" aria-labelledby="prelobby-cta-title">
      <h6 id="prelobby-cta-title" className="u-small u-color-subtle">
        Estado del evento
      </h6>
    </section>
  );
}
