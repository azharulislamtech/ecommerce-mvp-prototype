import "server-only";

import {
  categories as mockCategories,
  getProductBySlug as getMockProductBySlug,
  products as mockProducts,
  type Product,
  type ProductImage,
  type ProductVisual
} from "@/lib/data";
import {
  getActiveCategories as getSupabaseCategories,
  getActiveProducts as getSupabaseProducts,
  getProductBySlug as getSupabaseProductBySlug,
  type CatalogProduct
} from "@/lib/supabase/catalog";
import { hasSupabasePublicConfig } from "@/lib/supabase/server";
import { getUnavailableProduct as getSupabaseUnavailableProduct } from "@/lib/supabase/catalog";
import { STATE_RANK, storefrontState } from "@/lib/storefront-state";
import { searchProducts } from "@/lib/search";
import type { CategoryRow } from "@/lib/supabase/database.types";

// R5.1: section and parent let a category page show its sub-categories and filters.
export type StoreCategory = (typeof mockCategories)[number] & { section?: "kids" | "home"; parentSlug?: string };

export type CatalogFilters = {
  q?: string;
  category?: string;
  price?: string;
  sort?: string;
  // R2.1: header menu links filter by section and by "শীঘ্রই আসছে".
  section?: string;
  availability?: string;
  // R3.1: a homepage problem card links to its tag.
  tag?: string;
};

const visualByCategorySlug: Record<string, ProductVisual> = {
  electronics: "electronics",
  fashion: "fashion",
  "home-living": "home",
  beauty: "beauty",
  accessories: "accessories"
};

const fallbackVisuals: ProductVisual[] = ["electronics", "fashion", "home", "beauty", "accessories"];

function visualFromSlug(slug: string | null | undefined): ProductVisual {
  if (!slug) {
    return "accessories";
  }

  if (visualByCategorySlug[slug]) {
    return visualByCategorySlug[slug];
  }

  const index = Math.abs(
    slug.split("").reduce((total, character) => total + character.charCodeAt(0), 0)
  ) % fallbackVisuals.length;

  return fallbackVisuals[index];
}

function mapCategory(row: CategoryRow, slugById: Map<string, string>): StoreCategory {
  return {
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    visual: visualFromSlug(row.slug),
    section: row.section ?? undefined,
    parentSlug: row.parent_id ? slugById.get(row.parent_id) : undefined
  };
}

function mapProduct(row: CatalogProduct): Product | null {
  const state = storefrontState({
    isActive: row.is_active,
    availability: row.availability,
    stock: row.stock_quantity,
    firstStockedAt: row.first_stocked_at
  });
  if (state === "hidden") return null;

  const fallback = mockProducts.find((product) => product.slug === row.slug);
  const categoryName = row.category?.name ?? fallback?.category ?? "General";
  const categorySlug = row.category?.slug ?? fallback?.category.toLowerCase().replace(/\s+/g, "-");
  const hasDiscount = row.discount_price !== null && row.discount_price < row.price;
  const images: ProductImage[] = [...row.images]
    .sort((left, right) => left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at))
    .map((image) => ({
      id: image.id,
      url: image.image_url,
      alt: image.alt_text ?? row.name,
      sortOrder: image.sort_order
    }));
  const primaryImage = images[0];

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: categoryName,
    categorySlug: row.category?.slug,
    section: row.category?.section ?? undefined,
    problemTags: row.problem_tags ?? [],
    learningGoals: row.learning_goals ?? [],
    videoUrl: row.video_url ?? undefined,
    updatedAt: row.updated_at,
    shortDescription: row.short_description ?? fallback?.shortDescription ?? "A carefully selected product.",
    description: row.description ?? fallback?.description ?? "More product details will be available soon.",
    price: hasDiscount ? row.discount_price! : row.price,
    oldPrice: hasDiscount ? row.price : undefined,
    stock: row.stock_quantity,
    state,
    estimatedPrice: row.estimated_price ?? undefined,
    ageMinMonths: row.age_min_months ?? undefined,
    ageMaxMonths: row.age_max_months ?? undefined,
    featured: row.is_featured,
    imageAlt: primaryImage?.alt,
    imageUrl: primaryImage?.url,
    images,
    visual: fallback?.visual ?? visualFromSlug(categorySlug),
    specs: []
  };
}

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function applyFilters(products: Product[], filters: CatalogFilters = {}) {
  const query = normalize(filters.q);
  const category = normalize(filters.category);
  const price = normalize(filters.price);
  const sort = normalize(filters.sort);
  const section = normalize(filters.section);
  const availability = normalize(filters.availability);
  const tag = normalize(filters.tag);

  let result = [...products];

  // R2.10: Bangla and English search over name, category, section, problems and goals.
  if (query) {
    result = searchProducts(result, query);
  }

  if (section === "kids" || section === "home") {
    result = result.filter((product) => product.section === section);
  }

  if (availability === "coming_soon" || availability === "in_stock") {
    result = result.filter((product) => product.state === availability);
  }

  if (tag) {
    result = result.filter((product) => product.problemTags?.includes(tag));
  }

  if (category) {
    result = result.filter((product) => product.categorySlug === category || product.category.toLowerCase().replace(/\s+/g, "-").replace("&", "").replace(/--+/g, "-") === category || product.category.toLowerCase() === category);
  }

  // A coming-soon product has no confirmed price, so price filters and price sorting skip it.
  if (price) {
    result = result.filter((product) => product.state !== "coming_soon");
  }

  if (price === "under-1500") {
    result = result.filter((product) => product.price < 1500);
  } else if (price === "1500-3000") {
    result = result.filter((product) => product.price >= 1500 && product.price <= 3000);
  } else if (price === "over-3000") {
    result = result.filter((product) => product.price > 3000);
  }

  const comingSoonLast = (left: Product, right: Product) =>
    Number(left.state === "coming_soon") - Number(right.state === "coming_soon");

  if (sort === "price-asc") {
    result.sort((left, right) => comingSoonLast(left, right) || left.price - right.price);
  } else if (sort === "price-desc") {
    result.sort((left, right) => comingSoonLast(left, right) || right.price - left.price);
  } else if (sort === "offers") {
    result.sort((left, right) => Number(Boolean(right.oldPrice)) - Number(Boolean(left.oldPrice)));
  } else {
    // Default: what can be bought first, then coming soon, then stock ended (stable).
    result.sort((left, right) => STATE_RANK[left.state] - STATE_RANK[right.state]);
  }

  return result;
}

