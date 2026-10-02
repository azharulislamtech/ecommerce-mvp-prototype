import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Public utility pages must remain crawlable so search engines see noindex.
      disallow: ["/api/"]
    },
    sitemap: getSiteUrl() + "/sitemap.xml"
  };
}
