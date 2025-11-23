// app/sitemap.ts
// Sitemap XML para LOBRÁ (lobra.net).
// Expone solo rutas públicas indexables a partir de rutas estáticas, webinars y módulos.

import type { MetadataRoute } from "next";
import { loadWebinars } from "@/lib/webinars/loadWebinars";
import { loadModulesIndex } from "@/lib/modules/loadModulesIndex";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://lobra.net";
  const now = new Date();

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

  // Webinars individuales: /webinars/w-[slug]
  const webinars = await loadWebinars();
  const webinarRoutes: MetadataRoute.Sitemap = Object.keys(webinars).map(
    (slug) => ({
      url: `${baseUrl}/webinars/w-${slug}`,
      lastModified: now,
    })
  );

  // Módulos (bundles): pageSlug viene de products.page_slug (ej. "webinars/ms-tranquilidad-financiera")
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

  return [...staticRoutes, ...webinarRoutes, ...moduleRoutes];
}
