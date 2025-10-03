// components/webinars/prelobby/FaqList.tsx

"use client";

import React, { useState } from "react";

/**
 * FaqList
 * FAQ mínima para el Pre-lobby.
 * Estructura plegable: cada pregunta se puede abrir/cerrar.
 * Usa estilos globales .c-faq y .c-faq__q / .c-faq__a.
 */
export default function FaqList() {
  const faqs = [
    {
      q: "No puedo entrar a Zoom",
      a: "Verifica que tienes instalada la última versión de Zoom. Si el enlace no abre, copia la URL completa en tu navegador.",
    },
    {
      q: "No escucho el audio",
      a: "Dentro de Zoom, haz clic en la flecha junto al ícono de micrófono y selecciona las bocinas correctas.",
    },
    {
      q: "No me ven en la cámara",
      a: "Haz clic en la flecha junto al ícono de cámara en Zoom y selecciona la cámara correcta.",
    },
    {
      q: "¿Habrá grabación?",
      a: "Sí, el evento será grabado. Te enviaremos un correo con el acceso si corresponde a tu inscripción.",
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="stack-2" aria-labelledby="prelobby-faq-title">
      <h2 id="prelobby-faq-title">Preguntas frecuentes</h2>
      <ul className="l-faqGrid">
        {faqs.map((faq, idx) => (
          <li key={idx} className="c-faq">
            <button
              className="c-faq__q"
              aria-expanded={openIndex === idx}
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            >
              {faq.q}
            </button>
            {openIndex === idx && <p className="c-faq__a">{faq.a}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
