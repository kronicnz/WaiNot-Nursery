export type PlantCategory = 'Flaxes' | 'Trees' | 'Grasses & Tussocks' | 'Other Native Plants';

export interface PlantItem {
  id: string;
  name: string;
  category: PlantCategory;
  description: string;
  image: string;
  imageAlt: string;
}

export interface PlantCategoryInfo {
  name: PlantCategory;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}

export interface TestimonialItem {
  id: string;
  author: string;
  text: string;
}

const plantPhoto = (path: string) => `https://dzpdbgwih7u1r.cloudfront.net/9aa59b48-85ec-4aad-8748-d7131ea253b0/${path}`;

export const nurseryStoryPhotos = [
  {
    id: 'people',
    src: 'https://dzpdbgwih7u1r.cloudfront.net/9aa59b48-85ec-4aad-8748-d7131ea253b0/a03773be-34c2-4aa4-87fb-1a239aa97ff3/a03773be-34d8-4664-bb99-998da8ecda29/w1200h799-SYDNEY-7343.jpg',
    alt: 'Steve and Steph at WaiNot Native Nursery',
    caption: 'Locally owned and operated',
    width: 1200,
    height: 799,
  },
  {
    id: 'machine',
    src: 'https://dzpdbgwih7u1r.cloudfront.net/9aa59b48-85ec-4aad-8748-d7131ea253b0/a11ed600-c76d-4726-8ffb-616c08c7db50/a11ed600-c784-455b-a3b6-53a47c9e2d4a/w900h1200-20250823_145509.jpg',
    alt: 'Ellepot machine used to make Ellebag sleeves at WaiNot Native Nursery',
    caption: 'Ellebags made on site',
    width: 900,
    height: 1200,
  },
  {
    id: 'nursery',
    src: 'https://dzpdbgwih7u1r.cloudfront.net/9aa59b48-85ec-4aad-8748-d7131ea253b0/a2b9aa6c-8c11-4d9c-ba85-51212a8c9552/a2b9aa6c-8c24-4b6e-84a4-2d8621758ec6/w1200h900-20260705_140930.jpg',
    alt: 'Native plants growing at WaiNot Native Nursery',
    caption: 'Grown in Waikite Valley',
    width: 1200,
    height: 900,
  },
];

export const plantCategories: PlantCategoryInfo[] = [
  {
    name: 'Flaxes',
    title: 'NZ Native Flaxes',
    description: 'Hardy, architectural plants for shelter, gardens and restorative planting.',
    image: 'https://pictures.rs-cdn.com/CF-a11d57d6-1839-446b-9565-4c6c9a1c58ae/trim=0;0;95;0,fit=cover,gravity=auto,width=495,height=446,dpr=2,sharpen=0.17/c4844b340b75cc37957b903201d8b9f4.jpg',
    imageAlt: 'New Zealand native flax at WaiNot Native Nursery',
  },
  {
    name: 'Trees',
    title: 'NZ Native Trees',
    description: 'Locally proven trees for riparian margins, shelter, revegetation and habitat.',
    image: 'https://pictures.rs-cdn.com/CF-a11d57d7-8278-4547-8dc8-216cce3aab0e/trim=0;0;410;0,fit=cover,gravity=auto,width=495,height=446,dpr=2,sharpen=0.47/74bf87100a285caae4bdbd745e3b81c9.jpg',
    imageAlt: 'Native trees for shelter and riparian planting',
  },
  {
    name: 'Grasses & Tussocks',
    title: 'NZ Native Grasses & Tussocks',
    description: 'Ground-covering and clumping species for a variety of site conditions.',
    image: 'https://pictures.rs-cdn.com/CF-a11d57d8-f86e-42d7-abf1-97611a31e356/trim=0;0;95;0,fit=cover,gravity=auto,width=495,height=446,dpr=2,sharpen=0.17/08118792ef4c3ec7193437f348bc0bda.jpg',
    imageAlt: 'Native New Zealand grasses and tussocks',
  },
  {
    name: 'Other Native Plants',
    title: 'Other NZ Native Plants',
    description: 'A mix of useful native shrubs, ground covers and smaller plants.',
    image: 'https://pictures.rs-cdn.com/CF-a11d57d9-f38e-4ece-af06-59b35d495d54/trim=0;394;0;8,fit=cover,gravity=auto,width=495,height=446,dpr=2,sharpen=0.70/f0ef3646bf5bb1b9e03520c18a509a29.jpg',
    imageAlt: 'New Zealand native plants grown at WaiNot Native Nursery',
  },
];

