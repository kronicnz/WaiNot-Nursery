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

export interface PublicPlant {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  image_alt: string;
  category_sort_order: number;
  sort_order: number;
  price: number | null;
  low_availability: boolean;
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

  return {
    categories: categoriesResult.data as PublicPlantCategory[],
    plants: plantsResult.data as PublicPlant[],
  };
}
