// app/servicios/1a1-rhd/page.tsx
// Página estática de servicio · Sesión 1 a 1 RHD (90 minutos)

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "@/components/webinars/hub/WebinarsHub.module.css";
import { buildMetadata } from "@/lib/seo/buildMetadata";

const PRICE_LABEL = "$1,490 MXN";
const CTA_HREF = "/checkout/1a1-rhd?mode=payment";

const HERO_CONTENT = {
  eyebrow: "ASESORÍA PERSONALIZADA · 90 MINUTOS",
  title:
    "Una asesoría [[1 a 1]] para tener [[claridad]], foco y [[dinero]] entrando con [[orden]]",
  subtitle:
    "Trae tus dudas, números o ideas y en 90 minutos salimos con un diagnóstico claro, prioridades aterrizadas y un plan sencillo que puedas ejecutar sin sentirte abrumado.",
  note: "No necesitas tener todo perfecto ni meses de registros. Llegas con lo que tengas y desde ahí construimos claridad financiera.",
  ctaText: "Reservar mi asesoría",
} as const;

const STATEMENT_TEXT =
  "Sesión para dueños que siguen con [[muchas cosas encima]], números poco claros y sin saber [[qué mover primero]]. Aquí [[aterrizamos lo importante]] y sales con un [[plan simple y accionable]] para las próximas semanas.";

const PARA_QUIEN_LIST: string[] = [
  "Trabajas mucho, pero sientes que el dinero no refleja ese esfuerzo.",
  "Traes [[mil cosas encima]] y ya te cansaste de adivinar qué mover primero.",
  "Intentaste organizarte sola(o), pero tus números siguen [[poco claros]].",
];

const BENEFICIOS_LIST: string[] = [
  "[[Claridad real]] de cuánto entra, cuánto sale y qué te está frenando.",
  "Saber exactamente [[qué hacer primero]] para que entre más dinero.",
  "Un plan simple para las próximas semanas, sin caos ni pendientes infinitos.",
  "Decisiones con números, no con ansiedad. Más control y más foco.",
];

const INCLUYE_LIST: string[] = [
  "Asesoría personal 1 a 1 enfocada en tu negocio real, no teoría.",
  "Revisión rápida de tus materiales: capturas, notas, hojas o lo que tengas.",
  "Un [[mini mapa]] con tus próximos pasos claros y accionables.",
  "Opción de grabación si quieres revisarlo después.",
];

const CTA_MID_TITLE =
  "Reserva tu asesoría [[1 a 1]] y convierte tu desorden en decisiones claras";
const CTA_MID_BODY =
  "Aquí trabajamos sobre tu negocio real: sales con prioridades claras y un plan simple para las próximas semanas.";

// Metadata SEO centralizada para la página de servicio 1 a 1 RHD
export const metadata = buildMetadata({
  typeId: "static",
  pathname: "/servicios/1a1-rhd",
  title: "Asesoría 1 a 1 RHD de 90 minutos",
  description:
    "Sesión 1 a 1 de 90 minutos para revisar tus números, priorizar qué mover primero y salir con un plan claro y accionable para tu negocio.",
});

