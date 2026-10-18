alter table public.products
  alter column reorder_level set default 20;

update public.products
set
  price = case when sku = 'lancewood' then 5.00 else 3.75 end,
  reorder_level = 20,
  public_description = case
    when sku = 'FERN-1' and public_description = ''
      then 'Native fern variety; ask the nursery to confirm the species and growing details.'
    else public_description
  end;

create temporary table catalog_stock_setup on commit drop as
select
  p.id as product_id,
  p.sku,
  coalesce(sum(sl.qty), 0)::integer as previous_qty,
  (10 + floor(random() * 91))::integer as target_qty
from public.products p
left join public.stock_levels sl on sl.product_id = p.id
group by p.id, p.sku;

do $$
begin
  if exists (
    select 1
    from public.batches
    where archived_at is null
    group by product_id
    having count(*) > 1
  ) then
    raise exception 'Each product must have at most one active batch before applying the one-off inventory setup';
  end if;
end $$;

insert into public.batches (product_id, batch_code, notes)
select
  setup.product_id,
  'Initial 2026-27',
  'Initial batch created during the one-off catalog and inventory setup; plant age to be confirmed.'
from catalog_stock_setup setup
where not exists (
  select 1 from public.batches batch
  where batch.product_id = setup.product_id and batch.archived_at is null
);

alter table catalog_stock_setup add column batch_id uuid;

update catalog_stock_setup setup
set batch_id = batch.id
from public.batches batch
where batch.product_id = setup.product_id
  and batch.archived_at is null;

delete from public.stock_levels levels
using catalog_stock_setup setup
where levels.product_id = setup.product_id;

insert into public.stock_levels (product_id, batch_id, qty)
select product_id, batch_id, target_qty
from catalog_stock_setup;

insert into public.stock_movements (
  product_id, batch_id, delta, reason, note, user_id, client_op_id
)
select
  setup.product_id,
  setup.batch_id,
  setup.target_qty - setup.previous_qty,
  'stocktake',
  'One-off setup: randomized opening stock (10-100 units); replaces previous on-hand count.',
  owner.id,
  'catalog-random-opening-' || setup.product_id::text
from catalog_stock_setup setup
cross join lateral (
  select id
  from public.profiles
  where active and role = 'owner'
  order by created_at
  limit 1
) owner
where setup.target_qty <> setup.previous_qty
on conflict (user_id, client_op_id) do nothing;

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
  products.price
from public.products
join public.categories on categories.id = products.category_id
where products.active;

revoke all on public.products from anon;
grant select on public.public_catalog_plants to anon, authenticated;
