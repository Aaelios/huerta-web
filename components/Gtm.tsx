"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";

export default function Gtm() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Disparar page_view en cada navegación
  useEffect(() => {
    if (!GTM_ID) return;
    const url =
      pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({
      event: "page_view",
      page_path: url,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  if (!GTM_ID) return null;

  return (
    <Script id="gtm-base" strategy="afterInteractive">{`
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${GTM_ID}');
    `}</Script>
  );
}
