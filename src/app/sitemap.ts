import type { MetadataRoute } from "next";
import { getStoreProducts, getStoreCategories } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site";

// Rendered on every request. With `revalidate = 3600` the production sitemap stayed
// a Vercel cache HIT for over 24 hours and kept listing deactivated products, because
// a catalog change made directly in the database never triggers the admin's
// revalidatePath. The sitemap is two small queries and is requested mostly by
// crawlers, so request-time rendering is cheap and always reflects the catalog.
export const dynamic = "force-dynamic";

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
