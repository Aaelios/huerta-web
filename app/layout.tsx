// app/layout.tsx
// Root layout global de LOBRÁ: fuentes, GTM, header/footer, metadata base y schemas JSON-LD globales.

import "./globals.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import Gtm from "../components/Gtm";
import { Suspense } from "react";
import localFont from "next/font/local";
import type { Metadata } from "next";
import Script from "next/script";
import type { JsonLdObject } from "@/lib/seo/schemas/jsonLdTypes";
import { buildOrganizationSchema } from "@/lib/seo/schemas/buildOrganizationSchema";
import { buildWebsiteSchema } from "@/lib/seo/schemas/buildWebsiteSchema";
import { mergeSchemas } from "@/lib/seo/schemas/mergeSchemas";

// ---------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------

const satoshi = localFont({
  src: [
    { path: "../public/fonts/satoshi/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-Medium.woff2",  weight: "500", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-Bold.woff2",    weight: "700", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-Black.woff2",   weight: "900", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "optional",
  preload: true,
  fallback: ["system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

// ---------------------------------------------------------------------------
// Metadata base
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "LOBRÁ",
  description:
    "LOBRÁ es una plataforma para emprendedores en Latinoamérica que ofrece cursos, plantillas y asesoría para lograr rentabilidad, claridad financiera y crecimiento sostenible.",
  metadataBase: new URL("https://lobra.net"),
};

// ---------------------------------------------------------------------------
// Configuración GTM
// ---------------------------------------------------------------------------

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // -------------------------------------------------------------------------
  // Schemas JSON-LD globales (Organization + WebSite)
  // -------------------------------------------------------------------------
  // v1: configuración embebida. En fases siguientes se puede extraer a una capa de config.

  const organizationSchema = buildOrganizationSchema({
    name: "LOBRÁ",
    url: "https://lobra.net",
    logo: "https://lobra.net/images/brand/lobra-logo.png",
    id: "https://lobra.net/#organization",
    // sameAs se puede poblar cuando estén definidas las URLs oficiales:
    // sameAs: ["https://www.instagram.com/...", "https://www.youtube.com/@..."],
  });

  const websiteSchema = buildWebsiteSchema(
    {
      name: "LOBRÁ",
      url: "https://lobra.net",
      id: "https://lobra.net/#website",
      // search omitido: no hay buscador interno por ahora (SearchAction OFF).
    },
    "https://lobra.net/#organization",
  );

  // mergeSchemas:
  // - Aplana arrays
  // - Filtra nulos
  // - Deduplica por @id
  const globalSchemas = mergeSchemas(organizationSchema, websiteSchema) as JsonLdObject[];

  return (
    <html lang="es" className={satoshi.variable}>
      <head>
        {/* Cloudflare Turnstile */}
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          async
          defer
        />
      </head>
      <body className={satoshi.className}>
        {GTM_ID ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}

        <Suspense fallback={null}>
          <Gtm />
        </Suspense>

        <SiteHeader />
        <main className="container">{children}</main>
        <SiteFooter />

        {/* Script único de JSON-LD global (Organization + WebSite) */}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(globalSchemas),
          }}
        />
      </body>
    </html>
  );
}
