create or replace view public.public_catalog_plants
with (security_barrier = true) as
select
  products.sku as id,
  products.name,
  categories.name as category,
  products.public_description as description,
  coalesce(products.public_image_url, categories.image_url) as image,
  coalesce(nullif(products.public_image_alt, ''), categories.image_alt) as image_alt,
  categories.sort_order as category_sort_order,
  products.catalog_sort_order as sort_order,
  products.price,
  coalesce((
    select sum(stock_levels.qty)
    from public.stock_levels
    left join public.batches on batches.id = stock_levels.batch_id
    where stock_levels.product_id = products.id
      and (stock_levels.batch_id is null or batches.archived_at is null)
  ), 0) <= 11 as low_availability
from public.products
join public.categories on categories.id = products.category_id
where products.active;

revoke all on public.public_catalog_plants from anon, authenticated;
grant select on public.public_catalog_plants to anon, authenticated;
