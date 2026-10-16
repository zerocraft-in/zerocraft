export interface Product {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  categorySlug: string;
  collectionSlug?: string;
  brand: string;
  price: number;
  currency?: string;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  stock: number;
  tags: string[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  sku: string;
  shippingBadge: string;
  isNew: boolean;
  isSale: boolean;
  images: string[];
  specifications: { label: string; value: string }[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  itemCount: number;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  image: string;
}

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  title: string;
  content: string;
  productName: string;
  verified: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  title: string;
  image: string;
  price: number;
  currency?: string;
  quantity: number;
  color?: string;
  size?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: 'Delivered' | 'Processing' | 'Shipped' | 'Cancelled';
  timeline: { step: string; timestamp: string; completed: boolean }[];
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  currency?: string;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  paymentMethod: string;
}

export const CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Posters',
    slug: 'posters',
    description: 'Museum-grade minimalist, typography, and art prints on heavy matte archival paper.',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=800&auto=format&fit=crop',
    itemCount: 42,
  },
  {
    id: 'cat-2',
    name: 'Photo Frames',
    slug: 'photo-frames',
    description: 'Hand-assembled solid oak, black walnut, and aluminum glass gallery frames.',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800&auto=format&fit=crop',
    itemCount: 28,
  },
  {
    id: 'cat-3',
    name: 'Customized Gifts',
    slug: 'customized-gifts',
    description: 'Bespoke engraved brass items, personalized ceramic mugs, and memorable keepsakes.',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop',
    itemCount: 35,
  },
  {
    id: 'cat-4',
    name: 'Notebooks',
    slug: 'notebooks',
    description: 'Full-grain leather journals, lay-flat dotted sketchbooks, and fountain pen paper.',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop',
    itemCount: 24,
  },
  {
    id: 'cat-5',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Precision milled key organizers, titanium cardholders, and minimalist tech pouches.',
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=800&auto=format&fit=crop',
    itemCount: 19,
  },
  {
    id: 'cat-6',
    name: 'Desk Decor',
    slug: 'desk-decor',
    description: 'Sculptural concrete vessels, ambient glow LED displays, and ergonomic risers.',
    image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=800&auto=format&fit=crop',
    itemCount: 31,
  },
  {
    id: 'cat-7',
    name: 'Wall Art',
    slug: 'wall-art',
    description: 'Textured canvas panels, acoustic wood slat art, and acrylic backlit statements.',
    image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=800&auto=format&fit=crop',
    itemCount: 26,
  },
  {
    id: 'cat-8',
    name: 'Personalized Items',
    slug: 'personalized-items',
    description: 'Custom laser engraved desk docks, monogrammed leather mats, and initial tags.',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop',
    itemCount: 38,
  },
];

export const COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    name: 'Minimal Collection',
    slug: 'minimal-collection',
    tagline: 'Pure lines & subtle tones',
    description: 'Designed for quiet environments that celebrate restraint and functional elegance.',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'col-2',
    name: 'Workspace Collection',
    slug: 'workspace-collection',
    tagline: 'Elevate your daily flow',
    description: 'Ergonomic, aesthetic desk essentials engineered for deep focused work.',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'col-3',
    name: 'Gaming Collection',
    slug: 'gaming-collection',
    tagline: 'Immersive setup aesthetics',
    description: 'Precision mouse pads, neon ambient glow accents, and tactical accessories.',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'col-4',
    name: 'Anime Collection',
    slug: 'anime-collection',
    tagline: 'Vibrant artistic tributes',
    description: 'Exclusive metallic prints, limited poster runs, and collectible art boards.',
    image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'col-5',
    name: 'Wedding Collection',
    slug: 'wedding-collection',
    tagline: 'Cherished memories forever',
    description: 'Handcrafted photo books, golden engraved frame series, and luxury gift boxes.',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'col-6',
    name: 'Birthday Gifts',
    slug: 'birthday-gifts',
    tagline: 'Unforgettable personal touches',
    description: 'Thoughtfully crafted custom name items with custom gift wrapping.',
    image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'col-7',
    name: 'Office Essentials',
    slug: 'office-essentials',
    tagline: 'Refined desk architecture',
    description: 'Plush desk mats, executive brass pens, and structured leather folios.',
    image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'col-8',
    name: 'Creative Studio',
    slug: 'creative-studio',
    tagline: 'Fuel your imagination',
    description: 'Dotted journals, color-accurate prints, and inspiriting wall murals.',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800&auto=format&fit=crop',
  },
];

