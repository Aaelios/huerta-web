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
      q: "No puedo entrar a Teams",
      a: "Haz clic en el enlace y selecciona “Continuar en este navegador”. No necesitas iniciar sesión ni instalar la app. Si el enlace no abre, copia la URL completa en tu navegador.",
    },
    {
      q: "No tengo cuenta de Microsoft, ¿puedo entrar?",
      a: "Sí. No necesitas cuenta ni registro para participar. Solo escribe tu nombre cuando se te pida y haz clic en “Unirse ahora”.",
    },
    {
      q: "¿Es necesario usar la app de Teams?",
      a: "No. Puedes usar la versión web desde Edge, Chrome o Firefox. Si ya tienes la app instalada, también puedes usarla; funciona igual para este evento.",
    },
    {
      q: "Me pide acceso al micrófono y la cámara, ¿es seguro?",
      a: "Sí. Teams solicita permiso para usarlos durante la reunión. Solo se activan mientras estás dentro del evento y puedes apagarlos en cualquier momento.",
    },
    {
      q: "Dice que alguien me dejará entrar, ¿hice algo mal?",
      a: "Todo está bien. Significa que llegaste antes de que el anfitrión inicie la reunión. Solo espera unos momentos y se te permitirá entrar automáticamente cuando comience.",
    },
    {
      q: "No escucho el audio",
      a: "Antes de unirte, haz clic en el ícono de engrane (Configuración de dispositivos) y elige las bocinas o audífonos correctos. También puedes cambiarlo dentro de la reunión si es necesario.",
    },
    {
      q: "No me ven en la cámara",
      a: "Cuando el navegador lo solicite, permite el acceso a la cámara. Si no aparece tu imagen, revisa en Configuración > Dispositivos > Cámara dentro de Teams.",
    },
    {
      q: "¿Habrá grabación?",
      a: "Sí, el evento será grabado. Te enviaremos un correo con el acceso si corresponde a tu inscripción.",
    },
    {
    q: "¿Funciona en Safari?",
    a: "Sí, puedes unirte desde Safari sin instalar nada. Si no ves imagen o no escuchas audio, asegúrate de permitir el uso del micrófono y cámara cuando el navegador lo solicite.",
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
