// Product catalog for Urban Gulal
// UPDATE PRICES: Change the 'price' values below to actual prices

const PRODUCTS = [
  // =====================
  // POOJA ITEMS
  // =====================
  {
    id: 1,
    name: 'Girl Haldi Kunku Set',
    category: 'Pooja Items',
    price: 0, // UPDATE PRICE
    image: '/Girl haldi Kunku.jpeg',
    description: 'Beautiful decorative haldi kunku holder with girl design'
  },
  {
    id: 2,
    name: 'Girl Holding Hands Thali',
    category: 'Pooja Items',
    price: 0, // UPDATE PRICE
    image: '/Girl holding hands thali.jpeg',
    description: 'Elegant pooja thali with namaste design'
  },
  {
    id: 3,
    name: 'Peacock Meenakari Thali',
    category: 'Pooja Items',
    price: 0, // UPDATE PRICE
    image: '/Peacock thali.jpeg',
    description: 'Colorful peacock design pooja thali'
  },
  {
    id: 5,
    name: 'Kalash Haldi Kunku (Golden)',
    category: 'Pooja Items',
    price: 0, // UPDATE PRICE
    image: '/kalash haldi kunku_11.jpeg',
    description: 'Golden finish kalash haldi kunku set'
  },
  {
    id: 6,
    name: 'Kite Haldi Kunku Set',
    category: 'Pooja Items',
    price: 0, // UPDATE PRICE
    image: '/Kite Haldi Kunku.jpg',
    description: 'Unique kite shaped haldi kunku holder'
  },
  {
    id: 7,
    name: 'Elephant Haldi Kunku Holder',
    category: 'Pooja Items',
    price: 0, // UPDATE PRICE
    image: '/Elephant haldi kunku.jpg',
    description: 'Decorative elephant shaped haldi kunku set'
  },
  {
    id: 8,
    name: 'Heart Haldi Kunku Set',
    category: 'Pooja Items',
    price: 0, // UPDATE PRICE
    image: '/heart haldi kunku_1.jpeg',
    description: 'Heart shaped decorative haldi kunku holder'
  },
  {
    id: 9,
    name: 'Supali Haldi Kunku Set',
    category: 'Pooja Items',
    price: 0, // UPDATE PRICE
    image: '/supali haldi kunku.jpeg',
    description: 'Traditional supali design haldi kunku holder'
  },
  {
    id: 10,
    name: 'Haldi Kunku Basket Set',
    category: 'Pooja Items',
    price: 0, // UPDATE PRICE
    image: '/haldi kunku basket.jpg',
    description: 'Decorative basket style haldi kunku set'
  },
  {
    id: 11,
    name: 'Agarbatti Stand',
    category: 'Pooja Items',
    price: 0, // UPDATE PRICE
    image: '/Agarbatti Stand_image.png',
    description: 'Elegant incense stick holder'
  },

  // =====================
  // KITCHEN ITEMS
  // =====================
  {
    id: 12,
    name: 'Stainless Steel Grater',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Grater.png',
    description: 'Multi-purpose kitchen grater'
  },
  {
    id: 13,
    name: 'Square Heat Pad',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Square heat pad.jpeg',
    description: 'Bamboo heat resistant pad - square shape'
  },
  {
    id: 14,
    name: 'Circle Heat Pad',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/heat pad circle.png',
    description: 'Bamboo heat resistant pad - round shape'
  },
  {
    id: 15,
    name: 'Leaf Tray (Large)',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Leaf Tray.png',
    description: 'Decorative leaf shaped serving tray'
  },
  {
    id: 16,
    name: 'Leaf Tray Set',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Leaf tray comparison.jpeg',
    description: 'Set of leaf shaped trays in different sizes'
  },
  {
    id: 17,
    name: 'Rectangle Serving Tray',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Reactnagle tray_size.jpeg',
    description: 'Elegant rectangular serving tray'
  },
  {
    id: 18,
    name: 'Medium Size Strainer',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Medium size strainer.png',
    description: 'Stainless steel kitchen strainer'
  },
  {
    id: 19,
    name: 'Pot Stand',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Pot Stand.png',
    description: 'Heat resistant pot stand for kitchen'
  },
  {
    id: 20,
    name: 'Small Round Container',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Small Round container.png',
    description: 'Colorful small round storage container'
  },
  {
    id: 21,
    name: 'Small Round Container Set',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Round small conatiner.jpeg',
    description: 'Set of small round storage containers'
  },
  {
    id: 22,
    name: 'Medium Round Container',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Med size round container.png',
    description: 'Medium size round storage container'
  },
  {
    id: 24,
    name: 'Small Square Container',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Small Square container.png',
    description: 'Small square storage container'
  },
  {
    id: 25,
    name: 'Ethnic Round Container',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Ethnic round container.png',
    description: 'Decorative ethnic design round container'
  },
  {
    id: 26,
    name: 'Heart Multi Container',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Heart Multi Container.png',
    description: 'Heart shaped multi-compartment container'
  },
  {
    id: 27,
    name: 'Glass Bottle',
    category: 'Kitchen',
    price: 0, // UPDATE PRICE
    image: '/Glass Bottle Image.png',
    description: 'Decorative glass bottle for storage'
  },

  // =====================
  // BAGS & POUCHES
  // =====================
  {
    id: 29,
    name: 'Hand Purse (Embroidered)',
    category: 'Bags',
    price: 0, // UPDATE PRICE
    image: '/Hand Purse.jpeg',
    description: 'Beautiful embroidered hand purse'
  },
  {
    id: 30,
    name: 'Hand Purse (Floral)',
    category: 'Bags',
    price: 0, // UPDATE PRICE
    image: '/hand_purse_1.jpeg',
    description: 'Floral design hand purse'
  },
  {
    id: 32,
    name: 'Red Hand Purse Variety',
    category: 'Bags',
    price: 0, // UPDATE PRICE
    image: '/Red hand purse variety.jpeg',
    description: 'Red hand purse with variety patterns'
  },
  {
    id: 33,
    name: 'Ethnic Potli Bag',
    category: 'Bags',
    price: 0, // UPDATE PRICE
    image: '/Ethnic Potli image.png',
    description: 'Traditional ethnic potli bag'
  },
  {
    id: 34,
    name: 'Warli Painting Bag',
    category: 'Bags',
    price: 0, // UPDATE PRICE
    image: '/Varali painting bag.png',
    description: 'Bag with traditional Warli art design'
  },
  {
    id: 35,
    name: 'Thank You Cloth Bag',
    category: 'Bags',
    price: 0, // UPDATE PRICE
    image: '/Thank you cloth bag.jpeg',
    description: 'Eco-friendly cloth bag with thank you print'
  },
  {
    id: 36,
    name: 'Traditional Cloth Bag',
    category: 'Bags',
    price: 0, // UPDATE PRICE
    image: '/Traditional cloth bag_1.jpeg',
    description: 'Traditional design cloth shopping bag'
  },
  {
    id: 37,
    name: 'Foldable Shopping Bag',
    category: 'Bags',
    price: 0, // UPDATE PRICE
    image: '/Foldable Bag Image.png',
    description: 'Compact foldable shopping bag'
  },

  // =====================
  // GIFT ITEMS
  // =====================
  {
    id: 38,
    name: 'Glass Turtle Set',
    category: 'Gift Items',
    price: 0, // UPDATE PRICE
    image: '/Glass turtle comparison.jpeg',
    description: 'Crystal glass turtle set for good luck'
  },
  {
    id: 39,
    name: 'Decorative Basket',
    category: 'Gift Items',
    price: 0, // UPDATE PRICE
    image: '/basket_image.png',
    description: 'Beautiful decorative gift basket'
  }
];

const CATEGORIES = ['All', 'Pooja Items', 'Kitchen', 'Bags', 'Gift Items'];

module.exports = { PRODUCTS, CATEGORIES };
