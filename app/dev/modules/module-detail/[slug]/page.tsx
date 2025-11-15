// app/dev/modules/module-detail/[slug]/page.tsx
// Dev tester: visualizar la salida de loadModuleDetail para un pageSlug dado.
//
// Uso típico:
//   /dev/modules/module-detail/test?pageSlug=webinars/ms-tranquilidad-financiera

import type { Metadata } from "next";
import {
  loadModuleDetail,
  type ModuleDetail,
} from "@/lib/modules/loadModuleDetail";

export const metadata: Metadata = {
  title: "Dev · Module Detail",
};

// En Next 15.5 params y searchParams llegan como Promises
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page(props: PageProps) {
  // Protección: solo disponible cuando ALLOW_DEV_TESTS=1
  if (process.env.ALLOW_DEV_TESTS !== "1") {
    return (
      <main className="p-4">
        <h1 className="text-lg font-semibold">Dev route disabled</h1>
        <p>Define ALLOW_DEV_TESTS=1 para habilitar este tester.</p>
      </main>
    );
  }

  const { slug: rawSlug } = await props.params;
  const query = await props.searchParams;

  const rawPageSlug = query.pageSlug;

  let effectivePageSlug: string;
  if (typeof rawPageSlug === "string" && rawPageSlug.length > 0) {
    effectivePageSlug = rawPageSlug;
  } else if (Array.isArray(rawPageSlug) && rawPageSlug.length > 0) {
    effectivePageSlug = rawPageSlug[0];
  } else {
    effectivePageSlug = rawSlug;
  }

  let data: ModuleDetail | null = null;
  let error: { message: string } | null = null;

  try {
    data = await loadModuleDetail(effectivePageSlug);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unknown error loading module detail";
    error = { message };
  }

  const output = {
    meta: {
      paramsSlug: rawSlug,
      effectivePageSlug,
      hasData: data !== null,
    },
    data,
    error,
  };

  return (
    <main className="p-4">
      <h1 className="mb-4 text-lg font-semibold">
        Dev · module-detail tester
      </h1>

      <p className="mb-2 text-xs">
        Usa{" "}
        <code className="rounded bg-neutral-200 px-1 py-0.5 text-[11px]">
          ?pageSlug=webinars/ms-tranquilidad-financiera
        </code>{" "}
        para el caso real.
      </p>

      <pre className="whitespace-pre-wrap rounded bg-neutral-900 p-4 text-xs text-neutral-100">
        {JSON.stringify(output, null, 2)}
      </pre>
    </main>
  );
}
