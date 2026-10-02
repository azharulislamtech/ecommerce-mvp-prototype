import "server-only";

import { createSupabaseAuthServerClient } from "./auth";
import type { CategoryRow, Database, ProductImageRow, ProductRow } from "./database.types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

type DashboardOrderRow = Pick<
  OrderRow,
  "order_number" | "customer_name" | "total_amount" | "payment_status" | "order_status" | "created_at"
>;

type PaidRevenueRow = Pick<OrderRow, "total_amount">;

type DashboardProductSelection = Pick<ProductRow, "id" | "name" | "stock_quantity" | "is_active"> & {
  categories: Pick<CategoryRow, "name" | "slug"> | null;
  product_images: Pick<ProductImageRow, "image_url" | "alt_text" | "sort_order">[] | null;
};

export type AdminDashboardOverview = {
  stats: {
    totalOrders: number;
    pendingOrders: number;
    paidOrders: number;
    paidRevenue: number;
    totalProducts: number;
  };
  recentOrders: DashboardOrderRow[];
  lowStockProducts: Array<{
    id: string;
    name: string;
    stockQuantity: number;
    isActive: boolean;
    categoryName: string;
    categorySlug: string | null;
    imageUrl: string | null;
    imageAlt: string | null;
  }>;
};

function sumPaidRevenue(rows: PaidRevenueRow[]) {
  return rows.reduce((total, order) => total + Number(order.total_amount), 0);
}

function mapLowStockProduct(product: DashboardProductSelection) {
  const sortedImages = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const primaryImage = sortedImages[0] ?? null;

  return {
    id: product.id,
    name: product.name,
    stockQuantity: product.stock_quantity,
    isActive: product.is_active,
    categoryName: product.categories?.name ?? "Uncategorized",
    categorySlug: product.categories?.slug ?? null,
    imageUrl: primaryImage?.image_url ?? null,
    imageAlt: primaryImage?.alt_text ?? product.name
  };
}

function assertDashboardQuery<T>(label: string, result: { data: T | null; error: { message: string } | null }) {
  if (result.error) {
    throw new Error(`Failed to load ${label}: ${result.error.message}`);
  }

  return result.data;
}

function assertDashboardCount(label: string, result: { count: number | null; error: { message: string } | null }) {
  if (result.error) {
    throw new Error(`Failed to load ${label}: ${result.error.message}`);
  }

  return result.count ?? 0;
}

export async function getAdminDashboardOverview(): Promise<AdminDashboardOverview> {
  const supabase = await createSupabaseAuthServerClient();

  const [
    totalOrderCountResult,
    pendingOrderCountResult,
    paidOrderCountResult,
    paidRevenueResult,
    recentOrdersResult,
    lowStockProductsResult,
    productCountResult
  ] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "pending"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "paid"),
    supabase.from("orders").select("total_amount").eq("payment_status", "paid"),
    supabase
      .from("orders")
      .select("order_number,customer_name,total_amount,payment_status,order_status,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("products")
      .select(
        `
        id,
        name,
        stock_quantity,
        is_active,
        categories:category_id (
          name,
          slug
        ),
        product_images (
          image_url,
          alt_text,
          sort_order
        )
      `
      )
      .lte("stock_quantity", 8)
      .order("stock_quantity", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("products").select("id", { count: "exact", head: true })
  ]);

  const paidRevenueRows = assertDashboardQuery("paid revenue", paidRevenueResult) ?? [];
  const recentOrders = assertDashboardQuery("recent orders", recentOrdersResult) ?? [];
  const lowStockProducts = assertDashboardQuery("low-stock products", lowStockProductsResult) ?? [];

  return {
    stats: {
      totalOrders: assertDashboardCount("order count", totalOrderCountResult),
      pendingOrders: assertDashboardCount("pending order count", pendingOrderCountResult),
      paidOrders: assertDashboardCount("paid order count", paidOrderCountResult),
      paidRevenue: sumPaidRevenue(paidRevenueRows),
      totalProducts: assertDashboardCount("product count", productCountResult)
    },
    recentOrders,
    lowStockProducts: (lowStockProducts as DashboardProductSelection[]).map(mapLowStockProduct)
  };
}