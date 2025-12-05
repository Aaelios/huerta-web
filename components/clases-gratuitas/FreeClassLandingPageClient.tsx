// components/clases-gratuitas/FreeClassLandingPageClient.tsx

"use client";

/**
 * Componente cliente principal para la landing de clases gratuitas.
 *
 * Rol en 4.D:
 * - Renderiza HERO con layout específico de landing (LOBRÁ Pro).
 * - Mantiene Pantalla 2 como sección consolidada (bullets + mini bio + testimonios + CTA).
 * - No altera lógica de formulario ni contrato de FreeClassPage.
 */

import type { FC } from "react";
import Image from "next/image";
import type { FreeClassPage } from "@/lib/freeclass/schema";
import { renderAccent } from "@/lib/ui/renderAccent";
import FreeClassRegisterForm from "./FreeClassRegisterForm";

type Props = {
  page: FreeClassPage;
};

const FreeClassLandingPageClient: FC<Props> = ({ page }) => {
  const {
    hero,
    queSeLlevan,
    autor,
    testimonios,
    mensajeConfianza,
  } = page;

  const miniBio =
    "miniBio" in autor && autor.miniBio
      ? autor.miniBio
      : autor.bio;

  const handleScrollBackToForm = () => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("freeclass-form");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="landing-main">
      {/* ------------------------------------------------------------------ */}
      {/* HERO · Pantalla 1                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="landing-hero"
        aria-labelledby="landing-hero-title"
      >
        <div className="landing-hero-inner">
          {/* Bloque de texto principal */}
          <header className="landing-hero-copy">
            {/* ⛔ eyebrow y note YA NO van aquí. Los movimos al formulario. */}

            <h1
              id="landing-hero-title"
              className="landing-hero-title"
            >
              {renderAccent(hero.title)}
            </h1>

            {hero.subtitle ? (
              <p className="landing-hero-subtitle">
                {renderAccent(hero.subtitle)}
              </p>
            ) : null}
          </header>

          {/* Grid: imagen + formulario */}
          <div className="landing-hero-grid">
            <div className="landing-hero-image">
              <Image
                src={hero.image.src}
                alt={hero.image.alt}
                width={800}
                height={1000}
                priority
              />
            </div>

            {/* -------------------------------------------------------------- */}
            {/* FORM COLUMN                                                    */}
            {/* -------------------------------------------------------------- */}
            <div className="landing-hero-form-column">
              <div
                id="freeclass-form"
                className="landing-hero-form-card"
              >
                {/* ---------------------------------------------------------- */}
                {/* Eyebrow dentro del formulario                              */}
                {/* ---------------------------------------------------------- */}
                {hero.eyebrow ? (
                  <h2 className="landing-form-title">
                    {renderAccent(hero.eyebrow)}
                  </h2>
                ) : null}

                {/* ---------------------------------------------------------- */}
                {/* Note como subtítulo del formulario                         */}
                {/* ---------------------------------------------------------- */}
                {hero.note ? (
                  <p className="landing-form-subtitle">
                    {renderAccent(hero.note)}
                  </p>
                ) : null}

                {/* Formulario real */}
                <FreeClassRegisterForm page={page} />

                              {mensajeConfianza ? (
                <p className="landing-hero-trust">
                  {renderAccent(mensajeConfianza)}
                </p>
              ) : null}

              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* PANTALLA 2 DESKTOP · Sección consolidada                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="landing-screen2">
        <div className="landing-screen2-inner">
          {/* ---------------------------------------------------------------- */}
          {/* A + B: Bullets (izq) + Mini bio (der)                           */}
          {/* ---------------------------------------------------------------- */}
          <div className="landing-screen2-top">
            {/* A) Bullets · Qué te llevas */}
            {queSeLlevan.length > 0 && (
              <div className="landing-screen2-bullets">
                <h2 className="landing-section-title">
                  {renderAccent("[[Qué te llevas]]")}
                </h2>
                <ul className="landing-list">
                  {queSeLlevan.slice(0, 3).map((item) => (
                    <li
                      key={item}
                      className="landing-list-item"
                    >
                      {renderAccent(item)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* B) Mini bio corta */}
            <aside className="landing-screen2-bio">
              <h3 className="landing-section-subtitle">
                {renderAccent("[[Roberto Huerta]]")}
              </h3>
              <p className="landing-screen2-bio-text">
                {renderAccent(miniBio)}
              </p>
            </aside>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* C) Testimonios · Tres columnas                                   */}
          {/* ---------------------------------------------------------------- */}

        {testimonios && testimonios.length > 0 && (
          <section className="landing-screen2-testimonials">
            <h2 className="landing-section-title">
              Testimonios
            </h2>

            {/* Contenedor scrollable (mobile) + grid (desktop) */}
            <div className="landing-testimonials-scroller">
              <ul className="landing-testimonials">
                {testimonios.map((t, index) => {
                  const id = `${t.name}-${t.role}-${index}`;
                  return (
                    <li key={id} className="landing-testimonial-card">
                      <div className="landing-testimonial-header">
                        <Image
                          src={t.photoSrc}
                          alt={t.photoAlt ?? t.name}
                          width={56}
                          height={56}
                          className="landing-testimonial-avatar"
                        />
                        <div>
                          <p className="landing-testimonial-name">
                            {renderAccent(t.name)}
                          </p>
                          <p className="landing-testimonial-role">
                            {t.business
                              ? renderAccent(`${t.role} · ${t.business}`)
                              : renderAccent(t.role)}
                          </p>
                        </div>
                      </div>
                      <p className="landing-testimonial-quote">
                        “{renderAccent(t.quote)}”
                      </p>
                      {t.link ? (
                        <a
                          href={t.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="landing-testimonial-link"
                        >
                          Ver perfil
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {/* Indicadores tipo puntos (estáticos por ahora) */}
              <div className="landing-testimonials-dots">
                {testimonios.map((_, index) => (
                  <span
                    key={`dot-${index}`}
                    className="landing-testimonials-dot"
                  />
                ))}
              </div>
            </div>
          </section>
        )}

          {/* ---------------------------------------------------------------- */}
          {/* D) CTA final · Volver al formulario                              */}
          {/* ---------------------------------------------------------------- */}
          <div className="landing-screen2-cta">
            <button
              type="button"
              className="landing-screen2-cta-button"
              onClick={handleScrollBackToForm}
            >
              Quiero volver al formulario
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default FreeClassLandingPageClient;
