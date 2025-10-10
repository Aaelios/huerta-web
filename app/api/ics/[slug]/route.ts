// app/api/ics/[slug]/route.ts

import { NextResponse } from "next/server";
import { loadWebinars } from "@/lib/webinars/loadWebinars";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  const CANON = process.env.CANONICAL_BASE_URL ?? "https://lobra.net";
  const HOST = new URL(CANON).host;
  const TZ = process.env.SITE_TZ ?? "America/Mexico_City";
  const BRAND = process.env.COMPANY_NAME ?? "LOBRA";

  const { slug } = await ctx.params;
  const webinars = await loadWebinars();
  const webinar = webinars[slug];
  if (!webinar) return new NextResponse("Webinar no encontrado", { status: 404 });

  const { shared } = webinar;
  const start = new Date(shared.startAt);
  const end = new Date(start.getTime() + shared.durationMin * 60000);

  // LOCAL para DTSTART/DTEND, UTC para DTSTAMP
  const dtStart = toICSLocal(start, TZ);
  const dtEnd = toICSLocal(end, TZ);
  const dtStamp = toICSUtc(new Date());

  const prelobbyUrl = `${CANON}/webinars/${shared.slug}/prelobby`;
  const joinUrl = shared.zoomJoinUrl || prelobbyUrl;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${BRAND}//Prelobby//ES`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${shared.slug}@${HOST}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=${TZ}:${dtStart}`,
    `DTEND;TZID=${TZ}:${dtEnd}`,
    `SUMMARY:${escapeICS(shared.title)}`,
    `DESCRIPTION:Accede al prelobby: ${prelobbyUrl}`,
    `URL:${joinUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=${shared.slug}.ics`,
    },
  });
}

// ---- Helpers

function toICSLocal(d: Date, timeZone: string): string {
  // YYYYMMDDTHHMMSS en la zona indicada
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  ) as Record<string, string>;

  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
}

function toICSUtc(d: Date): string {
  // YYYYMMDDTHHMMSSZ en UTC
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeICS(s: string): string {
  return s.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
}
