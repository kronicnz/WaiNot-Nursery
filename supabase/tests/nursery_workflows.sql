-- Run against a local Supabase database with psql; all test data is rolled back.
begin;

do $$
declare
  u uuid := gen_random_uuid();
  category uuid;
  product uuid;
  batch uuid;
  location uuid;
  customer uuid;
  bad_order uuid;
  good_order uuid;
  task uuid;
  stocktake uuid;
  operation uuid := gen_random_uuid();
  n integer;
begin
  insert into auth.users(id, email) values (u, u::text || '@example.test');
  update public.profiles set role = 'owner', active = true where id = u;
  perform set_config('request.jwt.claim.sub', u::text, true);
  insert into public.categories(name) values ('Test ' || u) returning id into category;
  insert into public.products(sku, name, category_id) values ('TEST-' || u, 'Test plant', category) returning id into product;
  insert into public.batches(product_id, batch_code) values (product, 'Test batch') returning id into batch;
  insert into public.locations(name) values ('Test ' || u) returning id into location;
  insert into public.customers(name) values ('Test customer') returning id into customer;

  begin
    perform public.create_nursery_order(customer, null, jsonb_build_array(
      jsonb_build_object('product_id', product, 'batch_id', batch, 'location_id', null, 'quantity', 100000, 'unit_price', 100000)
    ));
    raise exception 'expected order line total to be rejected';
  exception when others then
    if sqlerrm not like '%invalid order line%' then raise; end if;
  end;
  if exists (select 1 from public.orders where customer_id = customer) then
    raise exception 'invalid order was not rolled back';
  end if;

  perform public.apply_stock_movement(product, batch, 10, 'receive', null, 'test-receive', null);
  perform public.transfer_stock(product, null, location, batch, 4, null, 'test-transfer');
  perform public.transfer_stock(product, null, location, batch, 4, null, 'test-transfer');
  if (select qty from public.stock_levels where product_id = product and batch_id = batch and location_id is null) <> 6
    or (select qty from public.stock_levels where product_id = product and batch_id = batch and location_id = location) <> 4 then
    raise exception 'transfer or retry produced incorrect stock';
  end if;

  bad_order := public.create_nursery_order(customer, null, jsonb_build_array(
    jsonb_build_object('product_id', product, 'batch_id', batch, 'location_id', null, 'quantity', 2, 'unit_price', 3.25),
    jsonb_build_object('product_id', product, 'batch_id', batch, 'location_id', location, 'quantity', 5, 'unit_price', 3.25)
  ));
  begin
    perform public.fulfill_nursery_order(bad_order);
    raise exception 'expected insufficient stock';
  exception when others then
    if sqlerrm not like '%insufficient stock%' then raise; end if;
  end;
  if (select status from public.orders where id = bad_order) <> 'open'
    or (select qty from public.stock_levels where product_id = product and batch_id = batch and location_id is null) <> 6 then
    raise exception 'failed order was not rolled back';
  end if;

  good_order := public.create_nursery_order(customer, 'Test', jsonb_build_array(
    jsonb_build_object('product_id', product, 'batch_id', batch, 'location_id', null, 'quantity', 2, 'unit_price', 3.25),
    jsonb_build_object('product_id', product, 'batch_id', batch, 'location_id', location, 'quantity', 3, 'unit_price', 3.25)
  ));
  perform public.fulfill_nursery_order(good_order);
  perform public.fulfill_nursery_order(good_order);
  if (select status from public.orders where id = good_order) <> 'fulfilled'
    or (select sum(qty) from public.stock_levels where product_id = product and batch_id = batch) <> 5
    or (select sum(line_total) from public.order_lines where order_id = good_order) <> 16.25 then
    raise exception 'fulfilment, retry or price snapshot incorrect';
  end if;
  select count(*) into n from public.stock_movements where note = 'Order ' || good_order;
  if n <> 2 then raise exception 'fulfilment should create exactly two movements'; end if;

  perform public.set_batch_stock_count(product, batch, 2, null, 'test-count-001');
  if (select sum(qty) from public.stock_levels where product_id = product and batch_id = batch) <> 2 then
    raise exception 'batch count did not reconcile across locations';
  end if;
  update public.locations set active = false where id = location;
  perform public.transfer_stock(product, location, null, batch, 1, null, 'test-inactive-transfer');
  if (select qty from public.stock_levels where product_id = product and batch_id = batch and location_id = location) <> 0 then
    raise exception 'stock should be movable out of an inactive location';
  end if;
  begin
    perform public.apply_stock_movement(product, batch, 1, 'receive', null, 'test-inactive-receive', location);
    raise exception 'expected inactive location to reject incoming stock';
  exception when others then
    if sqlerrm not like '%unknown location%' then raise; end if;
  end;
  insert into public.stocktakes(created_by) values (u) returning id into stocktake;
  insert into public.stocktake_lines(stocktake_id, product_id, batch_id, counted_qty)
    values (stocktake, product, batch, 1);
  perform public.finalize_stocktake(stocktake);
  if (select status from public.stocktakes where id = stocktake) <> 'finalized'
    or (select sum(qty) from public.stock_levels where product_id = product and batch_id = batch) <> 1 then
    raise exception 'stocktake did not reconcile the batch total';
  end if;
  insert into public.care_tasks(title, due_on, repeat_days, created_by)
    values ('Water', date '2026-01-01', 7, u) returning id into task;
  perform public.complete_care_task(task, operation);
  perform public.complete_care_task(task, operation);
  if (select due_on from public.care_tasks where id = task) <> date '2026-01-08'
    or (select count(*) from public.care_task_completions where task_id = task) <> 1 then
    raise exception 'recurring task completion or retry incorrect';
  end if;
  if has_table_privilege('anon', 'public.locations', 'SELECT')
    or has_table_privilege('anon', 'public.customers', 'SELECT')
    or has_table_privilege('authenticated', 'public.orders', 'INSERT')
    or has_table_privilege('authenticated', 'public.locations', 'TRUNCATE') then
    raise exception 'unexpected data access privilege';
  end if;
  perform set_config('role', 'authenticated', true);
  if not exists (select 1 from public.customers where id = customer) then
    raise exception 'active staff should be able to read customers';
  end if;
  perform set_config('role', 'none', true);
  update public.profiles set active = false where id = u;
  perform set_config('role', 'authenticated', true);
  if exists (select 1 from public.customers where id = customer) then
    raise exception 'inactive staff must not read customers';
  end if;
  begin
    perform public.fulfill_nursery_order(good_order);
    raise exception 'expected inactive staff to be rejected';
  exception when insufficient_privilege then
    null;
  end;
  perform set_config('role', 'none', true);
end $$;

rollback;
