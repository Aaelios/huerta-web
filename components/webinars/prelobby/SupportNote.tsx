// components/webinars/prelobby/SupportNote.tsx

import React from "react";

/**
 * SupportNote
 * Bloque de soporte al usuario.
 * Siempre muestra correo de soporte.
 * WhatsApp se integrará solo si está habilitado en el contrato del webinar.
 */
export default function SupportNote({ email }: { email: string }) {
  return (
    <section className="stack-2" aria-labelledby="prelobby-support-title">
      <h2 id="prelobby-support-title">Soporte</h2>
      <p className="u-small u-color-subtle">
        Si tienes algún problema el día del evento, escríbenos a{" "}
        <a href={`mailto:${email}`} className="u-link">
          {email}
        </a>
        .
      </p>
      {/* Futuro: botón de WhatsApp si está habilitado */}
    </section>
  );
}
