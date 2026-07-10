import type { MetadataRoute } from "next";
import { getStoreProducts } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const products = await getStoreProducts();

  const staticRoutes = ["", "/products", "/track-order", "/privacy-policy", "/terms", "/return-policy"].map(
    (path) => ({
      url: siteUrl + path,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.6
    })
  );

  const productRoutes = products.map((product) => ({
    url: siteUrl + "/products/" + product.slug,
    changeFrequency: "daily" as const,
    priority: 0.8
  }));

  return [...staticRoutes, ...productRoutes];
}
