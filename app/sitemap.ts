// app/sitemap.ts
import type { MetadataRoute } from "next";

// --- listado manual de páginas principales ---
const staticPages = [
  { url: "https://lobra.net/", priority: 1.0 },
  { url: "https://lobra.net/sobre-mi", priority: 0.8 },
  { url: "https://lobra.net/contacto", priority: 0.8 },
];

// --- listado de webinars (puedes ir agregando conforme crezcan) ---
const webinars = [
  { url: "https://lobra.net/webinars/oct-2025-01", priority: 0.9 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastMod = new Date();

  return [
    ...staticPages.map((p) => ({
      url: p.url,
      lastModified: lastMod,
      changeFrequency: "weekly" as const,
      priority: p.priority,
    })),
    ...webinars.map((p) => ({
      url: p.url,
      lastModified: lastMod,
      changeFrequency: "weekly" as const,
      priority: p.priority,
    })),
  ];
}
