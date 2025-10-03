// app/api/ics/[slug]/route.ts

import { NextResponse } from "next/server";
import { loadWebinars } from "@/lib/webinars/loadWebinars";

/**
 * GET /api/ics/[slug]
 * Genera un archivo .ics con hora CDMX basado en startAt y durationMin del webinar.
 * Incluye título y enlace de prelobby; si existe zoomJoinUrl lo añade como URL.
 */
export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const webinars = await loadWebinars();
  const webinar = webinars[params.slug];

  if (!webinar) {
    return new NextResponse("Webinar no encontrado", { status: 404 });
  }

  const start = new Date(webinar.startAt);
  const end = new Date(start.getTime() + webinar.durationMin * 60000);

  const dtStart = toICSDate(start);
  const dtEnd = toICSDate(end);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Huerta Consulting//Prelobby//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${webinar.slug}@huerta.consulting`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART;TZID=America/Mexico_City:${dtStart}`,
    `DTEND;TZID=America/Mexico_City:${dtEnd}`,
    `SUMMARY:${escapeICS(webinar.title)}`,
    `DESCRIPTION:Accede al prelobby: https://huerta.consulting/webinars/${webinar.slug}/prelobby`,
    webinar.zoomJoinUrl
      ? `URL:${webinar.zoomJoinUrl}`
      : `URL:https://huerta.consulting/webinars/${webinar.slug}/prelobby`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const body = lines.join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=${webinar.slug}.ics`,
    },
  });
}

// ---- Helpers

function toICSDate(d: Date): string {
  // YYYYMMDDTHHmmss
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
    .slice(0, 15);
}

function escapeICS(s: string): string {
  return s.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
}