export default function Servicio1a1RHDPage() {
  return (
    <main aria-labelledby="servicio-1a1-hero-title">
      {/* 1) Hero principal */}
      <section className="l-hero" aria-labelledby="servicio-1a1-hero-title">
        <div className="container">
          <div className="l-heroGrid">
            {/* Columna texto */}
            <div>
              <p className="small">{HERO_CONTENT.eyebrow}</p>

              <h1 id="servicio-1a1-hero-title">
                {renderAccent(HERO_CONTENT.title)}
              </h1>

              <p className="u-lead u-maxw-prose">
                {renderAccent(HERO_CONTENT.subtitle)}
              </p>

              <p className="small u-maxw-prose">
                <strong>Duración:</strong> 90 minutos<br />
                <strong>Inversión:</strong> {PRICE_LABEL}
              </p>

              <div className="cluster-3">
                <Link
                  id="cta-servicio-1a1-hero"
                  href={CTA_HREF}
                  className="c-btn c-btn--solid c-btn--pill"
                  prefetch={false}
                  aria-label={HERO_CONTENT.ctaText}
                  aria-describedby="servicio-1a1-hero-cta-help"
                >
                  {HERO_CONTENT.ctaText}
                </Link>

                <p
                  id="servicio-1a1-hero-cta-help"
                  className="small"
                  style={{ color: "var(--fg-60)" }}
                >
                  {HERO_CONTENT.note}
                </p>
              </div>
            </div>

            {/* Columna imagen */}
            <div className="l-hero-imgCol">
              <Image
                src="/images/asesorias/hero.jpg"
                alt="Sesión uno a uno revisando el negocio y los números con calma."
                width={800}
                height={1000}
                priority
                fetchPriority="high"
                quality={70}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                decoding="async"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2) Statement principal */}
      <section
        className="section section--light"
        aria-label="Resumen de la sesión 1 a 1"
        style={{
          paddingTop: "var(--space-10)",
          paddingBottom: "var(--space-12)",
          backgroundColor: "#ffffff",
        }}
      >
        <div className="container">
          <div
            className="u-text-center"
            style={{
              maxWidth: "1100px",
              marginInline: "auto",
              paddingInline: "var(--space-4)",
              paddingBlock: "var(--space-6)",
              background:
                "radial-gradient(circle at 50% 0, rgba(51,130,77,0.10), transparent 75%)",
              borderRadius: "12px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(22px, 3.2vw, 44px)",
                lineHeight: 1.35,
                fontWeight: 500,
                color: "rgba(10,10,10,0.7)",
              }}
            >
              {renderAccent(STATEMENT_TEXT)}
            </h2>
          </div>
        </div>
      </section>

      {/* 3) Bloque de beneficios / más detalle (layout tipo ModuleSummary) */}
      <section
        className={`section ${styles.hub}`}
        aria-labelledby="servicio-1a1-summary-label"
      >
        <div className="container">
          <p
            id="servicio-1a1-summary-label"
            className="small u-text-center u-mb-8"
            style={{ opacity: 0.7 }}
          >
            Más detalle de la sesión 1 a 1
          </p>

          <div className="grid-2 u-grid-equal">
            {/* Columna A: Para quién es + Beneficios */}
            <article
              className="c-card stack-4"
              role="group"
              aria-label="Para quién es esta sesión y beneficios clave"
            >
              <div>
                <h3 className="u-mb-3">
                  {renderAccent("¿Para quién?")}
                </h3>
                <ul className="u-maxw-prose" role="list">
                  {PARA_QUIEN_LIST.map((item, index) => (
                    <SummaryLi key={`pq-${index.toString()}`} icon="✅">
                      {renderAccent(item)}
                    </SummaryLi>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="u-mb-3">
                  {renderAccent("Beneficios")}
                </h3>
                <ul className="u-maxw-prose" role="list">
                  {BENEFICIOS_LIST.map((item, index) => (
                    <SummaryLi key={`b-${index.toString()}`} icon="✅">
                      {renderAccent(item)}
                    </SummaryLi>
                  ))}
                </ul>
              </div>
            </article>

            {/* Columna B: Qué incluye */}
            <article
              className="c-card stack-4"
              role="group"
              aria-label="Qué incluye la sesión 1 a 1"
            >
              <div>
                <h3 className="u-mb-3">
                  {renderAccent("¿Qué incluye?")}
                </h3>
                <ul className="u-maxw-prose" role="list">
                  {INCLUYE_LIST.map((item, index) => (
                    <SummaryLi key={`i-${index.toString()}`} icon="✅">
                      {renderAccent(item)}
                    </SummaryLi>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 4) CTA final único (layout tipo CTA-mid oscuro) */}
      <section
        className="section section--surface"
        aria-labelledby="servicio-1a1-cta-mid-heading"
        style={{
          paddingTop: "var(--space-5)",
          paddingBottom: "var(--space-8)",
        }}
      >
        <div className="container">
          <div
            className="l-ctaInner l-ctaInner--bare"
            style={{
              maxWidth: "860px",
              marginInline: "auto",
              padding: "3rem 2.5rem 3.5rem",
              borderRadius: "28px",
              backgroundColor: "var(--surface-elevated)",
              border: "1px solid var(--border-dark-1)",
              boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
              textAlign: "center",
              color: "var(--text-on-dark)",
            }}
          >
            <h2
              id="servicio-1a1-cta-mid-heading"
              style={{
                margin: 0,
                fontSize: "clamp(28px, 3.8vw, 36px)",
                lineHeight: 1.25,
              }}
            >
              {renderAccent(CTA_MID_TITLE)}
            </h2>

            <p
              className="u-maxw-prose"
              style={{
                margin: "var(--space-4) auto var(--space-5)",
                fontSize: "1.12rem",
                color: "var(--text-on-dark)",
                opacity: 0.92,
              }}
            >
              {renderAccent(CTA_MID_BODY)}
            </p>

            <div
              className="u-maxw-prose"
              style={{ margin: "0 auto var(--space-6)" }}
            >
              <p
                className="small u-mb-1"
                style={{
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.85,
                }}
              >
                Inversión única
              </p>

              <p
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  marginBottom: "var(--space-2)",
                }}
              >
                {PRICE_LABEL}
              </p>

              <p
                className="small"
                style={{
                  color: "var(--accent)",
                  opacity: 0.9,
                }}
              >
                Un acompañamiento práctico para recuperar control y paz con tu negocio.
              </p>
            </div>

            <Link
              href={CTA_HREF}
              className="c-btn c-btn--solid c-btn--pill"
              prefetch={false}
              aria-label={HERO_CONTENT.ctaText}
              style={{
                paddingInline: "3.25rem",
                paddingBlock: "1rem",
                fontSize: "1.05rem",
                fontWeight: 600,
              }}
            >
              {HERO_CONTENT.ctaText}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

type SummaryLiProps = {
  icon: ReactNode;
  children: ReactNode;
};

function SummaryLi({ icon, children }: SummaryLiProps) {
  return (
    <li role="listitem" className="c-li">
      <span aria-hidden="true" className="c-li__icon c-li__icon--ok">
        {icon}
      </span>
      <span className="c-li__text">{children}</span>
    </li>
  );
}

/** Convierte [[texto]] en <span className="accent">texto</span>. */
function renderAccent(input: string): ReactNode {
  const parts: ReactNode[] = [];
  const regex = /\[\[(.+?)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec("");

  // Reiniciamos el regex para evitar fugas de estado.
  regex.lastIndex = 0;
  match = null;

  // Bucle principal
  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      parts.push(input.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="accent">
        {match[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    parts.push(input.slice(lastIndex));
  }

  return parts;
}
