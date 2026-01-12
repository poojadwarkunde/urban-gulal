// Product catalog for Urban Gulal
const PRODUCTS = [
  // Pooja Items
  {
    id: 1,
    name: 'Decorative Namaste Pooja Thali',
    category: 'Pooja Items',
    price: 350,
    image: '/images/namaste-thali.jpg',
    description: 'Beautiful meenakari work pooja thali with diya holders'
  },
  {
    id: 2,
    name: 'Golden Lakshmi Diya Stand',
    category: 'Pooja Items',
    price: 280,
    image: '/images/lakshmi-diya.jpg',
    description: 'Elegant golden finish diya stand with Lakshmi design'
  },
  {
    id: 3,
    name: 'Om Kalash Pooja Thali',
    category: 'Pooja Items',
    price: 320,
    image: '/images/kalash-thali.jpg',
    description: 'Traditional kalash design with Om symbol'
  },
  {
    id: 4,
    name: 'Peacock Meenakari Thali',
    category: 'Pooja Items',
    price: 450,
    image: '/images/peacock-thali.jpg',
    description: 'Colorful peacock design with intricate meenakari work'
  },
  {
    id: 5,
    name: 'Golden Ganesha Diya Set',
    category: 'Pooja Items',
    price: 220,
    image: '/images/ganesha-diya.jpg',
    description: 'Ganesh shaped decorative diya holder'
  },
  {
    id: 6,
    name: 'Elephant Haldi Kumkum Holder',
    category: 'Pooja Items',
    price: 180,
    image: '/images/elephant-holder.jpg',
    description: 'Decorative elephant with compartments for haldi kumkum'
  },
  {
    id: 7,
    name: 'Diamond Pattern Kite Thali',
    category: 'Pooja Items',
    price: 250,
    image: '/images/kite-thali.jpg',
    description: 'Unique kite shaped pooja thali with meenakari'
  },
  {
    id: 8,
    name: 'Swastik Golden Plate',
    category: 'Pooja Items',
    price: 180,
    image: '/images/swastik-plate.jpg',
    description: 'Auspicious swastik design golden plate'
  },

  // Kitchen Items
  {
    id: 9,
    name: 'Bamboo Heat Pad',
    category: 'Kitchen',
    price: 120,
    image: '/images/heat-pad.jpg',
    description: 'Natural bamboo heat resistant pad for hot vessels'
  },
  {
    id: 10,
    name: 'Colorful Storage Containers (Set of 6)',
    category: 'Kitchen',
    price: 250,
    image: '/images/containers.jpg',
    description: 'BPA free, microwave safe containers in pastel colors'
  },
  {
    id: 11,
    name: 'Banana Leaf Serving Plate (Set of 2)',
    category: 'Kitchen',
    price: 180,
    image: '/images/banana-leaf.jpg',
    description: 'Traditional style melamine banana leaf plates'
  },
  {
    id: 12,
    name: 'Floral Design Serving Tray',
    category: 'Kitchen',
    price: 150,
    image: '/images/serving-tray.jpg',
    description: 'Elegant black tray with golden floral print'
  },
  {
    id: 13,
    name: 'Round Storage Boxes (Set of 6)',
    category: 'Kitchen',
    price: 200,
    image: '/images/round-boxes.jpg',
    description: 'Colorful airtight storage containers'
  },

  // Bags & Pouches
  {
    id: 14,
    name: 'Embroidered Rangoli Pouch',
    category: 'Bags',
    price: 150,
    image: '/images/rangoli-pouch.jpg',
    description: 'Yellow pouch with traditional rangoli embroidery'
  },
  {
    id: 15,
    name: 'Pink Floral Embroidered Wallet',
    category: 'Bags',
    price: 180,
    image: '/images/pink-wallet.jpg',
    description: 'Handcrafted pink wallet with sequin flowers'
  },
  {
    id: 16,
    name: 'Cream Floral Pouch Set',
    category: 'Bags',
    price: 220,
    image: '/images/cream-pouch.jpg',
    description: 'Set of 2 embroidered cream pouches'
  },
  {
    id: 17,
    name: 'Patchwork Designer Pouch',
    category: 'Bags',
    price: 200,
    image: '/images/patchwork-pouch.jpg',
    description: 'Colorful Rajasthani patchwork design pouch'
  },
  {
    id: 18,
    name: 'Namaste Thank You Bag',
    category: 'Bags',
    price: 80,
    image: '/images/thankyou-bag.jpg',
    description: 'Jute gift bag with beautiful namaste print'
  },

  // Gift Items
  {
    id: 19,
    name: 'Crystal Glass Turtle (Large)',
    category: 'Gift Items',
    price: 350,
    image: '/images/turtle-large.jpg',
    description: 'Vastu Shastra crystal turtle for positive energy'
  },
  {
    id: 20,
    name: 'Crystal Glass Turtle (Small)',
    category: 'Gift Items',
    price: 200,
    image: '/images/turtle-small.jpg',
    description: 'Small crystal turtle for good luck'
  },
  {
    id: 21,
    name: 'Decorative Flower Candles (Set of 12)',
    category: 'Gift Items',
    price: 280,
    image: '/images/flower-candles.jpg',
    description: 'Beautiful floating flower candles in gold basket'
  },
  {
    id: 22,
    name: 'Golden Ganesh Diya Peacock',
    category: 'Gift Items',
    price: 320,
    image: '/images/ganesh-peacock.jpg',
    description: 'Decorative Ganesha with peacock diya holder'
  }
];

const CATEGORIES = ['All', 'Pooja Items', 'Kitchen', 'Bags', 'Gift Items'];

module.exports = { PRODUCTS, CATEGORIES };
