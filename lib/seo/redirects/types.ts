// lib/seo/redirects/types.ts
// Tipos centrales para el sistema de redirecciones de negocio (Bloque 05 SEO).

export type RedirectMatchType = "exact";

export type RedirectKind =
  | "slug_migration"
  | "legacy_platform"
  | "typo_fix"
  | "business_decision";

export type RedirectType = "permanent" | "temporary";

export interface RedirectBusinessRule {
  id: string;
  source: string;
  destination: string;
  type: RedirectType;
  match: RedirectMatchType;
  kind: RedirectKind;
  enabled: boolean;
  notes: string;
}

export interface RedirectBusinessFile {
  version: "v1";
  updatedAt: string;
  rules: RedirectBusinessRule[];
}