export const PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    slug: 'minimal-mountain-poster',
    title: 'Minimal Mountain Poster',
    shortDescription: 'Monochrome topographical peaks on 300gsm Japanese cotton archival paper.',
    description: 'An homage to modern minimalism, this print showcases the serene geometry of alpine peaks. Rendered with ultra-fine line weight and soft tonal gradients, it brings tranquility and structured grandeur to any interior space.',
    category: 'Posters',
    categorySlug: 'posters',
    collectionSlug: 'minimal-collection',
    brand: 'ZeroCraft Studio',
    price: 34.00,
    originalPrice: 48.00,
    rating: 4.9,
    reviewCount: 128,
    stock: 25,
    tags: ['Minimalist', 'Wall Art', 'Black & White', 'Archival Paper'],
    colors: [
      { name: 'Charcoal Black', hex: '#1c1917' },
      { name: 'Warm Cream', hex: '#f5f3ef' },
      { name: 'Slate Grey', hex: '#64748b' }
    ],
    sizes: ['12" x 16"', '18" x 24"', '24" x 36"'],
    sku: 'ZC-PST-001',
    shippingBadge: 'Free Standard Shipping',
    isNew: true,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Paper Stock', value: '300 GSM Japanese Cotton Matte' },
      { label: 'Print Technique', value: '12-Color Pigment Giclée Print' },
      { label: 'Frame Included', value: 'No (Fits Standard Frames)' },
      { label: 'Origin', value: 'Crafted in ZeroCraft Studio, Tokyo' },
    ],
  },
  {
    id: 'prod-2',
    slug: 'abstract-wall-frame',
    title: 'Abstract Geometric Wall Frame',
    shortDescription: 'Solid black aluminum glass frame featuring contemporary organic shapes.',
    description: 'Transform your living room wall with our Abstract Geometric Frame. Hand-assembled with anti-reflective museum glass and a slim 15mm powder-coated aluminum edge, this piece brings gallery-level warmth and depth.',
    category: 'Photo Frames',
    categorySlug: 'photo-frames',
    collectionSlug: 'minimal-collection',
    brand: 'ZeroCraft Studio',
    price: 89.00,
    originalPrice: 110.00,
    rating: 4.8,
    reviewCount: 94,
    stock: 14,
    tags: ['Gallery Frame', 'Modern Art', 'Aluminum Frame', 'Museum Glass'],
    colors: [
      { name: 'Matte Black', hex: '#0f0f0f' },
      { name: 'Brushed Silver', hex: '#d1d5db' },
      { name: 'Champagne Gold', hex: '#d4af37' }
    ],
    sizes: ['16" x 20"', '20" x 30"', '24" x 36"'],
    sku: 'ZC-FRM-002',
    shippingBadge: 'Ships Next Business Day',
    isNew: false,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Frame Material', value: 'Anodized Aircraft-Grade Aluminum' },
      { label: 'Glazing', value: '99% UV-Protective Anti-Reflective Glass' },
      { label: 'Mounting', value: 'Dual Heavy-Duty Cleat Hangers Included' },
      { label: 'Weight', value: '2.4 kg' },
    ],
  },
  {
    id: 'prod-3',
    slug: 'wooden-photo-frame',
    title: 'Solid Oak Wooden Photo Frame',
    shortDescription: 'Sustainably sourced North American white oak with natural wax oil finish.',
    description: 'Celebrate your favorite moments with timeless natural wood texture. Each solid oak frame features unique grain patterns, mitered dovetail corners, and museum matting.',
    category: 'Photo Frames',
    categorySlug: 'photo-frames',
    collectionSlug: 'wedding-collection',
    brand: 'ZeroCraft Artisans',
    price: 65.00,
    originalPrice: 65.00,
    rating: 5.0,
    reviewCount: 67,
    stock: 18,
    tags: ['Natural Oak', 'Handmade', 'Photo Frame', 'Sustainable'],
    colors: [
      { name: 'Natural Oak', hex: '#c69d6b' },
      { name: 'Walnut Stain', hex: '#5c4033' },
      { name: 'Ebony Wood', hex: '#262322' }
    ],
    sizes: ['8" x 10"', '11" x 14"', '16" x 20"'],
    sku: 'ZC-FRM-003',
    shippingBadge: 'Free Standard Shipping',
    isNew: true,
    isSale: false,
    images: [
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Wood Origin', value: 'FSC Certified American White Oak' },
      { label: 'Finish', value: 'Organic German Beeswax Oil' },
      { label: 'Backing', value: 'Acid-free Archival Cardboard' },
    ],
  },
  {
    id: 'prod-4',
    slug: 'custom-name-mug',
    title: 'Custom Laser Monogram Ceramic Mug',
    shortDescription: 'Double-walled matte ceramic mug with precision laser etched signature.',
    description: 'Keep your brew warm while showcasing your personal seal. Crafted from high-fire stoneware ceramic with a velvet-soft matte exterior and gloss glazed interior for easy cleaning.',
    category: 'Customized Gifts',
    categorySlug: 'customized-gifts',
    collectionSlug: 'birthday-gifts',
    brand: 'ZeroCraft Custom',
    price: 28.00,
    originalPrice: 35.00,
    rating: 4.7,
    reviewCount: 210,
    stock: 40,
    tags: ['Customized', 'Ceramic', 'Drinkware', 'Monogram'],
    colors: [
      { name: 'Matte Onyx', hex: '#18181b' },
      { name: 'Nordic Cream', hex: '#f3ece2' },
      { name: 'Terracotta Red', hex: '#b91c1c' }
    ],
    sizes: ['12 oz (350ml)', '16 oz (480ml)'],
    sku: 'ZC-MUG-004',
    shippingBadge: 'Custom Engraved in 48 Hours',
    isNew: false,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Material', value: 'High-Temperature Stoneware Ceramic' },
      { label: 'Thermal Retention', value: 'Double-wall Vacuum Insulated' },
      { label: 'Dishwasher Safe', value: 'Yes (Top Rack Recommended)' },
    ],
  },
  {
    id: 'prod-5',
    slug: 'leather-notebook',
    title: 'Heritage Leather Bound Journal',
    shortDescription: 'Full-grain Horween leather cover filled with 120gsm fountain pen friendly paper.',
    description: 'Designed for thinkers, writers, and visionaries. Our Heritage Leather Journal ages beautifully over time, developing a unique patina that tells your story.',
    category: 'Notebooks',
    categorySlug: 'notebooks',
    collectionSlug: 'creative-studio',
    brand: 'ZeroCraft Studio',
    price: 52.00,
    originalPrice: 65.00,
    rating: 4.9,
    reviewCount: 156,
    stock: 30,
    tags: ['Leather', 'Journal', 'Fountain Pen Friendly', 'Lay-Flat'],
    colors: [
      { name: 'Saddle Tan', hex: '#9a3412' },
      { name: 'Deep Espresso', hex: '#291d18' },
      { name: 'Olive Drab', hex: '#3f6212' }
    ],
    sizes: ['A5 (5.8" x 8.3")', 'B5 (6.9" x 9.8")'],
    sku: 'ZC-NTB-005',
    shippingBadge: 'Free Standard Shipping',
    isNew: true,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Leather Type', value: '100% Full-Grain Vegetable Tanned Leather' },
      { label: 'Paper Spec', value: '192 Pages, 120gsm Acid-Free Cream Paper' },
      { label: 'Binding', value: 'Hand-stitched Thread Lay-Flat Binding' },
    ],
  },
  {
    id: 'prod-6',
    slug: 'travel-journal',
    title: 'Wanderlust Modular Travel Journal',
    shortDescription: 'Refillable notebook system with elastic bands, zipper pouch, and brass clip.',
    description: 'Organize flight tickets, field notes, and memories in one place. The Wanderlust system lets you swap notebook refills endlessly for every voyage.',
    category: 'Notebooks',
    categorySlug: 'notebooks',
    collectionSlug: 'workspace-collection',
    brand: 'ZeroCraft Custom',
    price: 45.00,
    originalPrice: 45.00,
    rating: 4.8,
    reviewCount: 88,
    stock: 22,
    tags: ['Travel', 'Refillable', 'Modular', 'Leather'],
    colors: [
      { name: 'Midnight Navy', hex: '#1e3a8a' },
      { name: 'Chestnut Brown', hex: '#7c2d12' },
      { name: 'Obsidian Black', hex: '#18181b' }
    ],
    sizes: ['Passport Size', 'Standard Traveler'],
    sku: 'ZC-NTB-006',
    shippingBadge: 'Ships Next Business Day',
    isNew: false,
    isSale: false,
    images: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Includes', value: '3 Refill Booklets (Grid, Blank, Dotted)' },
      { label: 'Accessories', value: 'Brass Clip & PVC Zipper Storage Card Pocket' },
    ],
  },
  {
    id: 'prod-7',
    slug: 'anime-poster',
    title: 'Neon Cyberpunk Anime Poster',
    shortDescription: 'Backlit metallic poster foil print with electric blue and magenta accents.',
    description: 'Bring the vivid futuristic aesthetics of Tokyo cyber cityscapes directly to your setup room wall. Printed with metallic reflective ink that reacts under ambient light.',
    category: 'Posters',
    categorySlug: 'posters',
    collectionSlug: 'anime-collection',
    brand: 'ZeroCraft Art',
    price: 39.00,
    originalPrice: 50.00,
    rating: 4.9,
    reviewCount: 312,
    stock: 50,
    tags: ['Anime', 'Cyberpunk', 'Foil Print', 'Gaming Room'],
    colors: [
      { name: 'Neon Cyber', hex: '#ec4899' },
      { name: 'Electric Violet', hex: '#8b5cf6' }
    ],
    sizes: ['18" x 24"', '24" x 36"'],
    sku: 'ZC-PST-007',
    shippingBadge: 'Free Standard Shipping',
    isNew: true,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Print Type', value: 'Holographic Metallic Foil Press' },
      { label: 'Edition', value: 'Limited Series 500 Copies' },
    ],
  },
  {
    id: 'prod-8',
    slug: 'gaming-mouse-pad',
    title: 'Ultra-Smooth Felt Desk & Gaming Mat',
    shortDescription: 'Extra large 900x400mm Merino wool felt pad with non-slip natural rubber base.',
    description: 'Elevate your desktop setup comfort. Micro-textured natural wool top provides silent glides for optical gaming mice while protecting wooden desks from scratches.',
    category: 'Desk Decor',
    categorySlug: 'desk-decor',
    collectionSlug: 'gaming-collection',
    brand: 'ZeroCraft Studio',
    price: 42.00,
    originalPrice: 55.00,
    rating: 4.9,
    reviewCount: 430,
    stock: 60,
    tags: ['Desk Mat', 'Merino Wool', 'Gaming', 'Minimalist'],
    colors: [
      { name: 'Dark Graphite', hex: '#27272a' },
      { name: 'Heather Grey', hex: '#9ca3af' },
      { name: 'Oatmeal Beige', hex: '#d6c7b2' }
    ],
    sizes: ['Medium (700x300mm)', 'Large (900x400mm)', 'XL (1000x500mm)'],
    sku: 'ZC-DSK-008',
    shippingBadge: 'Ships Next Business Day',
    isNew: false,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Top Surface', value: '100% German Merino Wool Felt (3mm)' },
      { label: 'Bottom Layer', value: 'Anti-Skid Eco Rubber Base' },
      { label: 'Stitching', value: 'Precision Anti-Fray Edge Border' },
    ],
  },
  {
    id: 'prod-9',
    slug: 'minimal-desk-calendar',
    title: 'Perpetual Brass & Wood Desk Calendar',
    shortDescription: 'Rotational solid brass ring with dark walnut date block for timeless counting.',
    description: 'Never buy another paper calendar. Designed as a permanent desk sculpture, simply rotate the heavy brass day slider each morning to start your work routine.',
    category: 'Desk Decor',
    categorySlug: 'desk-decor',
    collectionSlug: 'office-essentials',
    brand: 'ZeroCraft Studio',
    price: 49.00,
    originalPrice: 49.00,
    rating: 5.0,
    reviewCount: 45,
    stock: 15,
    tags: ['Perpetual Calendar', 'Brass', 'Walnut Wood', 'Desk Accessories'],
    colors: [
      { name: 'Raw Brass & Walnut', hex: '#b45309' },
      { name: 'Black Oxide & Oak', hex: '#1c1917' }
    ],
    sizes: ['One Size (7.5" x 3.5")'],
    sku: 'ZC-DSK-009',
    shippingBadge: 'Free Standard Shipping',
    isNew: true,
    isSale: false,
    images: [
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Base', value: 'Solid American Black Walnut Wood' },
      { label: 'Components', value: 'Machined Solid Brass Rings' },
    ],
  },
  {
    id: 'prod-10',
    slug: 'premium-sticker-pack',
    title: 'Developer & Artist Vinyl Sticker Pack (50 Pcs)',
    shortDescription: 'Waterproof die-cut vinyl stickers featuring code icons, typography, and badges.',
    description: 'Decorate your MacBook, water bottle, or journal cover with ultra-durable matte laminated vinyl stickers. UV-resistant color inks stay bright for years.',
    category: 'Accessories',
    categorySlug: 'accessories',
    collectionSlug: 'creative-studio',
    brand: 'ZeroCraft Art',
    price: 18.00,
    originalPrice: 24.00,
    rating: 4.6,
    reviewCount: 180,
    stock: 100,
    tags: ['Stickers', 'Vinyl', 'Laptop Accessories', 'Matte'],
    colors: [
      { name: 'Multi Pack', hex: '#6366f1' }
    ],
    sizes: ['50 Pack Assorted'],
    sku: 'ZC-ACC-010',
    shippingBadge: 'Free Standard Shipping',
    isNew: false,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Material', value: '3M Die-Cut Vinyl with Matte Film Coating' },
      { label: 'Durability', value: '100% Waterproof, Dishwasher Safe & Weatherproof' },
    ],
  },
  {
    id: 'prod-11',
    slug: 'canvas-wall-art',
    title: 'Textured Archival Canvas Wall Mural',
    shortDescription: 'Museum stretched canvas artwork on solid pine wood inner frame bars.',
    description: 'An expansive modern statement piece. Hand-painted acrylic textures digitized and printed at ultra high resolution on gallery-wrapped heavyweight cotton canvas.',
    category: 'Wall Art',
    categorySlug: 'wall-art',
    collectionSlug: 'minimal-collection',
    brand: 'ZeroCraft Art',
    price: 149.00,
    originalPrice: 180.00,
    rating: 4.9,
    reviewCount: 78,
    stock: 10,
    tags: ['Canvas Art', 'Large Mural', 'Modern Abstract', 'Gallery Wrap'],
    colors: [
      { name: 'Nordic Sand', hex: '#e5e0d8' },
      { name: 'Monochrome Grey', hex: '#4b5563' }
    ],
    sizes: ['24" x 36"', '36" x 48"', '40" x 60"'],
    sku: 'ZC-WLL-011',
    shippingBadge: 'Fragile Freight Protection',
    isNew: true,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Canvas Grade', value: '420 GSM 100% Natural Organic Cotton Canvas' },
      { label: 'Stretcher Bars', value: '1.5" Deep Kiln-Dried Pine Wood Frame' },
    ],
  },
  {
    id: 'prod-12',
    slug: 'personalized-gift-box',
    title: 'Luxury Monogrammed Wooden Gift Box',
    shortDescription: 'Hand-crafted cedar gift hamper box with custom engraved slide lid and ribbon.',
    description: 'The ultimate presentation box for weddings, anniversaries, and corporate milestones. Includes customized silk lining and personalized laser engraving.',
    category: 'Customized Gifts',
    categorySlug: 'customized-gifts',
    collectionSlug: 'wedding-collection',
    brand: 'ZeroCraft Custom',
    price: 79.00,
    originalPrice: 79.00,
    rating: 5.0,
    reviewCount: 52,
    stock: 16,
    tags: ['Gift Box', 'Cedar Wood', 'Engraved', 'Luxury Box'],
    colors: [
      { name: 'Natural Cedar', hex: '#b45309' },
      { name: 'Midnight Stain', hex: '#18181b' }
    ],
    sizes: ['Medium Box', 'Large Hamper Box'],
    sku: 'ZC-GFT-012',
    shippingBadge: 'Includes Custom Ribbon Packaging',
    isNew: false,
    isSale: false,
    images: [
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Wood', value: 'Aromatic Red Cedar Wood' },
      { label: 'Lining', value: 'Satin Velvet Padded Cushioning' },
    ],
  },
  {
    id: 'prod-13',
    slug: 'titanium-key-ring',
    title: 'Precision Grade 5 Titanium Key Ring',
    shortDescription: 'CNC machined unibody titanium carabiner clip with integrated bottle opener.',
    description: 'Eliminate key clutter with modern aerospace engineering. Ultralight, corrosion-proof, and designed to clip effortlessly onto belt loops or bags.',
    category: 'Accessories',
    categorySlug: 'accessories',
    collectionSlug: 'workspace-collection',
    brand: 'ZeroCraft Studio',
    price: 32.00,
    originalPrice: 40.00,
    rating: 4.8,
    reviewCount: 164,
    stock: 45,
    tags: ['EDC', 'Titanium', 'Key Ring', 'Carabiner'],
    colors: [
      { name: 'Raw Stonewashed', hex: '#64748b' },
      { name: 'Anodized Blue', hex: '#2563eb' },
      { name: 'Stealth Black', hex: '#0f172a' }
    ],
    sizes: ['Standard EDC Size'],
    sku: 'ZC-ACC-013',
    shippingBadge: 'Free Standard Shipping',
    isNew: false,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Material', value: 'Ti-6Al-4V Grade 5 Aerospace Titanium' },
      { label: 'Weight', value: 'Only 18 Grams' },
    ],
  },
  {
    id: 'prod-14',
    slug: 'craft-desk-mat',
    title: 'Genuine Italian Leather Desk Organizer Mat',
    shortDescription: 'Full-grain Toscanello leather pad with stitched pen loop and magnetic cord keeper.',
    description: 'Bring warmth and scent of rich Italian leather to your office environment. Features an integrated magnetic groove to keep charging cables docked neatly.',
    category: 'Desk Decor',
    categorySlug: 'desk-decor',
    collectionSlug: 'office-essentials',
    brand: 'ZeroCraft Studio',
    price: 110.00,
    originalPrice: 135.00,
    rating: 4.9,
    reviewCount: 92,
    stock: 12,
    tags: ['Italian Leather', 'Desk Mat', 'Cable Manager', 'Executive'],
    colors: [
      { name: 'Cognac Leather', hex: '#854d0e' },
      { name: 'Nero Black', hex: '#171717' }
    ],
    sizes: ['Large (800x400mm)'],
    sku: 'ZC-DSK-014',
    shippingBadge: 'Free Priority Shipping',
    isNew: true,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Leather', value: 'Certified Consorzio Vera Pelle Italian Leather' },
      { label: 'Base', value: 'Microfiber Anti-Slip Suede Backing' },
    ],
  },
  {
    id: 'prod-15',
    slug: 'personalized-brass-pen',
    title: 'Heavyweight Solid Brass Rollerball Pen',
    shortDescription: 'Weighted brass pen body that patinas over time. Takes Schmidt rollerball refills.',
    description: 'Balanced perfectly for effortless handwriting flow. Crafted from a solid bar of un-lacquered brass that darkens uniquely with each touch of your hands.',
    category: 'Personalized Items',
    categorySlug: 'personalized-items',
    collectionSlug: 'office-essentials',
    brand: 'ZeroCraft Custom',
    price: 58.00,
    originalPrice: 70.00,
    rating: 5.0,
    reviewCount: 114,
    stock: 28,
    tags: ['Brass Pen', 'Engraved', 'Rollerball', 'Handwriting'],
    colors: [
      { name: 'Raw Brass', hex: '#ca8a04' },
      { name: 'Matte Black Aluminum', hex: '#1c1917' }
    ],
    sizes: ['Standard Length (138mm)'],
    sku: 'ZC-PRS-015',
    shippingBadge: 'Free Name Engraving Included',
    isNew: false,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Refill Compatibility', value: 'Schmidt Safety Ceramic Roller 888 / G2' },
      { label: 'Weight', value: '62 Grams' },
    ],
  },
  {
    id: 'prod-16',
    slug: 'ceramic-vessel',
    title: 'Sculptural Speckled Ceramic Planter Vessel',
    shortDescription: 'Hand-thrown stoneware vessel with matte reactive glaze finish.',
    description: 'Designed as both a planter and standalone desk art piece. Its ribbed exterior catch light beautifully, creating soft shadows across your workspace surface.',
    category: 'Desk Decor',
    categorySlug: 'desk-decor',
    collectionSlug: 'minimal-collection',
    brand: 'ZeroCraft Artisans',
    price: 46.00,
    originalPrice: 46.00,
    rating: 4.8,
    reviewCount: 38,
    stock: 19,
    tags: ['Ceramic', 'Planter', 'Desk Art', 'Sculptural'],
    colors: [
      { name: 'Speckled White', hex: '#f4f4f5' },
      { name: 'Volcanic Black', hex: '#27272a' }
    ],
    sizes: ['5" Diameter', '7" Diameter'],
    sku: 'ZC-DSK-016',
    shippingBadge: 'Ships Next Business Day',
    isNew: true,
    isSale: false,
    images: [
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Crafting', value: 'Wheel-Thrown Stoneware with Drainage Hole' },
    ],
  },
  {
    id: 'prod-17',
    slug: 'linen-bound-sketchbook',
    title: 'Artisan Natural Linen Lay-Flat Sketchbook',
    shortDescription: '180gsm heavy cartridge paper covered in tactile woven European linen.',
    description: 'Ideal for watercolor, gouache, charcoal, and ink drawings. The heavy deckled paper handles wet media with zero bleed-through.',
    category: 'Notebooks',
    categorySlug: 'notebooks',
    collectionSlug: 'creative-studio',
    brand: 'ZeroCraft Studio',
    price: 38.00,
    originalPrice: 48.00,
    rating: 4.9,
    reviewCount: 82,
    stock: 20,
    tags: ['Sketchbook', 'Linen', 'Watercolor Paper', 'Artist'],
    colors: [
      { name: 'Natural Flax', hex: '#d6c7b2' },
      { name: 'Sage Green', hex: '#4d7c0f' },
      { name: 'Charcoal Linen', hex: '#3f3f46' }
    ],
    sizes: ['Square 8" x 8"', 'A4 Portrait'],
    sku: 'ZC-NTB-017',
    shippingBadge: 'Free Standard Shipping',
    isNew: false,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Paper', value: '160 Pages 180gsm Cold-Pressed Acid-Free' },
    ],
  },
  {
    id: 'prod-18',
    slug: 'ambient-led-frame',
    title: 'Backlit Glow Acrylic Art Frame',
    shortDescription: 'Diffused warm white LED light box frame with dimmable touch control.',
    description: 'Turn your artwork into a luminous focal point. Embedded ultra-high CRI 95+ LEDs cast a gentle warm halo behind your translucent art poster.',
    category: 'Photo Frames',
    categorySlug: 'photo-frames',
    collectionSlug: 'gaming-collection',
    brand: 'ZeroCraft Studio',
    price: 125.00,
    originalPrice: 150.00,
    rating: 4.9,
    reviewCount: 110,
    stock: 14,
    tags: ['LED Frame', 'Ambient Light', 'Backlit', 'Smart Control'],
    colors: [
      { name: 'Matte Stealth Black', hex: '#09090b' },
      { name: 'Anodized Silver', hex: '#e4e4e7' }
    ],
    sizes: ['18" x 24"', '24" x 36"'],
    sku: 'ZC-FRM-018',
    shippingBadge: 'Includes Type-C Braided Cable',
    isNew: true,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'LED Spec', value: '2700K - 4500K Dual Color Temperature' },
      { label: 'Power', value: 'USB Type-C 5V / 2A Input' },
    ],
  },
  {
    id: 'prod-19',
    slug: 'custom-neon-sign',
    title: 'Custom Flex LED Neon Sign',
    shortDescription: 'Hand-crafted silicone LED neon word sculpture on clear acrylic backing.',
    description: 'Make your studio tagline glow. Enter any word, quote, or brand text during checkout to receive your bespoke lightweight neon wall piece.',
    category: 'Personalized Items',
    categorySlug: 'personalized-items',
    collectionSlug: 'creative-studio',
    brand: 'ZeroCraft Custom',
    price: 189.00,
    originalPrice: 220.00,
    rating: 5.0,
    reviewCount: 86,
    stock: 8,
    tags: ['Custom Neon', 'LED Light', 'Wall Sign', 'Personalized'],
    colors: [
      { name: 'Warm White Glow', hex: '#fef08a' },
      { name: 'Cyber Pink Glow', hex: '#f43f5e' },
      { name: 'Electric Cyan Glow', hex: '#06b6d4' }
    ],
    sizes: ['Small (20" Wide)', 'Medium (36" Wide)', 'Large (48" Wide)'],
    sku: 'ZC-PRS-019',
    shippingBadge: 'Includes Dimmer Remote Control',
    isNew: false,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Lifespan', value: '50,000 Operating Hours' },
      { label: 'Backing', value: '8mm Ultra-Clear Shatterproof Acrylic' },
    ],
  },
  {
    id: 'prod-20',
    slug: 'sculptural-bookend',
    title: 'Heavy Solid Travertine Sculptural Bookends',
    shortDescription: 'Pair of raw honed Italian travertine limestone book supports.',
    description: 'Keep your design library anchored in style. Cut from natural porous beige travertine with hand-bevelled arch contours.',
    category: 'Desk Decor',
    categorySlug: 'desk-decor',
    collectionSlug: 'minimal-collection',
    brand: 'ZeroCraft Artisans',
    price: 95.00,
    originalPrice: 95.00,
    rating: 4.8,
    reviewCount: 42,
    stock: 11,
    tags: ['Travertine', 'Bookend', 'Marble', 'Sculptural'],
    colors: [
      { name: 'Honed Beige Travertine', hex: '#e7d8c9' },
      { name: 'Black Marquina Marble', hex: '#1c1917' }
    ],
    sizes: ['Pair (Set of 2)'],
    sku: 'ZC-DSK-020',
    shippingBadge: 'Heavy Item Freight Protection',
    isNew: true,
    isSale: false,
    images: [
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Weight', value: '3.8 kg (Set Total)' },
      { label: 'Bottom', value: 'Cork Protection Pads Pre-Applied' },
    ],
  },
  {
    id: 'prod-21',
    slug: 'engraved-wood-dock',
    title: 'Multi-Device Walnut Charging Stand',
    shortDescription: 'MagSafe compatible walnut wood stand with valet coin tray.',
    description: 'Streamline nightstand and desk cable mess. Houses iPhone, Apple Watch, AirPods, and fountain pens in carved solid walnut pockets.',
    category: 'Personalized Items',
    categorySlug: 'personalized-items',
    collectionSlug: 'workspace-collection',
    brand: 'ZeroCraft Custom',
    price: 68.00,
    originalPrice: 85.00,
    rating: 4.9,
    reviewCount: 140,
    stock: 24,
    tags: ['Docking Station', 'Walnut', 'MagSafe', 'Valet Tray'],
    colors: [
      { name: 'American Walnut', hex: '#451a03' },
      { name: 'White Ash', hex: '#e2e8f0' }
    ],
    sizes: ['Dual Charger Version', 'Triple Charger Version'],
    sku: 'ZC-PRS-021',
    shippingBadge: 'Ships Next Business Day',
    isNew: false,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Compatibility', value: 'MagSafe Puck & Apple Watch Charger Cutouts' },
    ],
  },
  {
    id: 'prod-22',
    slug: 'matte-black-water-bottle',
    title: 'Thermal Insulated Vacuum Water Bottle (750ml)',
    shortDescription: 'Powder-coated 18/8 stainless steel bottle with bamboo lid screw cap.',
    description: 'Keep water cold for 24 hours or coffee hot for 12 hours. Sweat-proof textured powder finish provides tactile grip during commutes.',
    category: 'Accessories',
    categorySlug: 'accessories',
    collectionSlug: 'workspace-collection',
    brand: 'ZeroCraft Studio',
    price: 36.00,
    originalPrice: 45.00,
    rating: 4.7,
    reviewCount: 205,
    stock: 35,
    tags: ['Water Bottle', 'Stainless Steel', 'Vacuum Insulated', 'Matte'],
    colors: [
      { name: 'Matte Obsidian', hex: '#0f172a' },
      { name: 'Chalk White', hex: '#f8fafc' },
      { name: 'Forest Moss', hex: '#14532d' }
    ],
    sizes: ['500ml', '750ml', '1000ml'],
    sku: 'ZC-ACC-022',
    shippingBadge: 'Free Standard Shipping',
    isNew: false,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Steel Grade', value: 'Food-Grade 18/8 Pro-Grade Stainless Steel' },
      { label: 'BPA Free', value: '100% Non-Toxic & Phthalate Free' },
    ],
  },
  {
    id: 'prod-23',
    slug: 'minimalist-wall-clock',
    title: 'Silent Sweep Nordic Wooden Wall Clock',
    shortDescription: '12" frameless natural oak clock face with sleek black hands.',
    description: 'No ticking sound to interrupt your concentration. Features a German quartz sweep movement for completely silent operation.',
    category: 'Wall Art',
    categorySlug: 'wall-art',
    collectionSlug: 'minimal-collection',
    brand: 'ZeroCraft Studio',
    price: 54.00,
    originalPrice: 65.00,
    rating: 4.9,
    reviewCount: 89,
    stock: 16,
    tags: ['Wall Clock', 'Silent Clock', 'Nordic Design', 'Oak Wood'],
    colors: [
      { name: 'Natural Oak', hex: '#d97706' },
      { name: 'Smoked Walnut', hex: '#3b0764' }
    ],
    sizes: ['10" Diameter', '12" Diameter', '16" Diameter'],
    sku: 'ZC-WLL-023',
    shippingBadge: 'Includes AA Battery',
    isNew: true,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Movement', value: 'Continuous Silent Sweep Quartz' },
    ],
  },
  {
    id: 'prod-24',
    slug: 'artisanal-candle-set',
    title: 'Botanical Soy Wax Scented Candle Trio',
    shortDescription: 'Hand-poured soy candles in amber glass jars with wood wick crackle.',
    description: 'Create an inviting atmosphere. Notes of Amber & Cedarwood, Hinoki Cypress, and White Tea. Hand-poured with 100% natural soy wax.',
    category: 'Customized Gifts',
    categorySlug: 'customized-gifts',
    collectionSlug: 'birthday-gifts',
    brand: 'ZeroCraft Artisans',
    price: 48.00,
    originalPrice: 60.00,
    rating: 5.0,
    reviewCount: 168,
    stock: 26,
    tags: ['Soy Candle', 'Wood Wick', 'Aromatherapy', 'Gift Set'],
    colors: [
      { name: 'Amber Glass', hex: '#92400e' }
    ],
    sizes: ['Set of 3 Jars (8 oz each)'],
    sku: 'ZC-GFT-024',
    shippingBadge: 'Includes Custom Matchbox',
    isNew: false,
    isSale: true,
    images: [
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1200&auto=format&fit=crop',
    ],
    specifications: [
      { label: 'Burn Time', value: '45 Hours Per Candle (135 Hours Total)' },
      { label: 'Wick', value: 'Cracking Organic FSC Wood Wick' },
    ],
  },
];

