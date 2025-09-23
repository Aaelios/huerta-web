// components/home/MiniBio.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

export default function MiniBio() {
  return (
    <section className="l-minibio" aria-labelledby="minibio-title">
      <div className="container">
        <div className="l-minibioGrid">
          {/* Avatar */}
          <figure className="c-avatar" role="group" aria-label="Foto de Roberto Huerta">
            <Image
              src="/images/home/roberto-huerta-minibio-600x600.jpg"
              alt="Roberto Huerta, consultor que ayuda a emprendedores a ganar claridad y mejores márgenes"
              width={600}
              height={600}
              priority={false}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 1200px) 520px, (min-width: 768px) 60vw, 90vw"
            />
          </figure>

          {/* Texto */}
          <div>
            <h2 id="minibio-title">¿Quién está detrás?</h2>

            <p className="u-lead">
              Soy Roberto Huerta. Ayudo a emprendedores a ganar claridad, organizar su
              dinero y tomar decisiones simples que se sostienen en el tiempo.
            </p>

            <ul className="list-check" role="list" aria-label="Credenciales y enfoque">
              <li>10+ años mapeando procesos y mejorando márgenes.</li>
              <li>Experiencia en P&amp;G gestionando soluciones SAP.</li>
              <li>Metodología práctica enfocada en resultados rápidos.</li>
              <li>Contenido y sesiones en vivo orientadas a la acción.</li>
            </ul>

            <p>
              <Link href="/sobre-mi" className="c-btn c-btn--solid c-btn--pill" aria-label="Conóceme más">
                Conóceme más
              </Link>
              {" "}
              <Link href="/contacto" className="c-btn c-btn--ghost c-btn--pill" aria-label="Contactar">
                Contacto
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
