alter table public.batches add column barcode text;

update public.batches
set barcode = 'WN:BATCH:' || id::text
where barcode is null;

alter table public.batches
  alter column barcode set not null,
  add constraint batches_barcode_key unique (barcode),
  add constraint batches_barcode_length check (length(barcode) between 1 and 128);

create function public.assign_batch_barcode() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.barcode is null then
    new.barcode := 'WN:BATCH:' || new.id::text;
  end if;
  return new;
end $$;

create trigger batches_assign_barcode
before insert on public.batches
for each row execute function public.assign_batch_barcode();

create function public.prevent_cross_table_barcode_collision() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'batches' then
    if exists (select 1 from public.product_barcodes where barcode = new.barcode) then
      raise exception 'barcode is already assigned to a product';
    end if;
  elsif exists (select 1 from public.batches where barcode = new.barcode) then
    raise exception 'barcode is already assigned to a batch';
  end if;
  return new;
end $$;

create trigger batches_barcode_unique
before insert or update of barcode on public.batches
for each row execute function public.prevent_cross_table_barcode_collision();

create trigger product_barcodes_batch_unique
before insert or update of barcode on public.product_barcodes
for each row execute function public.prevent_cross_table_barcode_collision();
