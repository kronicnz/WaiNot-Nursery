export interface TestimonialItem {
  id: string;
  author: string;
  text: string;
}

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
    src: '/images/WaiNot-Nursery%20-Plants.jpg',
    alt: 'Rows of native plants at WaiNot Native Nursery with Waikite Valley in the evening light',
    caption: 'Grown in Waikite Valley',
    width: 4000,
    height: 3000,
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
