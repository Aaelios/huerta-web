// components/modules/ModuleClasses.tsx
// Propósito: Listar las clases / elementos hijos de un módulo (bundle) usando ModuleDetail.children.
// Enfoque: estructura visual limpia, jerarquía clara y diferencias entre workshops y sesión 1:1.

import React from "react";
import Link from "next/link";
import type { ModuleDetail } from "@/lib/modules/loadModuleDetail";
import styles from "@/components/webinars/hub/WebinarsHub.module.css";
import { LocalDateTime } from "@/components/modules/common/LocalDateTime";

type ModuleClassesProps = {
  module: ModuleDetail;
};

type ModuleChild = ModuleDetail["children"][number];

export function ModuleClasses({ module }: ModuleClassesProps) {
  const { children, sales } = module;

  if (!Array.isArray(children) || children.length === 0) {
    return null;
  }

  // 0) Detectar si todas las clases comparten el mismo tema principal (topics[0]).
  const primaryTopics = children
    .map((child) => child.topics[0])
    .filter((topic): topic is string => Boolean(topic));
  const uniqueTopics = new Set(primaryTopics);
  const sharedPrimaryTopic: string | null =
    primaryTopics.length > 0 && uniqueTopics.size === 1
      ? primaryTopics[0]
      : null;

  // 1) Orden por fecha ascendente; sin fecha se van al final.
  const sortedChildren = [...children].sort((a, b) => {
    const timeA = a.nextStartAt
      ? new Date(a.nextStartAt).getTime()
      : Number.POSITIVE_INFINITY;
    const timeB = b.nextStartAt
      ? new Date(b.nextStartAt).getTime()
      : Number.POSITIVE_INFINITY;
    return timeA - timeB;
  });

  // 2) Clases principales vs sesiones 1:1 (estas siempre al final).
  const mainClasses = sortedChildren.filter(
    (child) => child.fulfillmentType !== "one_to_one"
  );
  const supportSessions = sortedChildren.filter(
    (child) => child.fulfillmentType === "one_to_one"
  );

  return (
    <section
      className={`section ${styles.hub}`}
      aria-labelledby="module-classes-title"
    >
      <div className="container">
        <header className="u-text-center u-maxw-prose u-mb-6">
          <p className="small">Contenido del módulo</p>
          <h2 id="module-classes-title">
            {renderAccent(
              "[[Domina tu dinero]] con estos workshops prácticos en vivo"
            )}
          </h2>
          <p className="u-lead">
            {renderAccent(
              sales.hero.subtitle ||
                "Reúne todas las sesiones clave en una sola experiencia estructurada."
            )}
          </p>
        </header>

        <div className={styles.classGrid}>
          {/* Clases principales */}
          {mainClasses.map((child, index) =>
            renderChildCard({
              child,
              classNumber: index + 1,
              isSupportSession: false,
              sharedPrimaryTopic,
            })
          )}

          {/* Sesiones 1:1 al final */}
          {supportSessions.map((child) =>
            renderChildCard({
              child,
              classNumber: null,
              isSupportSession: true,
              sharedPrimaryTopic,
            })
          )}
        </div>
      </div>
    </section>
  );
}

type RenderChildCardParams = {
  child: ModuleChild;
  classNumber: number | null;
  isSupportSession: boolean;
  sharedPrimaryTopic: string | null;
};