function requireCatalogConfig() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_CATALOG !== "true") {
    throw new Error("Production catalog configuration is missing.");
  }
}

export async function getStoreCategories(): Promise<StoreCategory[]> {
  if (!hasSupabasePublicConfig()) {
    requireCatalogConfig();
    return mockCategories;
  }

  const categories = await getSupabaseCategories();
  const slugById = new Map(categories.map((row) => [row.id, row.slug]));
  return categories.map((row) => mapCategory(row, slugById));
}

export async function getStoreProducts(filters: CatalogFilters = {}) {
  if (!hasSupabasePublicConfig()) {
    requireCatalogConfig();
    return applyFilters(mockProducts, filters);
  }

  const products = await getSupabaseProducts();
  return applyFilters(products.map(mapProduct).filter((product): product is Product => product !== null), filters);
}

export type StoreNav = {
  kids: boolean;
  home: boolean;
  comingSoon: boolean;
  kidsCategories: { slug: string; name: string }[];
};

const EMPTY_NAV: StoreNav = { kids: false, home: false, comingSoon: false, kidsCategories: [] };

// R2.1: a menu link appears only when something real is behind it: a section needs at
// least one in-stock product, "শীঘ্রই আসছে" at least one coming-soon product. A catalog
// error must not break every page, so it falls back to the plain menu.
export async function getStoreNav(): Promise<StoreNav> {
  try {
    const products = await getStoreProducts();
    const inStock = products.filter((product) => product.state === "in_stock");
    const kidsCategories = new Map<string, string>();
    for (const product of inStock) {
      if (product.section === "kids" && product.categorySlug) kidsCategories.set(product.categorySlug, product.category);
    }
    return {
      kids: inStock.some((product) => product.section === "kids"),
      home: inStock.some((product) => product.section === "home"),
      comingSoon: products.some((product) => product.state === "coming_soon"),
      kidsCategories: [...kidsCategories].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name, "bn"))
    };
  } catch (error) {
    console.error("Store navigation fell back to the plain menu: " + (error instanceof Error ? error.message : String(error)));
    return EMPTY_NAV;
  }
}

// Only in-stock products can go in the cart or checkout (R2.3).
export async function getStorePurchasableProducts() {
  const products = await getStoreProducts();
  return products.filter((product) => product.state === "in_stock");
}

// R2.3 / R1.9: name of a real product that is now hidden, for the "এখন পাওয়া যাচ্ছে না" page.
// Dummy or never-stocked rows return null, so their links stay 404.
export async function getStoreUnavailableProduct(slug: string) {
  if (!hasSupabasePublicConfig()) return null;
  return getSupabaseUnavailableProduct(slug);
}

export async function getStoreFeaturedProducts(limit = 8) {
  const products = await getStoreProducts();
  return products.filter((product) => product.featured && product.state === "in_stock").slice(0, limit);
}

export async function getStoreProductBySlug(slug: string) {
  if (!hasSupabasePublicConfig()) {
    requireCatalogConfig();
    return getMockProductBySlug(slug) ?? null;
  }

  const product = await getSupabaseProductBySlug(slug);
  return product ? mapProduct(product) : null;
}

export async function getStoreRelatedProducts(product: Product, limit = 3) {
  // Alternatives are always something the customer can buy now.
  const products = await getStorePurchasableProducts();
  const sameCategory = products.filter((item) => item.id !== product.id && item.category === product.category);
  const otherProducts = products.filter((item) => item.id !== product.id && item.category !== product.category);

  return [...sameCategory, ...otherProducts].slice(0, limit);
}

