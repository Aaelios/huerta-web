// app/api/dev/freeclass-test/route.ts
// 1) Ruta de diagnóstico para validar el loader de FreeClassPage en runtime.
// 2) Ejecuta pruebas básicas de carga por SKU y por slugLanding y devuelve el resultado en JSON.

import { NextResponse } from "next/server";
import {
  loadFreeClassPageBySku,
  loadFreeClassPageBySlug,
} from "@/lib/freeclass/load";

export async function GET() {
  try {
    const sku = "liveclass-lobra-rhd-fin-freeintro-v001";
    const slugLanding = "fin-freeintro";

    const bySku = await loadFreeClassPageBySku(sku);
    const bySlug = await loadFreeClassPageBySlug(slugLanding);

    const result = {
      meta: {
        sku,
        slugLanding,
        hasBySku: bySku !== null,
        hasBySlug: bySlug !== null,
        skuMatches:
          bySku !== null && bySlug !== null
            ? bySku.sku === bySlug.sku
            : false,
      },
      data: {
        bySku,
        bySlug,
      },
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error in freeclass test";

    return NextResponse.json(
      {
        meta: {
          error: true,
        },
        error: {
          message,
        },
      },
      { status: 500 },
    );
  }
}
