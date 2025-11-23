// lib/seo/schemas/mergeSchemas.ts
// Combinador genérico para JSON-LD.
// Limpia nulos, aplana arrays y evita duplicados por @id.

/**
 * Normaliza la entrada en un array plano de JsonLdObject.
 */
function normalize(input: unknown): any[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap(normalize);
  return [input];
}

/**
 * Fusiona varios objetos JSON-LD en un array final consistente.
 * Reglas:
 * - Filtra null/undefined
 * - Aplana recursivamente
 * - Dedup por @id si existe
 */
export function mergeSchemas(...items: unknown[]): any[] {
  const flat = items.flatMap(normalize);

  const seen = new Set<string>();
  const result: any[] = [];

  for (const item of flat) {
    if (typeof item !== "object" || item === null) continue;

    const id = (item as Record<string, unknown>)["@id"];
    if (typeof id === "string") {
      if (seen.has(id)) continue;
      seen.add(id);
    }

    result.push(item);
  }

  return result;
}
