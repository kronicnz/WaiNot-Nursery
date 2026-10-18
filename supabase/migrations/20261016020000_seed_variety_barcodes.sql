insert into public.product_barcodes (barcode, type, product_id)
select 'WN:' || products.sku, 'QR', products.id
from public.products
where products.active and products.public_image_url is not null
on conflict (barcode) do nothing;
