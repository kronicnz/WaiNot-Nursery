alter table public.categories
  add column title text not null default '',
  add column description text not null default '',
  add column image_url text,
  add column image_alt text not null default '',
  add column sort_order integer not null default 0;

alter table public.products
  add column public_description text not null default '',
  add column public_image_url text,
  add column public_image_alt text not null default '',
  add column catalog_sort_order integer not null default 0;

insert into public.categories (name, title, description, image_url, image_alt, sort_order)
values
  ('Flaxes', 'NZ Native Flaxes', 'Hardy, architectural plants for shelter, gardens and restorative planting.', 'https://pictures.rs-cdn.com/CF-a11d57d6-1839-446b-9565-4c6c9a1c58ae/trim=0;0;95;0,fit=cover,gravity=auto,width=495,height=446,dpr=2,sharpen=0.17/c4844b340b75cc37957b903201d8b9f4.jpg', 'New Zealand native flax at WaiNot Native Nursery', 1),
  ('Trees', 'NZ Native Trees', 'Locally proven trees for riparian margins, shelter, revegetation and habitat.', 'https://pictures.rs-cdn.com/CF-a11d57d7-8278-4547-8dc8-216cce3aab0e/trim=0;0;410;0,fit=cover,gravity=auto,width=495,height=446,dpr=2,sharpen=0.47/74bf87100a285caae4bdbd745e3b81c9.jpg', 'Native trees for shelter and riparian planting', 2),
  ('Grasses & Tussocks', 'NZ Native Grasses & Tussocks', 'Ground-covering and clumping species for a variety of site conditions.', 'https://pictures.rs-cdn.com/CF-a11d57d8-f86e-42d7-abf1-97611a31e356/trim=0;0;95;0,fit=cover,gravity=auto,width=495,height=446,dpr=2,sharpen=0.17/08118792ef4c3ec7193437f348bc0bda.jpg', 'Native New Zealand grasses and tussocks', 3),
  ('Other Native Plants', 'Other NZ Native Plants', 'A mix of useful native shrubs, ground covers and smaller plants.', 'https://pictures.rs-cdn.com/CF-a11d57d9-f38e-4ece-af06-59b35d495d54/trim=0;394;0;8,fit=cover,gravity=auto,width=495,height=446,dpr=2,sharpen=0.70/f0ef3646bf5bb1b9e03520c18a509a29.jpg', 'New Zealand native plants grown at WaiNot Native Nursery', 4)
on conflict (name) do update set
  title = excluded.title,
  description = excluded.description,
  image_url = excluded.image_url,
  image_alt = excluded.image_alt,
  sort_order = excluded.sort_order;