function renderChildCard({
  child,
  isSupportSession,
  sharedPrimaryTopic,
}: RenderChildCardParams): React.ReactElement {
  const isLiveClass = child.fulfillmentType === "live_class";
  const typeLabelBase = mapFulfillmentTypeLabel(child.fulfillmentType);
  const typeLabel = isSupportSession
    ? "Sesión 1:1 · Personalizada"
    : typeLabelBase;
  const levelLabel = child.level ? formatLabelCase(child.level) : null;

  // Tema principal de la clase, respetando la regla:
  // - Si todas las clases comparten el mismo tema, no se muestra ninguno.
  const primaryTopicRaw = child.topics[0] ?? null;
  let primaryTopic: string | null = null;
  if (primaryTopicRaw) {
    const sameAsShared =
      sharedPrimaryTopic !== null && primaryTopicRaw === sharedPrimaryTopic;
    if (!sameAsShared) {
      primaryTopic = formatLabelCase(primaryTopicRaw);
    }
  }

  const hasLevelOrTopic = Boolean(levelLabel || primaryTopic);
  const detailHref = child.pageSlug ? `/${child.pageSlug}` : null;

  const ctaLabel = isSupportSession ? "Ver cómo funciona" : "Ver contenido";

  // Sesión 1:1 tiene layout específico (beneficio premium, sin fecha fija).
  if (isSupportSession) {
    return (
      <article
        key={child.sku}
        className={`c-card ${styles.card}`}
        role="group"
        aria-label={`Sesión 1 a 1 incluida en el módulo: ${child.title}`}
        style={{ display: "flex", flexDirection: "column" }}
      >
        {child.cover && (
          <div className={styles.cardMedia}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={child.cover}
              alt={child.title}
              className={styles.cardMediaImage}
            />
          </div>
        )}

        <div
          className="u-p-4"
          style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}
        >
          <header className="u-mb-3">
            <p className="small u-mb-1 u-color-subtle">{typeLabel}</p>

            <h3
              className={`${styles.cardTitle} ${styles.titleClass}`}
              style={{ marginBottom: "0.35rem" }}
            >
              {child.title}
            </h3>

            <div className="u-mt-3">
              <span
                className="badge small"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: "var(--fg-70)",
                  borderRadius: "999px",
                  border: "none",
                  paddingInline: "0.75rem",
                  paddingBlock: "0.1rem",
                }}
              >
                Incluida con tu inscripción
              </span>
            </div>
          </header>

          <p className="small u-color-subtle u-mb-0">
            <span
              aria-hidden="true"
              style={{
                marginRight: "0.35rem",
                position: "relative",
                top: "1px",
              }}
            >
              🕒
            </span>
            Se agenda después de inscribirte.
          </p>

          {detailHref && (
            <div className="u-mt-4" style={{ marginTop: "auto" }}>
              <Link
                href={detailHref}
                className="c-btn c-btn--outline c-btn--pill small"
                prefetch={false}
              >
                {ctaLabel}
              </Link>
            </div>
          )}
        </div>
      </article>
    );
  }

  // Layout para workshops en vivo / clases principales.
  return (
    <article
      key={child.sku}
      className={`c-card ${styles.card}`}
      role="group"
      aria-label={child.title}
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* Imagen de portada opcional tipo hub, con badge sólido para EN VIVO */}
      {child.cover && (
        <div className={styles.cardMedia} style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={child.cover}
            alt={child.title}
            className={styles.cardMediaImage}
          />

          {isLiveClass && (
            <div
              className="badge small"
              style={{
                position: "absolute",
                top: "0.75rem",
                left: "0.75rem",
                backgroundColor: "#1FC16C",
                color: "#ffffff",
                borderRadius: "999px",
                border: "none",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.35)",
                padding: "0.15rem 0.75rem",
              }}
            >
              ● Workshop en vivo
            </div>
          )}
        </div>
      )}

      <div
        className="u-p-4"
        style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}
      >
        <header className="u-mb-3">
          <p className="small u-mb-1 u-color-subtle">{typeLabel}</p>

          <h3
            className={`${styles.cardTitle} ${styles.titleClass}`}
            style={{ marginBottom: "0.35rem" }}
          >
            {child.title}
          </h3>
        </header>

        {/* Meta compacta: fecha + nivel/tema en dos líneas */}
        <div className="u-maxw-prose">
          <p className="small u-color-subtle u-mb-1">
            <span
              aria-hidden="true"
              style={{
                marginRight: "0.35rem",
                position: "relative",
                top: "1px",
              }}
            >
              📅
            </span>
            <LocalDateTime iso={child.nextStartAt} />
          </p>

          {hasLevelOrTopic && (
            <p className="small u-color-subtle u-mb-0">
              {levelLabel}
              {levelLabel && primaryTopic ? " • " : ""}
              {primaryTopic}
            </p>
          )}
        </div>

        {detailHref && (
          <div className="u-mt-4" style={{ marginTop: "auto" }}>
            <Link
              href={detailHref}
              className="c-btn c-btn--outline c-btn--pill small"
              prefetch={false}
            >
              {ctaLabel}
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Mapea el fulfillmentType técnico a una etiqueta legible.
 * Mantiene el valor original si no hay mapeo explícito.
 */
function mapFulfillmentTypeLabel(
  fulfillmentType: ModuleDetail["children"][number]["fulfillmentType"]
): string {
  switch (fulfillmentType) {
    case "live_class":
      return "En vivo · 90 min";
    case "course":
      return "Curso grabado";
    case "template":
      return "Plantilla";
    case "one_to_one":
      return "Sesión 1 a 1";
    case "subscription_grant":
      return "Acceso por suscripción";
    default:
      return fulfillmentType;
  }
}

/**
 * Normaliza etiquetas tipo "fundamentos" → "Fundamentos".
 */
function formatLabelCase(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length === 0) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Convierte [[texto]] en <span className="accent">texto</span>. */
function renderAccent(input: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\[\[(.+?)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

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