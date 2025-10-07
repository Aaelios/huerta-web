// Server-only resolver: decide el CTA post-compra para email y /gracias.
// Entrada: { fulfillment_type?, sku?, success_slug? }
// Salida:  { variant, href?, label?, items? }

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getWebinarBySku } from '@/lib/webinars/getWebinarBySku';
import { getPrelobbyUrl } from '@/lib/webinars/getPrelobbyUrl';

type Variant =
  | 'prelobby'
  | 'bundle'
  | 'download'
  | 'course'
  | 'schedule'
  | 'community'
  | 'generic'
  | 'none';

type ItemType = 'prelobby' | 'replay' | 'pending';

export type NextStep =
  | {
      variant: Variant;
      href?: string;
      label?: string;
      items?: Array<{
        title: string;
        when?: string | null;
        href?: string | null;
        label: string;
        type: ItemType;
      }>;
    }
  | { variant: 'none' };

type Input = { fulfillment_type?: string; sku?: string; success_slug?: string };

const LABELS = Object.freeze({
  prelobby: 'Ir al prelobby',
  download: 'Descargar',
  schedule: 'Agendar sesión',
  community: 'Entrar a la comunidad',
  generic: 'Continuar',
  pending: 'Próximamente',
});

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------- utils ----------
function toRelativeHref(slugOrPath?: string | null): string | undefined {
  if (!slugOrPath) return undefined;
  if (slugOrPath.startsWith('/')) return slugOrPath;
  return `/${slugOrPath}`;
}

function normalizeSuccessHref(success_slug?: string): string {
  const s = (success_slug ?? 'mi-cuenta').replace(/^\/+/, '');
  return `/${s}`;
}

function normalizeFulfillmentType(t?: string): string | undefined {
  if (!t) return undefined;
  switch (t) {
    case 'live_class':
    case 'bundle':
    case 'template':
    case 'one_to_one':
    case 'subscription_grant':
    case 'course':
      return t;
    // alias comunes
    case 'liveclass':
      return 'live_class';
    case 'one2one':
      return 'one_to_one';
    case 'sub':
      return 'subscription_grant';
    default:
      return t;
  }
}

// ---------- db ----------
async function fetchProduct(sku: string) {
  const { data, error } = await sb()
    .from('products')
    .select('sku, fulfillment_type, metadata')
    .eq('sku', sku)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[resolveNextStep] products query error', { sku, error });
    return null;
  }
  return data as { sku: string; fulfillment_type: string; metadata: any } | null;
}

async function fetchBundleChildren(bundleSku: string): Promise<any[]> {
  // Nota: no tipamos el retorno; normalizamos abajo.
  const { data, error } = await sb()
    .from('bundle_items')
    .select(
      'child_sku, qty, created_at, products!inner(sku, fulfillment_type, metadata)'
    )
    .eq('bundle_sku', bundleSku)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[resolveNextStep] bundle_items query error', { bundleSku, error });
    return [];
  }
  return data ?? [];
}

