// app/layout.tsx
import "./globals.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import Gtm from "../components/Gtm";
import { Suspense } from "react";
import localFont from "next/font/local";
import type { Metadata } from "next";
import Script from "next/script";

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

export const metadata: Metadata = {
  title: {
    default: "LOBRÁ",
    template: "%s | LOBRÁ",
  },
  description:
    "LOBRÁ es una plataforma para emprendedores en Latinoamérica que ofrece cursos, plantillas y asesoría para lograr rentabilidad, claridad financiera y crecimiento sostenible.",
  metadataBase: new URL("https://lobra.net"),
};

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      </body>
    </html>
  );
}
