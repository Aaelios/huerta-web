// app/layout.tsx
import "./globals.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import Gtm from "../components/Gtm";
import { Suspense } from "react";
import localFont from "next/font/local";

const satoshi = localFont({
  src: [
    { path: "../public/fonts/satoshi/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-Medium.woff2",  weight: "500", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-Bold.woff2",    weight: "700", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-Black.woff2",   weight: "900", style: "normal" },
  ],
  variable: "--font-satoshi",
  // reduce CLS en conexiones lentas manteniendo UX
  display: "optional",
  preload: true,
  fallback: ["system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
  // activa size-adjust para que el fallback tenga métrica compatible
  adjustFontFallback: "Arial",
});

export const metadata = {
  title: "Huerta Consulting",
  description: "Migración a Next.js",
};

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={satoshi.variable}>
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
