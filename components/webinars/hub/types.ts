// components/webinars/hub/types.ts
/**
 * Tipos — Webinars Hub v1
 * Contrato tipado UI↔API. Estricto y reutilizable.
 */

export type FulfillmentType = 'live_class' | 'bundle' | 'course' | 'one_to_one';

export interface HubItemDTO {
  sku: string;
  title: string;
  cover: string | null;
  level: 'Fundamentos' | 'Profundización' | 'Impacto' | null;
  topics: string[];
  price_cents: number | null;
  currency: string | null;
  purchasable: boolean;
  module_sku: string | null;
  next_start_at: string | null; // ISO
  instance_count_upcoming: number;
  featured: boolean;
  fulfillment_type: FulfillmentType;
  landing_slug: string; // /webinars/[slug]
  instance_slug: string | null; // /webinars/[slug] de instancia próxima si aplica
}

export interface HubApiResponse {
  page: number;
  page_size: number;
  total: number;
  items: HubItemDTO[];
}
