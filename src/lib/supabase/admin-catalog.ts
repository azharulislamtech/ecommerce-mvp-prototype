import "server-only";

import { createSupabaseAuthServerClient } from "./auth";
import type { CategoryRow, ProductImageRow, ProductRow } from "./database.types";

export type AdminProduct = ProductRow & {
  category: Pick<CategoryRow, "id" | "name" | "slug"> | null;
  images: ProductImageRow[];
};

export type AdminProductFilters = {
  q?: string;
  status?: string;
};

type ProductImageSelection = Pick<ProductImageRow, "id" | "product_id" | "image_url" | "alt_text" | "sort_order" | "created_at">;

type ProductSelection = ProductRow & {
  categories: Pick<CategoryRow, "id" | "name" | "slug"> | null;
  product_images: ProductImageSelection[] | null;
};

function mapProduct(row: ProductSelection): AdminProduct {
  const { categories, product_images: productImages, ...product } = row;

  return {
    ...product,
    category: categories,
    images: productImages ?? []
  };
}

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function matchesSearch(product: AdminProduct, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    product.name,
    product.slug,
    product.short_description,
    product.description,
    product.category?.name,
    product.category?.slug
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export async function getAdminCategories() {
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load admin categories: ${error.message}`);
  }

  return data;
}

export async function getAdminProducts(filters: AdminProductFilters = {}) {
  const supabase = await createSupabaseAuthServerClient();
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
        product_id,
        image_url,
        alt_text,
        sort_order,
        created_at
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load admin products: ${error.message}`);
  }

  const query = normalize(filters.q);
  const status = normalize(filters.status);

  return (data as ProductSelection[])
    .map(mapProduct)
    .filter((product) => matchesSearch(product, query))
    .filter((product) => {
      if (status === "active") {
        return product.is_active;
      }

      if (status === "inactive") {
        return !product.is_active;
      }

      return true;
    });
}

export async function getAdminProductById(id: string) {
  const supabase = await createSupabaseAuthServerClient();
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
        product_id,
        image_url,
        alt_text,
        sort_order,
        created_at
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load admin product ${id}: ${error.message}`);
  }

  return data ? mapProduct(data as ProductSelection) : null;
}