with plant_seed (sku, name, category_name, description, image_path, image_alt, sort_order) as (
  values
    ('toe-toe', 'Toe Toe (Austroderia)', 'Flaxes', 'Frost-hardy and fast-growing. Adapts to a wide range of habitats and soil moisture, from sand dunes to mountain sites.', '9b2059c6-a477-4c03-9c79-00d0b9f161f2/9b2059c6-a68c-4b3a-9c45-b9258e4da814/w985h1280-toitoi.jpeg', 'Toe toe for riparian planting', 1),
    ('mountain-flax', 'Mountain Flax (Phormium cookianum / Wharariki)', 'Flaxes', 'Frost-hardy and evergreen, with wide, shiny-green, weeping leaves. Green and purple forms are listed.', '9b2059c7-2f70-4b9f-8785-2ee00a5d650a/9b2059c7-30c5-46cb-aea5-926b4e5cc308/w1816h4032-20231215_141556.jpg', 'Mountain flax for revegetation planting', 2),
    ('swamp-flax', 'NZ Swamp Flax (Phormium tenax / Harakeke)', 'Flaxes', 'Large, traditional green and purple flax. Attracts birds, and is well suited to erosion control, shelter and riparian planting.', '9b2059c7-ad99-459f-9fd0-fde4aa372745/9b2059c7-af59-4cb0-8366-ebded92a063d/w960h960-Phormium-tenax.jpg', 'Harakeke for wetland planting', 3),
    ('emerald-gem', 'Emerald Gem (Phormium cookianum / Wharariki)', 'Flaxes', 'A hardy, evergreen dwarf mountain flax, suited to smaller gardens and spaces.', 'a0293125-5faf-471d-8a57-b3fdab359001/a0293125-5fc5-4a00-a9c5-f743d39ace2c/w800h600-Phormium_Dwarf_1__IMG_1080x.jpg', 'Emerald Gem dwarf flax for smaller gardens', 4),
    ('ribbonwood', 'Ribbonwood (Plagianthus regius / Mānatu)', 'Trees', 'A hardy, fast-growing pioneer tree for revegetation, shelter and riparian sites.', '9b2059c8-4930-4fd0-a866-6a24e40db1e2/9b2059c8-4aac-4c9a-a098-47fdef204abb/w682h1024-ribbonwood.jpg', 'Ribbonwood for wetland and riparian planting', 5),
    ('lacebark', 'Lacebark (Hoheria angustifolia / Houhere)', 'Trees', 'An evergreen, fast-growing and wind-hardy native. Young plants are frost tender.', '9b2059c8-b123-4b9b-aee3-02c3605b8c6b/9db04e72-f005-4d3e-895f-0636c4889a50/w500h500-Hoheria%20angustifolia%203-500x500.jpg', 'Lacebark for shelter and riparian planting', 6),
    ('black-matipo', 'Black Matipo (Pittosporum tenuifolium / Kōhūhū)', 'Trees', 'A hardy, evergreen compact tree or shrub that suits a range of sites and can be used for hedging.', '9b2059c9-0bc8-4773-aaa5-2a88c86708ad/9b2059c9-0cee-464c-86c5-fee16e4a9692/w1816h2691-20231215_141157.jpg', 'Black matipo for hedging and riparian planting', 7),
    ('lemonwood', 'Lemonwood (Pittosporum eugenioides / Tarata)', 'Trees', 'A hardy, versatile native with larger leaves than black matipo and a distinctive lemon scent when crushed.', '9b2059c9-9668-4cdc-99eb-846f88052da6/9b2059c9-97dd-472e-96d4-19403f05a0f8/w1816h4032-20231230_152816.jpg', 'Lemonwood native tree', 8),
    ('whiteywood', 'Whiteywood (Melicytus ramiflorus / Māhoe)', 'Trees', 'A small evergreen tree with spring flowers followed by purple-black berries. Young plants are frost tender.', '9b2059ca-ec68-4683-9d96-03a3548b6ce2/9b2059ca-ed7e-4445-9425-814bb84cd915/w1816h4032-20231215_141020.jpg', 'Whiteywood native tree', 9),
    ('cabbage-tree', 'Cabbage Tree (Cordyline australis / Tī Kōuka)', 'Trees', 'An iconic, hardy and fast-growing New Zealand tree. The nursery recommends planting in groups of three or more.', '9b2059cb-6115-44b1-ad50-233ad039dbc1/9b2059cb-6248-4a9d-bfe9-2134554bf3fc/w1816h4032-20231222_190105.jpg', 'Cabbage tree for riparian planting', 10),
    ('manuka', 'Mānuka (Leptospermum scoparium)', 'Trees', 'A fast-growing evergreen tea tree with white flowers and scented leaves.', '9b2059cb-e050-4328-8e6d-503bf64dd7b4/9b2059cb-e17c-4160-9150-f9538174184b/w1816h4032-20231222_190241%2520%25281%2529.jpg', 'Mānuka tree', 11),
    ('kanuka', 'Kānuka (Kunzea robusta / Rawirinui)', 'Trees', 'A very hardy native tree with white flowers. Slower growing than mānuka and tolerant of dry, frosty and poor-soil sites.', '9b2059cc-5a8e-4b86-aa88-46041020135f/9b2059cc-5b9f-4ffe-9d1b-3a33a8555b3c/w1816h4032-20231215_141612.jpg', 'Kānuka tree for riparian planting', 12),
    ('kowhai', 'Kōwhai (Sophora microphylla)', 'Trees', 'A hardy, medium-sized, semi-deciduous tree. Suited to moist soils but not waterlogged sites.', '9b2059cd-3b9b-4804-a3ea-e1fb002203d6/9b2059cd-3cc3-4997-88bd-54c897b667c9/w1816h4032-20231215_141448.jpg', 'Kōwhai native tree', 13),
    ('kahikatea', 'Kahikatea (Dacrycarpus dacrydioides)', 'Trees', 'New Zealand’s tallest native tree. Slow-growing, with fruit that attracts birds; fruits from February to April.', '9b2059cd-c751-415c-8dc4-4fe4b74a376b/9b2059cd-c8e4-495d-a58e-639eae9ca085/w1816h4032-20231215_141500.jpg', 'Kahikatea for wetland and riparian planting', 14),
    ('ake-ake', 'Ake Ake (Dodonaea viscosa)', 'Trees', 'A fast-growing evergreen for full sun or partial shade, with flowers in summer. Green and purple forms are listed.', '9b2059ce-51ee-4cdd-b4e1-c8439341947e/9b2059ce-5375-49f2-9bde-6d5efc81eead/w1816h4032-20231215_141145.jpg', 'Ake ake for dryland and riparian planting', 15),
    ('totara', 'Tōtara (Podocarpus totara)', 'Trees', 'An evergreen native that grows across a wide range of sites. Young plants are frost tender.', '9b2059ce-e394-48b4-8eb2-e32558124ab4/9b2059ce-e521-4f46-bc9c-3cc27f8ff5dd/w1816h4032-20231215_141514.jpg', 'Tōtara native tree', 16),
    ('wineberry', 'Wineberry (Aristotelia serrata / Makomako)', 'Trees', 'A fast-growing deciduous tree with rose-coloured spring flowers. Young plants are frost tender.', '9db05c52-9c14-420d-997d-d719b99cf8b7/9db05cad-d72c-485a-a682-bc3bac1dea7b/w240h240-Wineberry.jpg', 'Wineberry native tree', 17),
    ('five-finger', 'Five Finger (Pseudopanax arboreus / Whauwhaupaku)', 'Trees', 'A five-fingered-leaf tree with purple-black fruit from February to March that attracts birds and bees. Prefers moist, well-drained soil.', '9db063ba-02c3-471d-90dd-947b775f8250/a0292da1-e8af-4cd9-bb0b-10f04f8bad7d/w246h205-Five%20finger.jpg', 'Five finger native tree', 18),
    ('pittosporum-colensoi', 'Pittosporum colensoi (Rautāwhiri)', 'Trees', 'A hardy evergreen with flatter, shinier leaves than P. tenuifolium and a more open growth habit.', '9dd4c62e-95ae-4b76-bbf4-2b7625a54da1/9dd4c6dc-81a4-441c-8c60-847d72d22e83/w280h210-pittosporum-colensoi-flower.jpg', 'Pittosporum colensoi native tree', 19),
    ('lancewood', 'Lancewood (Pseudopanax crassifolius / Horoeka)', 'Trees', 'A striking, slow-growing specimen tree suited to smaller spaces; hardy when mature.', 'a02935fc-6524-4171-9e89-b19debe8784b/a02935fc-6531-4604-9f40-6e7ddf63dcf6/w300h168-Lancewood.jpg', 'Lancewood native tree', 20),
    ('carex-secta', 'Carex secta (Mākura Sedge)', 'Grasses & Tussocks', 'A hardy, fast-growing evergreen sedge that can be trimmed to shape and size.', '9b2059d0-0a3d-4002-8848-90c3d660b240/9b2059d0-0bdb-44f0-ac3e-781800ff4545/w1816h4032-20231215_141429.jpg', 'Carex secta for wetland and riparian planting', 21),
    ('carex-virgata', 'Carex virgata (Pūkio Sedge)', 'Grasses & Tussocks', 'A hardy evergreen sedge that tolerates dry conditions, but also suits damp sites.', '9b2059d0-85c5-48fa-8d84-d96a50c1fd22/9b2059d0-88c9-4450-9947-a4ce847e49ae/w960h960-Carex-secta.jpg', 'Carex virgata native sedge', 22),
    ('carex-testacea', 'Carex testacea (Orange Sedge / Pūrēi)', 'Grasses & Tussocks', 'An attractive green-to-orange sedge. Plant in full sun for the best foliage colour.', '9b2059d0-fbea-469b-86d2-8c0c6499f60c/9b2059d0-fd4c-44fa-a6f7-b40d2a4ed182/w500h402-carextestacaea.jpg', 'Carex testacea orange sedge', 23),
    ('poa-cita', 'Poa cita (Silver Tussock / Wī kura)', 'Grasses & Tussocks', 'A small, fast-growing green tussock that can be trimmed and tolerates poor, dry soils.', '9b2059d1-a4c5-46bf-8b20-1625b614aaed/9b2059d1-ac05-41d2-ab98-f44631e24950/w1816h4032-20231220_070538.jpg', 'Poa cita silver tussock', 24),
    ('red-rubra-tussock', 'Red Rubra Tussock (Chionochloa rubra)', 'Grasses & Tussocks', 'A hardy tussock with red-tinged foliage that stands out in exposed, windy sites and tolerates infertile soils.', 'a0293f9f-5fb2-4992-8482-cd606e5c57a2/a0293f9f-5fc5-4a21-a025-28049d3d5221/w259h194-Red%20rubra.jpg', 'Red rubra tussock', 25),
    ('hebe-stricta', 'Hebe stricta (Koromiko)', 'Other Native Plants', 'A fast-growing, spreading shrub with long white summer flower spikes; suited to sunny wetland edges.', '9b2059d2-6c5c-4d01-8340-277a84855dda/9b2059d2-737d-4841-a474-90459c9b7c76/w480h360-Hebe_salicifolia_2__IMG_480x.jpg', 'Hebe stricta koromiko', 26),
    ('coprosma-robusta', 'Coprosma robusta (Karamū)', 'Other Native Plants', 'A hardy, compact small tree or shrub that can be trimmed; young plants may be frost sensitive.', '9b2059d3-3617-4637-86cf-264695327147/9b2059d3-378c-406c-b7db-57d55edca334/w4000h3000-coprosma.jpg', 'Coprosma robusta karamū', 27),
    ('coprosma-propinqua', 'Coprosma propinqua (Mingimingi)', 'Other Native Plants', 'A hardy, substantial shrub that tolerates wet soil. Its interlaced foliage bears fruit that changes from white to dark blue.', '9b2059d3-c0ad-45c3-a457-0c2e01d93ef8/9b2059d3-c1b1-4343-8c66-1c40f815ff46/w960h720-propinqua.jpg', 'Coprosma propinqua mingimingi', 28),
    ('dianella-nigra', 'Dianella nigra (Tūrutu)', 'Other Native Plants', 'A small flax-like plant with bright blue summer berries that attract native birds; suits dry, damp and wet sites.', '9b38265e-c4e9-43ea-8019-0f89c0ea2ff9/9b38265e-c4fc-48d9-975a-58b56bf5852f/w700h466-Native_blueberry.jpg', 'Dianella nigra tūrutu with native blue berries', 29),
    ('uncinia-uncinata', 'Uncinia uncinata (Kamu)', 'Other Native Plants', 'A drought- and frost-resistant native sedge that prefers full sun and tolerates wind.', 'a0293426-6af0-433f-a368-6403f68f9f47/a0293426-6b04-46b1-8a41-aeb282d0738f/w225h225-download.jpg', 'Uncinia uncinata kamu', 30),
    ('acaena-inermis-purpurea', 'Acaena inermis purpurea (Piripiri)', 'Other Native Plants', 'A lush, plum-purple, fern-like ground cover for sunny, well-drained positions; tolerates partial shade.', 'a1ca3a7b-4350-46c0-a3bf-df01be264393/a1ca3da4-9423-4f5c-afcd-11e307b9f460/w426h335-Acaena-inermis-Purpurea.png', 'Acaena inermis purpurea ground cover', 31)
)
insert into public.products (
  sku, name, category_id, public_description, public_image_url, public_image_alt, catalog_sort_order
)
select
  seed.sku,
  seed.name,
  category.id,
  seed.description,
  'https://dzpdbgwih7u1r.cloudfront.net/9aa59b48-85ec-4aad-8748-d7131ea253b0/' || seed.image_path,
  seed.image_alt,
  seed.sort_order
from plant_seed seed
join public.categories category on category.name = seed.category_name
on conflict (sku) do update set
  name = excluded.name,
  category_id = excluded.category_id,
  public_description = excluded.public_description,
  public_image_url = excluded.public_image_url,
  public_image_alt = excluded.public_image_alt,
  catalog_sort_order = excluded.catalog_sort_order;

create or replace view public.public_catalog_categories
with (security_barrier = true) as
select id, name, title, description, image_url, image_alt, sort_order
from public.categories;

create or replace view public.public_catalog_plants
with (security_barrier = true) as
select
  products.sku as id,
  products.name,
  categories.name as category,
  products.public_description as description,
  products.public_image_url as image,
  products.public_image_alt as image_alt,
  categories.sort_order as category_sort_order,
  products.catalog_sort_order as sort_order
from public.products
join public.categories on categories.id = products.category_id
where products.active and products.public_image_url is not null;

revoke all on public.categories, public.products from anon;
grant select on public.public_catalog_categories, public.public_catalog_plants to anon, authenticated;
