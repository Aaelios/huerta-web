// components/Gtm.tsx
"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {
  initDataLayer,
  pushAnalyticsEvent,
  pushAnalyticsTestEvent,
} from "@/lib/analytics/dataLayer";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";
const SEND_TEST_EVENT = process.env.NEXT_PUBLIC_GTM_SEND_TEST_EVENT === "true";

export default function Gtm() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Page view SPA tracking
  useEffect(() => {
    if (!GTM_ID) {
      return;
    }

    const queryString = searchParams?.toString();
    const url = pathname + (queryString ? `?${queryString}` : "");

    initDataLayer();
    pushAnalyticsEvent({
      event: "page_view",
      page_path: url,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  // Dummy test event para validar infraestructura en GTM Preview
  useEffect(() => {
    if (!GTM_ID || !SEND_TEST_EVENT) {
      return;
    }

    initDataLayer();
    pushAnalyticsTestEvent("gtm_client_init");
  }, []);

  if (!GTM_ID) {
    return null;
  }

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
