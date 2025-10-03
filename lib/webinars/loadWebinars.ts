// lib/webinars/loadWebinars.ts

import { promises as fs } from "fs";
import path from "path";
import { parse } from "jsonc-parser";
import type { WebinarMap } from "@/lib/types/webinars";

/**
 * loadWebinars
 * Lee el archivo data/webinars.jsonc y lo parsea con soporte de comentarios y comas finales.
 * Fallback actual; en el futuro se reemplazará por consulta a Supabase.
 */
export async function loadWebinars(): Promise<WebinarMap> {
  const filePath = path.join(process.cwd(), "data", "webinars.jsonc");
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = parse(raw) as WebinarMap;
  return parsed;
}