export const plantCatalog: PlantItem[] = [
  {
    id: 'toe-toe',
    name: 'Toe Toe (Austroderia)',
    category: 'Flaxes',
    description: 'Frost-hardy and fast-growing. Adapts to a wide range of habitats and soil moisture, from sand dunes to mountain sites.',
    image: plantPhoto('9b2059c6-a477-4c03-9c79-00d0b9f161f2/9b2059c6-a68c-4b3a-9c45-b9258e4da814/w985h1280-toitoi.jpeg'),
    imageAlt: 'Toe toe for riparian planting',
  },
  {
    id: 'mountain-flax',
    name: 'Mountain Flax (Phormium cookianum / Wharariki)',
    category: 'Flaxes',
    description: 'Frost-hardy and evergreen, with wide, shiny-green, weeping leaves. Green and purple forms are listed.',
    image: plantPhoto('9b2059c7-2f70-4b9f-8785-2ee00a5d650a/9b2059c7-30c5-46cb-aea5-926b4e5cc308/w1816h4032-20231215_141556.jpg'),
    imageAlt: 'Mountain flax for revegetation planting',
  },
  {
    id: 'swamp-flax',
    name: 'NZ Swamp Flax (Phormium tenax / Harakeke)',
    category: 'Flaxes',
    description: 'Large, traditional green and purple flax. Attracts birds, and is well suited to erosion control, shelter and riparian planting.',
    image: plantPhoto('9b2059c7-ad99-459f-9fd0-fde4aa372745/9b2059c7-af59-4cb0-8366-ebded92a063d/w960h960-Phormium-tenax.jpg'),
    imageAlt: 'Harakeke for wetland planting',
  },
  {
    id: 'emerald-gem',
    name: 'Emerald Gem (Phormium cookianum / Wharariki)',
    category: 'Flaxes',
    description: 'A hardy, evergreen dwarf mountain flax, suited to smaller gardens and spaces.',
    image: plantPhoto('a0293125-5faf-471d-8a57-b3fdab359001/a0293125-5fc5-4a00-a9c5-f743d39ace2c/w800h600-Phormium_Dwarf_1__IMG_1080x.jpg'),
    imageAlt: 'Emerald Gem dwarf flax for smaller gardens',
  },
  {
    id: 'ribbonwood',
    name: 'Ribbonwood (Plagianthus regius / Mānatu)',
    category: 'Trees',
    description: 'A hardy, fast-growing pioneer tree for revegetation, shelter and riparian sites.',
    image: plantPhoto('9b2059c8-4930-4fd0-a866-6a24e40db1e2/9b2059c8-4aac-4c9a-a098-47fdef204abb/w682h1024-ribbonwood.jpg'),
    imageAlt: 'Ribbonwood for wetland and riparian planting',
  },
  {
    id: 'lacebark',
    name: 'Lacebark (Hoheria angustifolia / Houhere)',
    category: 'Trees',
    description: 'An evergreen, fast-growing and wind-hardy native. Young plants are frost tender.',
    image: plantPhoto('9b2059c8-b123-4b9b-aee3-02c3605b8c6b/9db04e72-f005-4d3e-895f-0636c4889a50/w500h500-Hoheria%20angustifolia%203-500x500.jpg'),
    imageAlt: 'Lacebark for shelter and riparian planting',
  },
  {
    id: 'black-matipo',
    name: 'Black Matipo (Pittosporum tenuifolium / Kōhūhū)',
    category: 'Trees',
    description: 'A hardy, evergreen compact tree or shrub that suits a range of sites and can be used for hedging.',
    image: plantPhoto('9b2059c9-0bc8-4773-aaa5-2a88c86708ad/9b2059c9-0cee-464c-86c5-fee16e4a9692/w1816h2691-20231215_141157.jpg'),
    imageAlt: 'Black matipo for hedging and riparian planting',
  },
  {
    id: 'lemonwood',
    name: 'Lemonwood (Pittosporum eugenioides / Tarata)',
    category: 'Trees',
    description: 'A hardy, versatile native with larger leaves than black matipo and a distinctive lemon scent when crushed.',
    image: plantPhoto('9b2059c9-9668-4cdc-99eb-846f88052da6/9b2059c9-97dd-472e-96d4-19403f05a0f8/w1816h4032-20231230_152816.jpg'),
    imageAlt: 'Lemonwood native tree',
  },
  {
    id: 'whiteywood',
    name: 'Whiteywood (Melicytus ramiflorus / Māhoe)',
    category: 'Trees',
    description: 'A small evergreen tree with spring flowers followed by purple-black berries. Young plants are frost tender.',
    image: plantPhoto('9b2059ca-ec68-4683-9d96-03a3548b6ce2/9b2059ca-ed7e-4445-9425-814bb84cd915/w1816h4032-20231215_141020.jpg'),
    imageAlt: 'Whiteywood native tree',
  },
  {
    id: 'cabbage-tree',
    name: 'Cabbage Tree (Cordyline australis / Tī Kōuka)',
    category: 'Trees',
    description: 'An iconic, hardy and fast-growing New Zealand tree. The nursery recommends planting in groups of three or more.',
    image: plantPhoto('9b2059cb-6115-44b1-ad50-233ad039dbc1/9b2059cb-6248-4a9d-bfe9-2134554bf3fc/w1816h4032-20231222_190105.jpg'),
    imageAlt: 'Cabbage tree for riparian planting',
  },
  {
    id: 'manuka',
    name: 'Mānuka (Leptospermum scoparium)',
    category: 'Trees',
    description: 'A fast-growing evergreen tea tree with white flowers and scented leaves.',
    image: plantPhoto('9b2059cb-e050-4328-8e6d-503bf64dd7b4/9b2059cb-e17c-4160-9150-f9538174184b/w1816h4032-20231222_190241%2520%25281%2529.jpg'),
    imageAlt: 'Mānuka tree',
  },
  {
    id: 'kanuka',
    name: 'Kānuka (Kunzea robusta / Rawirinui)',
    category: 'Trees',
    description: 'A very hardy native tree with white flowers. Slower growing than mānuka and tolerant of dry, frosty and poor-soil sites.',
    image: plantPhoto('9b2059cc-5a8e-4b86-aa88-46041020135f/9b2059cc-5b9f-4ffe-9d1b-3a33a8555b3c/w1816h4032-20231215_141612.jpg'),
    imageAlt: 'Kānuka tree for riparian planting',
  },
  {
    id: 'kowhai',
    name: 'Kōwhai (Sophora microphylla)',
    category: 'Trees',
    description: 'A hardy, medium-sized, semi-deciduous tree. Suited to moist soils but not waterlogged sites.',
    image: plantPhoto('9b2059cd-3b9b-4804-a3ea-e1fb002203d6/9b2059cd-3cc3-4997-88bd-54c897b667c9/w1816h4032-20231215_141448.jpg'),
    imageAlt: 'Kōwhai native tree',
  },
  {
    id: 'kahikatea',
    name: 'Kahikatea (Dacrycarpus dacrydioides)',
    category: 'Trees',
    description: 'New Zealand’s tallest native tree. Slow-growing, with fruit that attracts birds; fruits from February to April.',
    image: plantPhoto('9b2059cd-c751-415c-8dc4-4fe4b74a376b/9b2059cd-c8e4-495d-a58e-639eae9ca085/w1816h4032-20231215_141500.jpg'),
    imageAlt: 'Kahikatea for wetland and riparian planting',
  },
  {
    id: 'ake-ake',
    name: 'Ake Ake (Dodonaea viscosa)',
    category: 'Trees',
    description: 'A fast-growing evergreen for full sun or partial shade, with flowers in summer. Green and purple forms are listed.',
    image: plantPhoto('9b2059ce-51ee-4cdd-b4e1-c8439341947e/9b2059ce-5375-49f2-9bde-6d5efc81eead/w1816h4032-20231215_141145.jpg'),
    imageAlt: 'Ake ake for dryland and riparian planting',
  },
  {
    id: 'totara',
    name: 'Tōtara (Podocarpus totara)',
    category: 'Trees',
    description: 'An evergreen native that grows across a wide range of sites. Young plants are frost tender.',
    image: plantPhoto('9b2059ce-e394-48b4-8eb2-e32558124ab4/9b2059ce-e521-4f46-bc9c-3cc27f8ff5dd/w1816h4032-20231215_141514.jpg'),
    imageAlt: 'Tōtara native tree',
  },
  {
    id: 'wineberry',
    name: 'Wineberry (Aristotelia serrata / Makomako)',
    category: 'Trees',
    description: 'A fast-growing deciduous tree with rose-coloured spring flowers. Young plants are frost tender.',
    image: plantPhoto('9db05c52-9c14-420d-997d-d719b99cf8b7/9db05cad-d72c-485a-a682-bc3bac1dea7b/w240h240-Wineberry.jpg'),
    imageAlt: 'Wineberry native tree',
  },
  {
    id: 'five-finger',
    name: 'Five Finger (Pseudopanax arboreus / Whauwhaupaku)',
    category: 'Trees',
    description: 'A five-fingered-leaf tree with purple-black fruit from February to March that attracts birds and bees. Prefers moist, well-drained soil.',
    image: plantPhoto('9db063ba-02c3-471d-90dd-947b775f8250/a0292da1-e8af-4cd9-bb0b-10f04f8bad7d/w246h205-Five%20finger.jpg'),
    imageAlt: 'Five finger native tree',
  },
  {
    id: 'pittosporum-colensoi',
    name: 'Pittosporum colensoi (Rautāwhiri)',
    category: 'Trees',
    description: 'A hardy evergreen with flatter, shinier leaves than P. tenuifolium and a more open growth habit.',
    image: plantPhoto('9dd4c62e-95ae-4b76-bbf4-2b7625a54da1/9dd4c6dc-81a4-441c-8c60-847d72d22e83/w280h210-pittosporum-colensoi-flower.jpg'),
    imageAlt: 'Pittosporum colensoi native tree',
  },
  {
    id: 'lancewood',
    name: 'Lancewood (Pseudopanax crassifolius / Horoeka)',
    category: 'Trees',
    description: 'A striking, slow-growing specimen tree suited to smaller spaces; hardy when mature.',
    image: plantPhoto('a02935fc-6524-4171-9e89-b19debe8784b/a02935fc-6531-4604-9f40-6e7ddf63dcf6/w300h168-Lancewood.jpg'),
    imageAlt: 'Lancewood native tree',
  },
  {
    id: 'carex-secta',
    name: 'Carex secta (Mākura Sedge)',
    category: 'Grasses & Tussocks',
    description: 'A hardy, fast-growing evergreen sedge that can be trimmed to shape and size.',
    image: plantPhoto('9b2059d0-0a3d-4002-8848-90c3d660b240/9b2059d0-0bdb-44f0-ac3e-781800ff4545/w1816h4032-20231215_141429.jpg'),
    imageAlt: 'Carex secta for wetland and riparian planting',
  },
  {
    id: 'carex-virgata',
    name: 'Carex virgata (Pūkio Sedge)',
    category: 'Grasses & Tussocks',
    description: 'A hardy evergreen sedge that tolerates dry conditions, but also suits damp sites.',
    image: plantPhoto('9b2059d0-85c5-48fa-8d84-d96a50c1fd22/9b2059d0-88c9-4450-9947-a4ce847e49ae/w960h960-Carex-secta.jpg'),
    imageAlt: 'Carex virgata native sedge',
  },
  {
    id: 'carex-testacea',
    name: 'Carex testacea (Orange Sedge / Pūrēi)',
    category: 'Grasses & Tussocks',
    description: 'An attractive green-to-orange sedge. Plant in full sun for the best foliage colour.',
    image: plantPhoto('9b2059d0-fbea-469b-86d2-8c0c6499f60c/9b2059d0-fd4c-44fa-a6f7-b40d2a4ed182/w500h402-carextestacaea.jpg'),
    imageAlt: 'Carex testacea orange sedge',
  },
  {
    id: 'poa-cita',
    name: 'Poa cita (Silver Tussock / Wī kura)',
    category: 'Grasses & Tussocks',
    description: 'A small, fast-growing green tussock that can be trimmed and tolerates poor, dry soils.',
    image: plantPhoto('9b2059d1-a4c5-46bf-8b20-1625b614aaed/9b2059d1-ac05-41d2-ab98-f44631e24950/w1816h4032-20231220_070538.jpg'),
    imageAlt: 'Poa cita silver tussock',
  },
  {
    id: 'red-rubra-tussock',
    name: 'Red Rubra Tussock (Chionochloa rubra)',
    category: 'Grasses & Tussocks',
    description: 'A hardy tussock with red-tinged foliage that stands out in exposed, windy sites and tolerates infertile soils.',
    image: plantPhoto('a0293f9f-5fb2-4992-8482-cd606e5c57a2/a0293f9f-5fc5-4a21-a025-28049d3d5221/w259h194-Red%20rubra.jpg'),
    imageAlt: 'Red rubra tussock',
  },
  {
    id: 'hebe-stricta',
    name: 'Hebe stricta (Koromiko)',
    category: 'Other Native Plants',
    description: 'A fast-growing, spreading shrub with long white summer flower spikes; suited to sunny wetland edges.',
    image: plantPhoto('9b2059d2-6c5c-4d01-8340-277a84855dda/9b2059d2-737d-4841-a474-90459c9b7c76/w480h360-Hebe_salicifolia_2__IMG_480x.jpg'),
    imageAlt: 'Hebe stricta koromiko',
  },
  {
    id: 'coprosma-robusta',
    name: 'Coprosma robusta (Karamū)',
    category: 'Other Native Plants',
    description: 'A hardy, compact small tree or shrub that can be trimmed; young plants may be frost sensitive.',
    image: plantPhoto('9b2059d3-3617-4637-86cf-264695327147/9b2059d3-378c-406c-b7db-57d55edca334/w4000h3000-coprosma.jpg'),
    imageAlt: 'Coprosma robusta karamū',
  },
  {
    id: 'coprosma-propinqua',
    name: 'Coprosma propinqua (Mingimingi)',
    category: 'Other Native Plants',
    description: 'A hardy, substantial shrub that tolerates wet soil. Its interlaced foliage bears fruit that changes from white to dark blue.',
    image: plantPhoto('9b2059d3-c0ad-45c3-a457-0c2e01d93ef8/9b2059d3-c1b1-4343-8c66-1c40f815ff46/w960h720-propinqua.jpg'),
    imageAlt: 'Coprosma propinqua mingimingi',
  },
  {
    id: 'dianella-nigra',
    name: 'Dianella nigra (Tūrutu)',
    category: 'Other Native Plants',
    description: 'A small flax-like plant with bright blue summer berries that attract native birds; suits dry, damp and wet sites.',
    image: plantPhoto('9b38265e-c4e9-43ea-8019-0f89c0ea2ff9/9b38265e-c4fc-48d9-975a-58b56bf5852f/w700h466-Native_blueberry.jpg'),
    imageAlt: 'Dianella nigra tūrutu with native blue berries',
  },
  {
    id: 'uncinia-uncinata',
    name: 'Uncinia uncinata (Kamu)',
    category: 'Other Native Plants',
    description: 'A drought- and frost-resistant native sedge that prefers full sun and tolerates wind.',
    image: plantPhoto('a0293426-6af0-433f-a368-6403f68f9f47/a0293426-6b04-46b1-8a41-aeb282d0738f/w225h225-download.jpg'),
    imageAlt: 'Uncinia uncinata kamu',
  },
  {
    id: 'acaena-inermis-purpurea',
    name: 'Acaena inermis purpurea (Piripiri)',
    category: 'Other Native Plants',
    description: 'A lush, plum-purple, fern-like ground cover for sunny, well-drained positions; tolerates partial shade.',
    image: plantPhoto('a1ca3a7b-4350-46c0-a3bf-df01be264393/a1ca3da4-9423-4f5c-afcd-11e307b9f460/w426h335-Acaena-inermis-Purpurea.png'),
    imageAlt: 'Acaena inermis purpurea ground cover',
  },
];

