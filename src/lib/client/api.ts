export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    credentials: 'same-origin',
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (res.status === 401) {
    window.location.href = '/admin/login';
    throw new ApiError(401, 'Signed out');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const isNetworkError = (e: unknown) => e instanceof TypeError;

export interface Product {
  id: string;
  sku: string;
  name: string;
  botanical_name: string | null;
  category_id: string;
  pot_size: string | null;
  price: number | null;
  reorder_level: number;
  public_description: string;
  public_image_url: string | null;
  public_image_alt: string;
  catalog_sort_order: number;
  image_path: string | null;
  notes: string | null;
  active: boolean;
  total_qty?: number;
  product_barcodes?: { barcode: string; type: string }[];
  stock_levels?: { batch_id: string | null; qty: number }[];
  batches?: { id: string; batch_code: string; potted_on: string | null; barcode: string; archived_at: string | null; qty?: number }[];
  scanned_batch_id?: string;
}
export interface Category {
  id: string;
  name: string;
}
export interface Location {
  id: string;
  name: string;
  kind: 'bench' | 'tunnel' | 'shadehouse' | 'shop' | 'other';
  active: boolean;
}
export interface Movement {
  id: string;
  product_id: string;
  batch_id: string | null;
  location_id: string | null;
  delta: number;
  reason: 'receive' | 'sale' | 'adjust' | 'transfer' | 'loss' | 'stocktake';
  note: string | null;
  user_id: string;
  client_op_id: string;
  created_at: string;
  products: { name: string; sku: string } | null;
  batches: { batch_code: string } | null;
  locations: { name: string; kind: string } | null;
  profiles: { name: string } | null;
}
export interface Me {
  id: string;
  email: string;
  role: 'owner' | 'staff';
}
