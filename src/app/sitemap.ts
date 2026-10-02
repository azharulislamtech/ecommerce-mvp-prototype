import type { MetadataRoute } from "next";
import { getStoreProducts, getStoreCategories } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [products, categories] = await Promise.all([getStoreProducts(), getStoreCategories()]);

  const staticRoutes = ["", "/products", "/privacy-policy", "/terms", "/return-policy"].map(
    (path) => ({
      url: siteUrl + path,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.6
    })
  );

  const productRoutes = products.map((product) => ({
    url: siteUrl + "/products/" + product.slug,
    ...(product.updatedAt ? { lastModified: new Date(product.updatedAt) } : {}),
    changeFrequency: "daily" as const,
    priority: 0.8
  }));

  return [...staticRoutes, ...productRoutes, ...categories.map((category) => ({ url: `${siteUrl}/categories/${category.slug}` }))];
}
