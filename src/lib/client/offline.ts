import { openDB, type DBSchema } from 'idb';
import { api, type Product } from './api';

export interface QueuedMovement {
  client_op_id: string;
  product_id: string;
  batch_id?: string | null;
  delta: number;
  reason: 'receive' | 'sale' | 'adjust' | 'loss';
  note?: string | null;
  queued_at: number;
  product_name: string;
  error?: string;
}

interface Schema extends DBSchema {
  queue: { key: string; value: QueuedMovement };
  catalog: { key: string; value: { barcode: string; product: Product } };
  meta: { key: string; value: unknown };
}

const db = () =>
  openDB<Schema>('wainot-stock', 2, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore('queue', { keyPath: 'client_op_id' });
        d.createObjectStore('catalog', { keyPath: 'barcode' });
      }
      if (oldVersion < 2 && d.objectStoreNames.contains('meta')) d.deleteObjectStore('meta');
    },
  });

export const enqueue = async (m: QueuedMovement) => (await db()).put('queue', m);
export const listQueue = async () => (await db()).getAll('queue');

// Sends queued movements; the server is idempotent on client_op_id so retries are safe.
export async function flushQueue(): Promise<{ sent: number; failed: number; remaining: number }> {
  const d = await db();
  const pending = (await d.getAll('queue')).filter((q) => !q.error);
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < pending.length; i += 100) {
    const chunk = pending.slice(i, i + 100);
    try {
      const { results } = await api<{ results: { client_op_id: string; ok: boolean; status: number; error?: string }[] }>(
        '/api/stock/movements',
        {
          method: 'POST',
          json: {
            movements: chunk.map(({ client_op_id, product_id, batch_id, delta, reason, note }) => ({
              client_op_id,
              product_id,
              batch_id,
              delta,
              reason,
              note,
            })),
          },
        },
      );
      for (const r of results) {
        if (r.ok) {
          await d.delete('queue', r.client_op_id);
          sent++;
        } else if (r.status === 429 || r.status >= 500) {
          // transient: keep for retry
        } else {
          const item = await d.get('queue', r.client_op_id);
          if (item) await d.put('queue', { ...item, error: r.error ?? 'Rejected' });
          failed++;
        }
      }
    } catch {
      break;
    }
  }
  return { sent, failed, remaining: (await d.getAll('queue')).length };
}

export const discardQueued = async (id: string) => (await db()).delete('queue', id);

// Caches products locally so scans resolve while offline.
export async function refreshCatalog() {
  const items: Product[] = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const r = await api<{ items: Product[] }>(`/api/products?limit=100&offset=${offset}`);
    items.push(...r.items);
    if (r.items.length < 100) break;
  }
  const d = await db();
  const tx = d.transaction('catalog', 'readwrite');
  await tx.objectStore('catalog').clear();
  for (const p of items) {
    const activeProduct = { ...p, batches: p.batches?.filter((batch) => batch.archived_at === null) };
    for (const b of p.product_barcodes ?? []) await tx.objectStore('catalog').put({ barcode: b.barcode, product: activeProduct });
    await tx.objectStore('catalog').put({ barcode: `WN:${p.sku}`, product: activeProduct });
    for (const batch of activeProduct.batches ?? []) {
      await tx.objectStore('catalog').put({
        barcode: batch.barcode,
        product: { ...activeProduct, scanned_batch_id: batch.id },
      });
    }
  }
  await tx.done;
}

export async function lookupOffline(code: string): Promise<Product | null> {
  return (await (await db()).get('catalog', code))?.product ?? null;
}
export async function clearLocalData() {
  const d = await db();
  await Promise.all([d.clear('queue'), d.clear('catalog')]);
}
