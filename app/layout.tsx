import "./globals.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import Gtm from "../components/Gtm";
import { Suspense } from "react";

export const metadata = {
  title: "Huerta Consulting",
  description: "Migración a Next.js",
};

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {/* GTM noscript para usuarios sin JS */}
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

        {/* GTM script + page_view SPA */}
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