export const REVIEWS: Review[] = [
  {
    id: 'rev-1',
    author: 'Alexander Wright',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    rating: 5,
    date: 'August 2, 2026',
    title: 'Exceeded every single expectation!',
    content: 'The Minimal Mountain Poster arrived in pristine condition. The Japanese cotton paper has a tactile texture that makes it look like an authentic original museum artwork.',
    productName: 'Minimal Mountain Poster',
    verified: true,
  },
  {
    id: 'rev-2',
    author: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    rating: 5,
    date: 'July 28, 2026',
    title: 'Solid oak quality is unmatched',
    content: 'Bought two solid oak frames for our living room wall. The dovetail corner joints and beeswax finish give it a warm Scandinavian aesthetic.',
    productName: 'Solid Oak Wooden Photo Frame',
    verified: true,
  },
  {
    id: 'rev-3',
    author: 'Marcus Chen',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    rating: 5,
    date: 'July 21, 2026',
    title: 'Absolute game changer for my desk setup',
    content: 'The Merino wool felt desk mat completely transformed my remote workspace. High speed mouse glide and zero synthetic odor.',
    productName: 'Ultra-Smooth Felt Desk & Gaming Mat',
    verified: true,
  },
  {
    id: 'rev-4',
    author: 'Sophia Martinez',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    rating: 5,
    date: 'July 15, 2026',
    title: 'The leather smells incredible',
    content: 'The Horween leather journal cover develops a dark rich sheen with daily usage. Fountain pen ink flows without any ghosting.',
    productName: 'Heritage Leather Bound Journal',
    verified: true,
  },
  {
    id: 'rev-5',
    author: 'David Vance',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=200&auto=format&fit=crop',
    rating: 5,
    date: 'July 10, 2026',
    title: 'Super fast delivery and bespoke packaging',
    content: 'Unboxing ZeroCraft products feels like receiving a luxury timepiece. Everything from tissue paper to engraved gift box is top tier.',
    productName: 'Luxury Monogrammed Wooden Gift Box',
    verified: true,
  },
  {
    id: 'rev-6',
    author: 'Claire Sterling',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
    rating: 5,
    date: 'June 29, 2026',
    title: 'Stunning backlighting!',
    content: 'The ambient LED art frame lights up automatically in the evening. Guests continuously ask where I ordered it from!',
    productName: 'Backlit Glow Acrylic Art Frame',
    verified: true,
  },
  {
    id: 'rev-7',
    author: 'Julian Thorne',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
    rating: 4,
    date: 'June 22, 2026',
    title: 'Weighted pen with smooth ink refill',
    content: 'Solid brass body has substantial weight in hand. Writing letters is a joy again.',
    productName: 'Heavyweight Solid Brass Rollerball Pen',
    verified: true,
  },
  {
    id: 'rev-8',
    author: 'Hannah Abbott',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
    rating: 5,
    date: 'June 18, 2026',
    title: 'Pure architectural beauty',
    content: 'The travertine stone bookends are extremely heavy and support all my architectural coffee table books without slipping.',
    productName: 'Heavy Solid Travertine Sculptural Bookends',
    verified: true,
  },
  {
    id: 'rev-9',
    author: 'Vikram Mehta',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop',
    rating: 5,
    date: 'June 12, 2026',
    title: 'Custom neon glowing tagline looks epic',
    content: 'Installed in our video editing booth. Brightness remote dimming works seamlessly with our lighting rig.',
    productName: 'Custom Flex LED Neon Sign',
    verified: true,
  },
  {
    id: 'rev-10',
    author: 'Aria Takahashi',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    rating: 5,
    date: 'June 05, 2026',
    title: 'Relaxing wood wick candle crackle',
    content: 'The Amber & Cedarwood candle fills the entire studio room with a subtle woodsy scent. Zero artificial perfume headaches.',
    productName: 'Artisanal Candle Set',
    verified: true,
  },
];

