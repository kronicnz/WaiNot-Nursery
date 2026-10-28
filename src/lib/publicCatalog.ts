import { createClient } from '@supabase/supabase-js';

export interface PublicPlantCategory {
  id: string;
  name: string;
  title: string;
  description: string;
  image_url: string | null;
  image_alt: string;
  sort_order: number;
}

export interface PublicPlantPrice {
  pot_size: string;
  pot_size_id: string;
  price: number | null;
  sort_order: number;
}

export interface PublicPlant {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  image_alt: string;
  category_sort_order: number;
  sort_order: number;
  prices?: PublicPlantPrice[] | null;
  low_availability: boolean;
}

export interface PriceListRow {
  sku: string;
  name: string;
  category: string;
  category_sort_order: number;
  sort_order: number;
  pot_size: string;
  min_qty: number;
  discount_pct: number;
  unit_price: number | null;
}

export async function getPublicPlantCatalog() {
  const supabase = createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
  const [categoriesResult, plantsResult] = await Promise.all([
    supabase.from('public_catalog_categories').select('*').order('sort_order'),
    supabase.from('public_catalog_plants').select('*').order('category_sort_order').order('sort_order'),
  ]);

  if (categoriesResult.error) {
    throw new Error(`Unable to load plant categories: ${categoriesResult.error.message}`);
  }
  if (plantsResult.error) {
    throw new Error(`Unable to load plant catalog: ${plantsResult.error.message}`);
  }

  const plants = (plantsResult.data ?? []).map((p: any) => ({
    ...p,
    prices: Array.isArray(p.prices)
      ? p.prices
          .map((pr: any) => ({
            pot_size: pr.pot_size,
            pot_size_id: pr.pot_size_id,
            price: pr.price == null ? null : Number(pr.price),
            sort_order: pr.sort_order ?? 0,
          }))
          .sort((a: PublicPlantPrice, b: PublicPlantPrice) => a.sort_order - b.sort_order || a.pot_size.localeCompare(b.pot_size))
      : null,
  })) as PublicPlant[];

  return {
    categories: categoriesResult.data as PublicPlantCategory[],
    plants,
  };
}

export async function getPublicPriceList(): Promise<PriceListRow[]> {
  const supabase = createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from('public_catalog_price_list')
    .select('*')
    .order('category_sort_order')
    .order('sort_order')
    .order('pot_size')
    .order('min_qty');
  if (error) throw new Error(`Unable to load price list: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    sku: row.sku,
    name: row.name,
    category: row.category,
    category_sort_order: row.category_sort_order,
    sort_order: row.sort_order,
    pot_size: row.pot_size,
    min_qty: row.min_qty,
    discount_pct: Number(row.discount_pct),
    unit_price: row.unit_price == null ? null : Number(row.unit_price),
  })) as PriceListRow[];
}
