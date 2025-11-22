// components/analytics/ViewContentTracker.tsx
"use client";

import { useEffect, useRef } from "react";
import type { AnalyticsContentType, AnalyticsEventBase } from "@/lib/analytics/dataLayer";
import { pushAnalyticsEvent } from "@/lib/analytics/dataLayer";

type ViewContentTrackerProps = {
  contentType: AnalyticsContentType;
  contentId: string;
  title?: string;
  metadata?: Record<string, unknown>;
};

export function ViewContentTracker({
  contentType,
  contentId,
  title,
  metadata,
}: ViewContentTrackerProps) {
  const hasSentRef = useRef(false);

  useEffect(() => {
    if (hasSentRef.current) return;
    hasSentRef.current = true;

    const pagePath =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : undefined;

    const pageTitle =
      title || (typeof document !== "undefined" ? document.title : undefined);

    // Construimos un objeto tipado explícito
    const basePayload: AnalyticsEventBase = {
      event: "view_content",
    };

    // Expandimos con campos válidos
    const payload: AnalyticsEventBase & Record<string, unknown> = {
      ...basePayload,
      content_id: contentId,
      content_type: contentType,
    };

    if (pagePath) payload.page_path = pagePath;
    if (pageTitle) payload.page_title = pageTitle;

    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        // Filtrar claves prohibidas en este Chat Hijo
        if (
          key === "event" ||
          key === "content_id" ||
          key === "content_type" ||
          key === "value" ||
          key === "currency" ||
          key === "items"
        ) {
          continue;
        }
        payload[key] = value;
      }
    }

    pushAnalyticsEvent(payload);
  }, [contentId, contentType, metadata, title]);

  return null;
}