export const INSTAGRAM_IMAGES = [
  {
    id: 'ig-1',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=800&auto=format&fit=crop',
    likes: '1.4k',
    comments: '42',
    tag: '@zerocraft.store',
  },
  {
    id: 'ig-2',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=800&auto=format&fit=crop',
    likes: '2.8k',
    comments: '89',
    tag: '@zerocraft.store',
  },
  {
    id: 'ig-3',
    image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=800&auto=format&fit=crop',
    likes: '950',
    comments: '23',
    tag: '@zerocraft.store',
  },
  {
    id: 'ig-4',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=800&auto=format&fit=crop',
    likes: '3.1k',
    comments: '112',
    tag: '@zerocraft.store',
  },
  {
    id: 'ig-5',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop',
    likes: '1.9k',
    comments: '54',
    tag: '@zerocraft.store',
  },
  {
    id: 'ig-6',
    image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=800&auto=format&fit=crop',
    likes: '2.2k',
    comments: '67',
    tag: '@zerocraft.store',
  },
  {
    id: 'ig-7',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800&auto=format&fit=crop',
    likes: '4.5k',
    comments: '180',
    tag: '@zerocraft.store',
  },
  {
    id: 'ig-8',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop',
    likes: '1.1k',
    comments: '31',
    tag: '@zerocraft.store',
  },
];

