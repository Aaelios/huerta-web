// components/webinars/prelobby/PreparationList.tsx

import React from "react";

/**
 * PreparationList
 * Checklist de pasos recomendados para preparar al asistente.
 * Incluye id="preparacion" para anclaje desde el CTA.
 */
export default function PreparationList() {
  return (
    <section
      id="preparacion"
      className="stack-2"
      aria-labelledby="prelobby-prep-title"
    >
      <h2 id="prelobby-prep-title">Prepárate antes del evento</h2>
      <ul className="list-check stack-2">
        <li>Instala o actualiza Zoom en tu computadora o celular.</li>
        <li>Haz una prueba rápida de audio y cámara.</li>
        <li>Abre Excel o Google Sheets para seguir el taller.</li>
        <li>Asegúrate de tener buena iluminación frontal.</li>
        <li>Usa una conexión de internet estable, evita descargas.</li>
        <li>Busca un espacio sin distracciones durante 90 min.</li>
      </ul>
    </section>
  );
}
