// app/robots.ts
// Definición de robots.txt para LOBRÁ (lobra.net).
// Diferencia producción vs entornos de preview/dev y publica el sitemap solo en prod.

import type { MetadataRoute } from "next";

const BASE_URL = "https://lobra.net";

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.VERCEL_ENV === "production";

  // Entornos no productivos (preview, dev, staging):
  // - Se bloquea todo el sitio vía Disallow: /
  // - No se expone sitemap (evita anunciar URLs de entornos no indexables).
  if (!isProd) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    };
  }

  // Producción: lobra.net
  // - Sitio indexable excepto rutas sensibles / privadas.
  // - Sitemap único en /sitemap.xml.
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/checkout",
          "/gracias",
          "/mi-cuenta",
          "/mis-compras",
          "/lp/",
          "/dev/",
          // Prelobby de webinars (ruta privada previa a sesión en vivo)
          "/webinars/*/prelobby",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
