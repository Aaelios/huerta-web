// app/sitemap.ts
// Sitemap XML para LOBRÁ (lobra.net).
// Expone solo rutas públicas indexables a partir de rutas estáticas, webinars y módulos.

import type { MetadataRoute } from "next";
import { loadWebinars } from "@/lib/webinars/loadWebinars";
import { loadModulesIndex } from "@/lib/modules/loadModulesIndex";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://lobra.net";
  const now = new Date();

  // Rutas estáticas públicas.
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
    },
    {
      url: `${baseUrl}/webinars`,
      lastModified: now,
    },
    {
      url: `${baseUrl}/que-es-lobra`,
      lastModified: now,
    },
    {
      url: `${baseUrl}/servicios/1a1-rhd`,
      lastModified: now,
    },
    {
      url: `${baseUrl}/sobre-mi`,
      lastModified: now,
    },
    {
      url: `${baseUrl}/contacto`,
      lastModified: now,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: now,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: now,
    },
    {
      url: `${baseUrl}/reembolsos`,
      lastModified: now,
    },
  ];

  // Webinars individuales: /webinars/{slug}
  // Solo se incluyen los que son liveclass (workshops en vivo).
  const webinars = await loadWebinars();
  const webinarRoutes: MetadataRoute.Sitemap = Object.values(webinars)
    .filter((webinar) =>
      webinar.shared.pricing.sku.startsWith("liveclass-"),
    )
    .map((webinar) => ({
      url: `${baseUrl}/webinars/${webinar.shared.slug}`,
      lastModified: now,
    }));

  // Módulos (bundles): pageSlug viene de products.page_slug
  // Ejemplo: "webinars/ms-tranquilidad-financiera"
  const modulesIndex = await loadModulesIndex();
  const moduleRoutes: MetadataRoute.Sitemap = modulesIndex.map((module) => {
    const path = module.pageSlug.startsWith("/")
      ? module.pageSlug
      : `/${module.pageSlug}`;

    const lastModified =
      module.updatedAt !== null ? new Date(module.updatedAt) : now;

    return {
      url: `${baseUrl}${path}`,
      lastModified,
    };
  });

  // Merge de todas las fuentes.
  const mergedRoutes: MetadataRoute.Sitemap = [
    ...staticRoutes,
    ...webinarRoutes,
    ...moduleRoutes,
  ];

  // Deduplicación por URL: se conserva la entrada con lastModified más reciente.
  const byUrl = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const entry of mergedRoutes) {
    const existing = byUrl.get(entry.url);

    if (!existing) {
      byUrl.set(entry.url, entry);
      continue;
    }

    const existingTime = existing.lastModified
      ? new Date(existing.lastModified).getTime()
      : 0;
    const entryTime = entry.lastModified
      ? new Date(entry.lastModified).getTime()
      : 0;

    if (entryTime > existingTime) {
      byUrl.set(entry.url, entry);
    }
  }

  return Array.from(byUrl.values());
}
