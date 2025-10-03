// components/webinars/prelobby/ResourcesRow.tsx

"use client";

import React from "react";
import type { Webinar } from "@/lib/types/webinars";

/**
 * ResourcesRow
 * Botones secundarios y nota discreta debajo.
 */
export default function ResourcesRow({ webinar }: { webinar: Webinar }) {
  // Nueva estructura: datos en webinar.shared
  const shared = (webinar as any)?.shared ?? webinar;
  const template = shared?.template ?? null;
  const calendar = shared?.calendar ?? null;
  const slug: string = shared?.slug ?? "";

  const handleCalendar = () => {
    if (!calendar) return;
    if (calendar.mode === "generated") {
      if (slug) window.location.href = `/api/ics/${slug}`;
    } else if (calendar.mode === "static" && calendar.url) {
      window.open(calendar.url, "_blank", "noopener,noreferrer");
    }
  };

  const hasDownload =
    template?.mode === "link" && typeof template?.url === "string" && template.url.length > 0;

  return (
    <section className="stack-2" aria-labelledby="prelobby-resources-title">
      <h2 id="prelobby-resources-title">Recursos</h2>

      <div className="cluster-3">
        <button onClick={handleCalendar} className="c-btn c-btn--outline c-btn--md">
          Añadir al calendario
        </button>

        {hasDownload ? (
          <a
            href={template!.url as string}
            target="_blank"
            rel="noopener noreferrer"
            className="c-btn c-btn--outline c-btn--md"
          >
            Descargar plantilla
          </a>
        ) : null}
      </div>

      {!hasDownload && (
        <p className="u-small u-color-subtle">La plantilla se enviará por correo antes del evento.</p>
      )}
    </section>
  );
}
