// lib/checkout/f_callCatalogPrice.ts
import Stripe from 'stripe';

type Currency = 'MXN' | 'USD';

// -------- Inputs --------
export type CallByIdInput = {
  price_id: string;
  expand_product?: boolean;
};

export type MapBySkuInput = {
  sku: string;
  currency: Currency;
  price_list?: string | null;
  via?: 'f_checkout_mapping';
};

// -------- Stripe shapes (local, sin any) --------
type IStripeProduct = {
  id: string;
  deleted?: boolean;
  metadata?: Record<string, unknown>;
};

type IStripePrice = {
  id: string;
  type: 'one_time' | 'recurring';
  currency?: string | null;
  unit_amount?: number | null;
  metadata?: Record<string, unknown>;
  product: string | IStripeProduct;
};

// -------- Outputs --------
export type TCallPriceById =
  | {
      price: IStripePrice;
      product: IStripeProduct;
    }
  | null;

export type TCatalogRow = {
  sku: string;
  price_list: string;
  currency: string;
  amount_cents: number;
  billing_interval: string | null;
  is_subscription: boolean;
  product_type: string | null;
  fulfillment_type: string;
  stripe_product_id: string;
  stripe_price_id: string;
  product_metadata?: Record<string, unknown>;
  price_metadata?: Record<string, unknown>;
  // Compat para callers que leen row.metadata
  metadata: Record<string, unknown>;
};

// -------- Overloads públicos --------
export async function f_callCatalogPrice(input: CallByIdInput): Promise<TCallPriceById>;
export async function f_callCatalogPrice(input: MapBySkuInput): Promise<TCatalogRow>;

// -------- Implementación --------
export async function f_callCatalogPrice(
  input: CallByIdInput | MapBySkuInput
): Promise<TCallPriceById | TCatalogRow> {
  if ('price_id' in input) {
    // Path A: Stripe Price by ID (compat)
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const expandProduct = Boolean(input.expand_product);

    const price = (await stripe.prices.retrieve(input.price_id, {
      expand: expandProduct ? ['product'] : [],
    })) as unknown as IStripePrice;

    let product: IStripeProduct;
    if (typeof price.product === 'string') {
      const prod = (await stripe.products.retrieve(price.product)) as unknown as IStripeProduct;
      product = prod;
    } else {
      product = price.product;
    }

    return { price, product };
  }

  // Path B: Supabase RPC f_checkout_mapping (por SKU)
  const body = {
    p_sku: input.sku,
    p_currency: input.currency ?? 'MXN',
    p_price_list: input.price_list ?? null,
    p_use_validity: false,
    p_allow_fallback: true,
  };

  const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/f_checkout_mapping`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'count=none',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || 'RPC_ERROR');
  }

  const rowsUnknown = (await res.json()) as unknown;
  if (!Array.isArray(rowsUnknown) || rowsUnknown.length === 0) {
    throw new Error('PRICE_NOT_FOUND_FOR_CRITERIA');
  }

  const r = rowsUnknown[0] as Record<string, unknown>;

  const stripe_price_id = typeof r['stripe_price_id'] === 'string' ? r['stripe_price_id'] : null;
  const stripe_product_id = typeof r['stripe_product_id'] === 'string' ? r['stripe_product_id'] : null;

  if (!stripe_price_id || !stripe_product_id) {
    throw new Error('PRICE_NOT_FOUND_FOR_CRITERIA');
  }

  const sku = String(r['sku'] ?? '');
  const price_list = String(r['price_list'] ?? 'default');
  const currency = String(r['currency'] ?? 'MXN');
  const billing_interval = (r['billing_interval'] as string) ?? null;
  const fulfillment_type = String(r['fulfillment_type'] ?? '');

  const product_metadata = (r['product_metadata'] as Record<string, unknown>) ?? {};
  const price_metadata = (r['price_metadata'] as Record<string, unknown>) ?? {};

  const metadata: Record<string, unknown> = {
    price_list,
    interval: billing_interval,
    sku,
    fulfillment_type,
  };

  const row: TCatalogRow = {
    sku,
    price_list,
    currency,
    amount_cents: Number(r['amount_cents'] ?? 0),
    billing_interval,
    is_subscription: Boolean(r['is_subscription']),
    product_type: (r['product_type'] as string) ?? null,
    fulfillment_type,
    stripe_product_id: String(stripe_product_id),
    stripe_price_id: String(stripe_price_id),
    product_metadata,
    price_metadata,
    metadata,
  };

  return row;
}
