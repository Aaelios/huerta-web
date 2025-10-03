// app/webinars/page.tsx
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Webinars" };

export default function WebinarsPage() {
  return (
    <div className="stack-4">
      <h1>Webinars</h1>
      <p className="u-lead u-maxw-md">
        Estamos preparando esta sección. Mientras tanto, puedes acceder al webinar actual.
      </p>
      <div className="cluster-3">
        <Link
          href="/webinars/2025-10-14-2030"
          className="c-btn c-btn--solid c-btn--pill c-btn--lg"
        >
          Ir al Webinar de Octubre 2025
        </Link>
      </div>
    </div>
  );
}
