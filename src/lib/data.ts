import { DEFAULT_DELIVERY_CHARGE, districts } from "./delivery";

export type ProductVisual = "electronics" | "fashion" | "home" | "beauty" | "accessories";

export type ProductImage = {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  price: number;
  oldPrice?: number;
  stock: number;
  featured: boolean;
  imageAlt?: string;
  imageUrl?: string;
  images?: ProductImage[];
  visual: ProductVisual;
  specs: string[];
};

export type Order = {
  id: string;
  customer: string;
  phone: string;
  total: number;
  paymentStatus: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  orderStatus: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
};

export const categories = [
  {
    name: "Electronics",
    slug: "electronics",
    description: "Smart everyday gadgets",
    visual: "electronics" as ProductVisual
  },
  {
    name: "Fashion",
    slug: "fashion",
    description: "Minimal wear and bags",
    visual: "fashion" as ProductVisual
  },
  {
    name: "Home & Living",
    slug: "home-living",
    description: "Useful pieces for home",
    visual: "home" as ProductVisual
  },
  {
    name: "Beauty",
    slug: "beauty",
    description: "Daily care essentials",
    visual: "beauty" as ProductVisual
  },
  {
    name: "Accessories",
    slug: "accessories",
    description: "Simple upgrades",
    visual: "accessories" as ProductVisual
  }
];

export const products: Product[] = [
  {
    id: "p-101",
    slug: "aurora-wireless-earbuds",
    name: "Aurora Wireless Earbuds",
    category: "Electronics",
    shortDescription: "Clear calls, compact case, and all-day comfort.",
    description:
      "A lightweight audio essential for everyday calls, music, and travel. The compact charging case fits small bags and pockets.",
    price: 3490,
    oldPrice: 4290,
    stock: 18,
    featured: true,
    visual: "electronics",
    specs: ["Bluetooth 5.3", "24 hour total battery", "USB-C charging", "Touch controls"]
  },
  {
    id: "p-102",
    slug: "luna-everyday-handbag",
    name: "Luna Everyday Handbag",
    category: "Fashion",
    shortDescription: "Structured profile with practical inner pockets.",
    description:
      "A clean everyday handbag with a structured silhouette, smooth finish, and enough space for daily essentials.",
    price: 2450,
    oldPrice: 2990,
    stock: 11,
    featured: true,
    visual: "fashion",
    specs: ["Vegan leather", "Adjustable strap", "Three inner pockets", "Magnetic closure"]
  },
  {
    id: "p-103",
    slug: "calm-ceramic-diffuser",
    name: "Calm Ceramic Diffuser",
    category: "Home & Living",
    shortDescription: "Soft mist diffuser for bedrooms and work desks.",
    description:
      "A quiet ceramic diffuser with a clean shape and gentle ambient light for relaxing home corners.",
    price: 1890,
    stock: 8,
    featured: true,
    visual: "home",
    specs: ["220ml capacity", "Auto shut-off", "Warm light mode", "Quiet operation"]
  },
  {
    id: "p-104",
    slug: "pure-glow-serum",
    name: "Pure Glow Serum",
    category: "Beauty",
    shortDescription: "Lightweight daily serum with a smooth finish.",
    description:
      "A quick-absorbing serum designed for a simple daily routine. The formula leaves a soft, non-sticky finish.",
    price: 1290,
    oldPrice: 1590,
    stock: 24,
    featured: true,
    visual: "beauty",
    specs: ["30ml bottle", "Light texture", "Daily use", "No heavy fragrance"]
  },
  {
    id: "p-105",
    slug: "orbit-smart-watch",
    name: "Orbit Smart Watch",
    category: "Accessories",
    shortDescription: "Fitness, calls, and notifications in one clean watch.",
    description:
      "A modern smartwatch for tracking daily activity, checking calls, and keeping notifications visible.",
    price: 3990,
    oldPrice: 4890,
    stock: 6,
    featured: false,
    visual: "accessories",
    specs: ["1.8 inch display", "Heart-rate monitor", "IP68 splash resistance", "7 day battery"]
  },
  {
    id: "p-106",
    slug: "softline-cotton-throw",
    name: "Softline Cotton Throw",
    category: "Home & Living",
    shortDescription: "Breathable textured throw for sofas and beds.",
    description:
      "A soft cotton throw that adds warmth and texture without making the room feel busy.",
    price: 1690,
    stock: 15,
    featured: false,
    visual: "home",
    specs: ["100% cotton", "Machine washable", "Textured weave", "130 x 170 cm"]
  }
];

export const cartItems = [
  { product: products[0], quantity: 1 },
  { product: products[3], quantity: 2 }
];

export const deliveryCharge = DEFAULT_DELIVERY_CHARGE;

export const cartSubtotal = cartItems.reduce(
  (total, item) => total + item.product.price * item.quantity,
  0
);

export const cartDiscount = 120;

export const cartTotal = cartSubtotal + deliveryCharge - cartDiscount;

export const orders: Order[] = [
  {
    id: "SP-1028",
    customer: "Nusrat Jahan",
    phone: "01712000000",
    total: 6150,
    paymentStatus: "paid",
    orderStatus: "confirmed",
    createdAt: "26 Jun 2026"
  },
  {
    id: "SP-1027",
    customer: "Tanvir Hasan",
    phone: "01822000000",
    total: 3490,
    paymentStatus: "pending",
    orderStatus: "pending",
    createdAt: "26 Jun 2026"
  },
  {
    id: "SP-1026",
    customer: "Maliha Rahman",
    phone: "01933000000",
    total: 1890,
    paymentStatus: "paid",
    orderStatus: "processing",
    createdAt: "25 Jun 2026"
  },
  {
    id: "SP-1025",
    customer: "Arif Mahmud",
    phone: "01644000000",
    total: 1290,
    paymentStatus: "failed",
    orderStatus: "cancelled",
    createdAt: "25 Jun 2026"
  }
];


export { districts };


export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0
  }).format(amount);
}

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getOrderById(id: string) {
  return orders.find((order) => order.id === id);
}