export const testimonials: TestimonialItem[] = [
  {
    id: 'alistair-hardy',
    author: 'Alistair Hardy, Director',
    text: 'Working with WaiNot Native Nursery has been a game-changer for contractors like us, great communication, easy and super helpful to deal with. We have been consistently impressed by the quality of their plants, which are always healthy and well-suited to our local environment. Their innovative use of the Ellebags promotes healthy root growth, ensuring transplant success and ultimately leading to thriving plants. The ease of use when working with the Ellebag has meant we save time in our planting process and never need to worry anymore about disposing of plastic trays/pots/bags anymore. We highly recommend contacting WaiNot Native Nursery for any large or small native planting projects you may have.',
  },
  {
    id: 'yellowview-trust',
    author: 'Yellowview Trust',
    text: "Over the past three years, I've planted 40,000 native trees and shrubs using plastic pots and bags, which were heavy, fragile, and produced waste. These methods also added 25% to plant costs due to high transport expenses, and removing the plants took time. Plastic disposal was another issue. In the last 15 months, the ELLEPOT system has improved our process. Used by WaiNot Native Nursery in Rotorua, it reduces freight costs by allowing more plants in a degradable box, ready for planting without handling. Its eco-friendly pots lower labour and environmental impact. We plant with a spade or a battery drill and auger, speeding up the process and cutting costs. Plants grow better and need less maintenance; some shrubs don't need care later. Fertiliser tablets boost growth without extra work. This system allows efficient planting, better plant survival, and cost savings.",
  },
  {
    id: 'aotearoa-restoration',
    author: 'Aotearoa Restoration',
    text: 'Partnering with WaiNot Native Nursery has transformed our planting operations. The Ellebag system makes planting faster and easier, with minimal root disturbance and no soil loss — resulting in healthier, more resilient plants. We’ve cut labour time, reduced plastic waste, and improved overall efficiency, all while meeting our sustainability goals. WaiNot’s Ellebag-grown natives deliver real results for restoration projects across Aotearoa.',
  },
  {
    id: 'dave-and-nicola',
    author: 'Dave and Nicola',
    text: 'WaiNot Native Nursery have supplied more than 3000 plants for two planting projects we have undertaken over the past three years on our lifestyle block. The first was to revegetate a stream bank, and in Autumn 2025 we planted two steep areas unsuitable for grazing. Another key consideration was the environmental sustainability of the WaiNot Native Nursery Ellebag planting method. The plants supplied were of the best quality and so very easy to plant in their degradable sleeves. No pots to contend with being a huge factor in reducing the planting time by at least half. It has been a pleasure to do business with Steve and Steph who have shared their knowledge freely. We highly recommend WaiNot Native Nursery for any native planting project.',
  },
];

export const nurseryMeta = {
  address: '715 Waikite Valley Road, RD1, Rotorua',
  phoneSteph: '0272916064',
  phoneSteve: '0274751612',
  email: 'info@wainotnativenursery.co.nz',
  orderNotice: 'New seedlings are on their way. Get in early to lock in your species and volumes for your project.',
  plantSelectionGuide: 'https://www.wainotnativenursery.co.nz/site_files/38808/upload_files/WaiNot_Plant_Selection_Guide_Matrix_with_Logo_A4_Landscape%20(1)(1).pdf?dl=1',
  ellebagGuide: 'https://www.wainotnativenursery.co.nz/site_files/38808/upload_files/Wainot%20folder%20A5%204%20pages(1).pdf?dl=1',
  plantingCalculator: 'https://toolkit.tanestrees.org.nz/planting-budgeting-calculator/',
};