export const DUMMY_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: 'ZC-88492',
    date: 'August 04, 2026',
    status: 'Delivered',
    timeline: [
      { step: 'Order Placed', timestamp: 'Aug 04, 09:30 AM', completed: true },
      { step: 'Payment Confirmed', timestamp: 'Aug 04, 09:31 AM', completed: true },
      { step: 'Crafted & Packaged', timestamp: 'Aug 05, 02:15 PM', completed: true },
      { step: 'Shipped via Express', timestamp: 'Aug 05, 06:00 PM', completed: true },
      { step: 'Delivered', timestamp: 'Aug 07, 11:20 AM', completed: true },
    ],
    items: [
      {
        id: 'oi-1',
        productId: 'prod-1',
        title: 'Minimal Mountain Poster',
        image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=400&auto=format&fit=crop',
        price: 34.00,
        quantity: 1,
        color: 'Warm Cream',
        size: '18" x 24"',
      },
      {
        id: 'oi-2',
        productId: 'prod-8',
        title: 'Ultra-Smooth Felt Desk & Gaming Mat',
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=400&auto=format&fit=crop',
        price: 42.00,
        quantity: 1,
        color: 'Dark Graphite',
        size: 'Large (900x400mm)',
      },
    ],
    subtotal: 76.00,
    discount: 10.00,
    shippingFee: 0.00,
    tax: 6.08,
    total: 72.08,
    shippingAddress: {
      fullName: 'Julian Vance',
      street: '742 Design Avenue, Suite 400',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94107',
      country: 'United States',
      phone: '+1 (555) 392-0192',
    },
    paymentMethod: 'Apple Pay (•••• 4920)',
  },
  {
    id: 'ord-1002',
    orderNumber: 'ZC-88430',
    date: 'August 06, 2026',
    status: 'Shipped',
    timeline: [
      { step: 'Order Placed', timestamp: 'Aug 06, 03:45 PM', completed: true },
      { step: 'Payment Confirmed', timestamp: 'Aug 06, 03:46 PM', completed: true },
      { step: 'Crafted & Packaged', timestamp: 'Aug 07, 10:00 AM', completed: true },
      { step: 'Shipped via Express', timestamp: 'Aug 07, 02:30 PM', completed: true },
      { step: 'Out for Delivery', timestamp: 'Est. Aug 08', completed: false },
    ],
    items: [
      {
        id: 'oi-3',
        productId: 'prod-5',
        title: 'Heritage Leather Bound Journal',
        image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400&auto=format&fit=crop',
        price: 52.00,
        quantity: 1,
        color: 'Saddle Tan',
        size: 'A5 (5.8" x 8.3")',
      },
    ],
    subtotal: 52.00,
    discount: 0.00,
    shippingFee: 5.00,
    tax: 4.16,
    total: 61.16,
    shippingAddress: {
      fullName: 'Julian Vance',
      street: '742 Design Avenue, Suite 400',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94107',
      country: 'United States',
      phone: '+1 (555) 392-0192',
    },
    paymentMethod: 'Credit Card (Visa •••• 8812)',
  },
  {
    id: 'ord-1003',
    orderNumber: 'ZC-87910',
    date: 'July 18, 2026',
    status: 'Processing',
    timeline: [
      { step: 'Order Placed', timestamp: 'Jul 18, 11:10 AM', completed: true },
      { step: 'Payment Confirmed', timestamp: 'Jul 18, 11:11 AM', completed: true },
      { step: 'Engraving & Assembly', timestamp: 'In Progress', completed: false },
      { step: 'Shipped', timestamp: 'Pending', completed: false },
      { step: 'Delivered', timestamp: 'Pending', completed: false },
    ],
    items: [
      {
        id: 'oi-4',
        productId: 'prod-15',
        title: 'Heavyweight Solid Brass Rollerball Pen',
        image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
        price: 58.00,
        quantity: 2,
        color: 'Raw Brass',
      },
    ],
    subtotal: 116.00,
    discount: 11.60,
    shippingFee: 0.00,
    tax: 9.28,
    total: 113.68,
    shippingAddress: {
      fullName: 'Julian Vance',
      street: '742 Design Avenue, Suite 400',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94107',
      country: 'United States',
      phone: '+1 (555) 392-0192',
    },
    paymentMethod: 'UPI (vance@upi)',
  },
];
