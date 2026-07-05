import "server-only";

import {
  createSupabasePublicServerClient,
  hasSupabasePublicConfig
} from "./server";
import type { CategoryRow, ProductImageRow, ProductRow } from "./database.types";

export type CatalogProduct = ProductRow & {
  category: Pick<CategoryRow, "id" | "name" | "slug"> | null;
  images: ProductImageRow[];
};

type ProductImageSelection = Pick<ProductImageRow, "id" | "image_url" | "alt_text" | "sort_order" | "created_at">;

type ProductSelection = ProductRow & {
  categories: Pick<CategoryRow, "id" | "name" | "slug"> | null;
  product_images: ProductImageSelection[] | null;
};

function mapProduct(row: ProductSelection): CatalogProduct {
  const { categories, product_images: productImages, ...product } = row;

  return {
    ...product,
    category: categories,
    images: (productImages ?? []).map((image) => ({
      ...image,
      product_id: product.id
    }))
  };
}

export async function getActiveCategories() {
  if (!hasSupabasePublicConfig()) {
    return [] satisfies CategoryRow[];
  }

  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load categories: ${error.message}`);
  }

  return data;
}

export async function getActiveProducts() {
  if (!hasSupabasePublicConfig()) {
    return [] satisfies CatalogProduct[];
  }

  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      categories:category_id (
        id,
        name,
        slug
      ),
      product_images (
        id,
        image_url,
        alt_text,
        sort_order,
        created_at
      )
    `
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load products: ${error.message}`);
  }

  return (data as ProductSelection[]).map(mapProduct);
}

export async function getFeaturedProducts(limit = 8) {
  const products = await getActiveProducts();

  return products.filter((product) => product.is_featured).slice(0, limit);
}

export async function getProductBySlug(slug: string) {
  if (!hasSupabasePublicConfig()) {
    return null;
  }

  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      categories:category_id (
        id,
        name,
        slug
      ),
      product_images (
        id,
        image_url,
        alt_text,
        sort_order,
        created_at
      )
    `
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load product ${slug}: ${error.message}`);
  }

  return data ? mapProduct(data as ProductSelection) : null;
}
