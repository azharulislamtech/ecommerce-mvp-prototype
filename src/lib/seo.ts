import type { Product } from "./data";

export const privatePageMetadata = {
  robots: { index: false, follow: false, nocache: true }
};

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function productStructuredData(product: Product, siteUrl: string, review?: { reviewCount: number; averageRating: number | null }) {
  const url = `${siteUrl}/products/${product.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.description,
    url,
    sku: product.id,
    image: product.images?.length ? product.images.map((item) => item.url) : product.imageUrl ? [product.imageUrl] : undefined,
    // R2.4: in stock → the shown price + InStock; stock ended → the shown price + OutOfStock
    // (no "last sold price" claim); coming soon → no offer and no price at all. Hidden
    // products never reach this function (their page is noindex with no Product data).
    ...(product.state === "coming_soon" ? {} : {
      offers: {
        "@type": "Offer", url, priceCurrency: "BDT", price: product.price.toFixed(2),
        availability: product.state === "in_stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: { "@type": "Organization", name: "Kena Sathi", url: siteUrl }
      }
    }),
    ...(review && review.reviewCount > 0 && review.averageRating !== null ? {
      aggregateRating: { "@type": "AggregateRating", ratingValue: review.averageRating, reviewCount: review.reviewCount }
    } : {})
  };
}

export function breadcrumbStructuredData(items: { name: string; url: string }[]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })) };
}
