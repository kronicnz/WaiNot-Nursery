import { beforeEach, describe, expect, it, vi } from 'vitest';

const { results, from } = vi.hoisted(() => ({
  results: new Map<string, { data: unknown[] | null; error: { message: string } | null }>(),
  from: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from }),
}));

import { getPublicPlantCatalog } from './publicCatalog';

beforeEach(() => {
  results.clear();
  from.mockReset();
  from.mockImplementation((table: string) => {
    const query = {
      select: () => query,
      order: () => query,
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(results.get(table)).then(resolve, reject),
    };
    return query;
  });
  results.set('public_catalog_categories', { data: [], error: null });
});

describe('getPublicPlantCatalog', () => {
  it('joins all standard size prices to legacy catalogue plants', async () => {
    results.set('public_catalog_plants', {
      data: [
        { id: 'toe-toe', price: 3.75, price_label: '60mm Ellebag' },
        { id: 'legacy', price: 4, price_label: null },
        { id: 'unpriced', price: null },
      ],
      error: null,
    });
    const row = { sku: 'toe-toe', min_qty: 1, discount_pct: 0 };
    results.set('public_catalog_price_list', {
      data: [
        { ...row, pot_size: '40mm Ellebag', unit_price: 0 },
        { ...row, pot_size: '40mm Ellebag', unit_price: 0 },
        { ...row, pot_size: '60mm Ellebag', unit_price: '3.75' },
        { ...row, pot_size: '60mm Ellebag', unit_price: 3, min_qty: 10, discount_pct: 20 },
      ],
      error: null,
    });

    const { plants } = await getPublicPlantCatalog();
    expect(plants[0].prices).toEqual([
      { pot_size: '40mm Ellebag', price: 0 },
      { pot_size: '60mm Ellebag', price: 3.75 },
    ]);
    expect(plants[1].prices).toEqual([{ pot_size: null, price: 4 }]);
    expect(plants[2].prices).toEqual([]);
  });

  it('uses and sorts prices already present in an upgraded catalogue', async () => {
    results.set('public_catalog_plants', {
      data: [{ id: 'toe-toe', prices: [
        { pot_size: '60mm', price: '3.75', sort_order: 2 },
        { pot_size: '40mm', price: 1.75, sort_order: 1 },
      ] }],
      error: null,
    });

    const { plants } = await getPublicPlantCatalog();
    expect(plants[0].prices.map(({ pot_size, price }) => ({ pot_size, price }))).toEqual([
      { pot_size: '40mm', price: 1.75 },
      { pot_size: '60mm', price: 3.75 },
    ]);
    expect(from).not.toHaveBeenCalledWith('public_catalog_price_list');
  });

  it('reports price-list errors rather than hiding prices', async () => {
    results.set('public_catalog_plants', { data: [{ id: 'toe-toe', price: 3.75 }], error: null });
    results.set('public_catalog_price_list', { data: null, error: { message: 'unavailable' } });

    await expect(getPublicPlantCatalog()).rejects.toThrow('Unable to load price list: unavailable');
  });
});