function sortByStartAtFirst(
  items: Array<{
    title: string;
    when?: string | null;
    href?: string | null;
    label: string;
    type: ItemType;
    _startAt?: number | null;
  }>
) {
  const withIdx = items.map((it, idx) => ({ ...it, _idx: idx }));
  withIdx.sort((a, b) => {
    const aHas = typeof a._startAt === 'number';
    const bHas = typeof b._startAt === 'number';
    if (aHas && bHas) return a._startAt! - b._startAt!;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return a._idx - b._idx; // mantiene orden original
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return withIdx.map(({ _idx, _startAt, ...rest }) => rest);
}

// ---------- core ----------
export async function resolveNextStep(input: Input): Promise<NextStep> {
  const { sku, success_slug } = input ?? {};
  let fulfillment = normalizeFulfillmentType(input.fulfillment_type);

  const resolution: Record<string, unknown> = { stage: 'start', input };

  // 1) DB como fuente si hay SKU
  let product: Awaited<ReturnType<typeof fetchProduct>> = null;
  if (sku) {
    product = await fetchProduct(sku);
    if (product) {
      fulfillment = normalizeFulfillmentType(product.fulfillment_type) || fulfillment;
      resolution['product_db'] = { sku: product.sku, fulfillment_type: fulfillment };
    } else {
      resolution['product_db'] = 'not_found';
    }
  }

  // 2) Decisión por tipo
  switch (fulfillment) {
    case 'live_class': {
      const webinar = sku ? await getWebinarBySku(sku) : null;
      if (webinar) {
        const href = getPrelobbyUrl(webinar);
        const out: NextStep = { variant: 'prelobby', href, label: LABELS.prelobby };
        console.log('[resolveNextStep]', { ...resolution, stage: 'ok_live_class', out });
        return out;
      }
      const out: NextStep = {
        variant: 'generic',
        href: normalizeSuccessHref(success_slug),
        label: LABELS.generic,
      };
      console.log('[resolveNextStep]', {
        ...resolution,
        stage: 'fallback_live_class_without_mapping',
        out,
      });
      return out;
    }

    case 'bundle': {
      if (!sku) {
        const out: NextStep = {
          variant: 'generic',
          href: normalizeSuccessHref(success_slug),
          label: LABELS.generic,
        };
        console.log('[resolveNextStep]', { ...resolution, stage: 'bundle_without_sku', out });
        return out;
      }

      const children = await fetchBundleChildren(sku);
      const itemsRaw: Array<{
        title: string;
        when?: string | null;
        href?: string | null;
        label: string;
        type: ItemType;
        _startAt?: number | null;
      }> = [];

      for (const row of children) {
        const childSku: string = row?.products?.sku ?? row?.child_sku;
        const childType: string | undefined = normalizeFulfillmentType(
          row?.products?.fulfillment_type
        );

        if (childType === 'live_class') {
          const webinar = await getWebinarBySku(childSku);
          if (webinar) {
            const href = getPrelobbyUrl(webinar);
            const title = webinar.shared?.title ?? childSku;
            const when = webinar.shared?.startAt ?? null;
            const startAtMs = when ? new Date(when).getTime() : null;
            itemsRaw.push({
              title,
              when,
              href,
              label: LABELS.prelobby,
              type: 'prelobby',
              _startAt: startAtMs,
            });
          } else {
            itemsRaw.push({
              title: childSku,
              when: null,
              href: null,
              label: LABELS.pending,
              type: 'pending',
              _startAt: null,
            });
          }
        } else if (childType === 'template') {
          itemsRaw.push({
            title: childSku,
            when: null,
            href: '/mis-compras',
            label: LABELS.download,
            type: 'pending',
            _startAt: null,
          });
        } else if (childType === 'one_to_one') {
          const scheduleUrl =
            typeof row?.products?.metadata?.schedule_url === 'string'
              ? toRelativeHref(row.products.metadata.schedule_url)
              : null;
          itemsRaw.push({
            title: childSku,
            when: null,
            href: scheduleUrl,
            label: LABELS.schedule,
            type: 'pending',
            _startAt: null,
          });
        } else if (childType === 'subscription_grant') {
          itemsRaw.push({
            title: childSku,
            when: null,
            href: '/comunidad',
            label: LABELS.community,
            type: 'pending',
            _startAt: null,
          });
        } else {
          itemsRaw.push({
            title: childSku,
            when: null,
            href: null,
            label: LABELS.pending,
            type: 'pending',
            _startAt: null,
          });
        }
      }

      const items = sortByStartAtFirst(itemsRaw);
      const out: NextStep = { variant: 'bundle', items };
      console.log('[resolveNextStep]', { ...resolution, stage: 'ok_bundle', count: items.length });
      return out;
    }

    case 'template': {
      const out: NextStep = { variant: 'download', href: '/mis-compras', label: LABELS.download };
      console.log('[resolveNextStep]', { ...resolution, stage: 'ok_template', out });
      return out;
    }

    case 'one_to_one': {
      let scheduleUrl: string | undefined;
      if (product?.metadata?.schedule_url && typeof product.metadata.schedule_url === 'string') {
        scheduleUrl = toRelativeHref(product.metadata.schedule_url);
      } else if (input.success_slug) {
        scheduleUrl = toRelativeHref(input.success_slug);
      }
      const out: NextStep = {
        variant: 'schedule',
        href: scheduleUrl ?? '/mi-cuenta',
        label: LABELS.schedule,
      };
      console.log('[resolveNextStep]', { ...resolution, stage: 'ok_one_to_one', out });
      return out;
    }

    case 'subscription_grant': {
      const out: NextStep = { variant: 'community', href: '/comunidad', label: LABELS.community };
      console.log('[resolveNextStep]', { ...resolution, stage: 'ok_subscription_grant', out });
      return out;
    }

    case 'course': {
      const out: NextStep = {
        variant: 'generic',
        href: normalizeSuccessHref(success_slug),
        label: LABELS.generic,
      };
      console.log('[resolveNextStep]', { ...resolution, stage: 'course_fallback_generic', out });
      return out;
    }

    default: {
      // Fallback global
      const out: NextStep = {
        variant: 'generic',
        href: normalizeSuccessHref(success_slug),
        label: LABELS.generic,
      };
      console.log('[resolveNextStep]', { ...resolution, stage: 'fallback_global', out });
      return out;
    }
  }
}

export default resolveNextStep;
