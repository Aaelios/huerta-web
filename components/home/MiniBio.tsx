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
              alt="Roberto Huerta, creador de LOBRÁ"
              width={600}
              height={600}
              priority={false}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 1200px) 400px, (min-width: 768px) 48vw, 90vw"
            />
          </figure>

          {/* Texto */}
          <div>
            <h2 id="minibio-title">
              ¿Quién está detrás de <span className="accent">LOBRÁ</span>?
            </h2>

            <p className="u-lead">
              <strong>Soy Roberto Huerta.</strong> Acompaño a emprendedores y freelancers a lograr{" "}
              <span className="accent">más ingresos</span>,{" "}
              <span className="accent">más tiempo libre</span> y{" "}
              <span className="accent">confianza</span> con educación práctica y herramientas listas para usar.
            </p>

            <ul className="list-check" role="list" aria-label="Credenciales y enfoque">
              <li>
                Más de <strong>22 años de experiencia</strong> ayudando negocios a crecer y ser rentables.
              </li>
              <li>
                Dirección de proyectos en <strong>empresas transnacionales</strong> y equipos en LATAM.
              </li>
              <li>
                Metodología enfocada en <span className="accent">resultados visibles</span> desde el primer paso.
              </li>
              <li>
                Sesiones en vivo + materiales aplicables <strong>ese mismo día</strong>.
              </li>
            </ul>

            {/* Claim + CTAs con mejor aire */}
            <div className="stack-3 u-center">
              <h3 className="u-lead u-center">
                <em><span className="accent">El éxito que soñaste al emprender, hoy alcanzado.</span></em>
              </h3>
              <div className="cluster-3">
                <Link
                  href="/webinars"
                  className="c-btn c-btn--solid c-btn--pill"
                  aria-label="Ver webinars"
                >
                  Ver webinars
                </Link>
                <Link
                  href="/sobre-mi"
                  className="c-btn c-btn--ghost c-btn--pill"
                  aria-label="Conóceme"
                >
                  Conóceme
                </Link>
                <Link
                  href="/contacto"
                  className="c-btn c-btn--ghost c-btn--pill"
                  aria-label="Contacto"
                >
                  Contacto
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
