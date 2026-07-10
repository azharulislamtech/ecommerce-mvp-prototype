import "server-only";

import { createSupabaseAuthServerClient } from "./auth";
import { createSupabasePublicServerClient, hasSupabasePublicConfig } from "./server";
import type { Database, ReviewStatus } from "./database.types";

type ProductReviewRow = Database["public"]["Tables"]["product_reviews"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

export type PublicProductReview = Database["public"]["Functions"]["get_public_product_reviews"]["Returns"][number];

export type ProductReviewData = {
  summary: {
    reviewCount: number;
    averageRating: number | null;
  };
  reviews: PublicProductReview[];
};

export type AdminProductReview = ProductReviewRow & {
  product: Pick<ProductRow, "id" | "name" | "slug"> | null;
  order: Pick<OrderRow, "order_number"> | null;
};

export async function getProductReviewData(productId: string): Promise<ProductReviewData> {
  if (!hasSupabasePublicConfig()) {
    return {
      summary: { reviewCount: 0, averageRating: null },
      reviews: []
    };
  }

  const supabase = createSupabasePublicServerClient();
  const [{ data: summaryRows, error: summaryError }, { data: reviews, error: reviewsError }] = await Promise.all([
    supabase.rpc("get_product_review_summary", { p_product_id: productId }),
    supabase.rpc("get_public_product_reviews", { p_product_id: productId })
  ]);

  if (summaryError || reviewsError) {
    console.error("Failed to load product reviews: " + (summaryError?.message ?? reviewsError?.message));
    return {
      summary: { reviewCount: 0, averageRating: null },
      reviews: []
    };
  }

  const summary = summaryRows?.[0];

  return {
    summary: {
      reviewCount: Number(summary?.review_count ?? 0),
      averageRating: summary?.average_rating === null || summary?.average_rating === undefined ? null : Number(summary.average_rating)
    },
    reviews: reviews ?? []
  };
}

export async function getAdminProductReviews(status?: string): Promise<AdminProductReview[]> {
  const supabase = createSupabaseAuthServerClient();
  let query = supabase
    .from("product_reviews")
    .select(
      "*, product:products!product_reviews_product_id_fkey (id, name, slug), " +
        "order:orders!product_reviews_order_id_fkey (order_number)"
    )
    .order("created_at", { ascending: false });

  if (status && (["pending", "approved", "rejected"] as ReviewStatus[]).includes(status as ReviewStatus)) {
    query = query.eq("status", status as ReviewStatus);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Failed to load product reviews: " + error.message);
  }

  return (data ?? []) as unknown as AdminProductReview[];
}
