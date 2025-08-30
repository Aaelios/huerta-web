// lib/checkout/f_parseInput.ts
export type CheckoutCreateInput = {
  sku: string;
  currency: 'MXN' | 'USD';
};

/**
 * Valida y normaliza los datos de entrada para crear una sesión de checkout.
 * Lanza { code:'BAD_REQUEST' } si algo es inválido.
 */
export function f_parseInput(body: unknown): CheckoutCreateInput {
  if (!body || typeof body !== 'object') {
    const err: any = new Error('Invalid body');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const { sku, currency } = body as Record<string, unknown>;

  if (typeof sku !== 'string' || sku.trim() === '') {
    const err: any = new Error('Missing or invalid sku');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const skuPattern = /^[a-z0-9.-]{3,}$/;
  if (!skuPattern.test(sku)) {
    const err: any = new Error('Invalid sku format');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  if (currency !== 'MXN' && currency !== 'USD') {
    const err: any = new Error('Invalid currency');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  return { sku, currency };
}
