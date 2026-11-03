import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckIcon, ShieldIcon, SupportIcon, TruckIcon } from "@/components/ui/icons";
import { ProductPurchaseActions } from "@/components/cart/product-purchase-actions";
import { ProductCard } from "@/components/modules/product-card";
import { ProductGallery } from "@/components/modules/product-gallery";
import { ProductReviewForm } from "@/components/modules/product-review-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProductPrice, ProductStateBadges, ProductUnavailableNote } from "@/components/modules/product-state";
import { formatMoney } from "@/lib/data";
import { DHAKA_DELIVERY_CHARGE, OUTSIDE_DHAKA_DELIVERY_CHARGE } from "@/lib/delivery";
import { RETURN_POLICY_PATH, RETURN_WINDOW_LINE } from "@/lib/order-copy";
import {
  getStoreProductBySlug,
  getStoreProducts,
  getStorePurchasableProducts,
  getStoreRelatedProducts,
  getStoreUnavailableProduct
} from "@/lib/catalog";
import { getProductReviewData } from "@/lib/supabase/reviews";
import { StructuredData } from "@/components/modules/structured-data";
import { breadcrumbStructuredData, privatePageMetadata, productStructuredData } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 60;

type ProductDetailsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const products = await getStoreProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductDetailsPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const product = await getStoreProductBySlug(resolvedParams.slug);

  if (!product) {
    // R2.3: a real product that is now hidden gets a noindex page; anything else is 404.
    const hidden = await getStoreUnavailableProduct(resolvedParams.slug);
    return hidden
      ? { title: `${hidden.name} — এখন পাওয়া যাচ্ছে না`, ...privatePageMetadata }
      : { title: "Product Not Found" };
  }

  const path = "/products/" + product.slug;

  return {
    title: product.name,
    description: product.shortDescription,
    alternates: { canonical: path },
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      url: path,
      type: "website",
      images: product.imageUrl ? [{ url: product.imageUrl, alt: product.imageAlt ?? product.name }] : undefined
    }
  };
}

export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const resolvedParams = await params;
  const product = await getStoreProductBySlug(resolvedParams.slug);

  if (!product) {
    const hidden = await getStoreUnavailableProduct(resolvedParams.slug);
    if (!hidden) notFound();
    const alternatives = (await getStorePurchasableProducts()).slice(0, 3);
    return (
      <section className="py-10" data-testid="product-unavailable-page">
        <div className="container-page">
          <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-950">{hidden.name}</h1>
            <p className="mt-3 text-base font-semibold text-slate-700">এই পণ্যটা এখন পাওয়া যাচ্ছে না।</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              নিচে স্টকে থাকা অন্য পণ্য দেখুন, অথবা{" "}
              <Link className="font-semibold text-blue-700 hover:text-blue-900" href="/products">সব পণ্য</Link>{" "}
              দেখুন।
            </p>
          </div>
          {alternatives.length ? (
            <>
              <h2 className="mb-5 mt-8 text-2xl font-bold text-slate-950">স্টকে থাকা বিকল্প পণ্য</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {alternatives.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>
    );
  }

  const canBuyNow = product.state === "in_stock";
  const [related, reviewData] = await Promise.all([
    getStoreRelatedProducts(product, 3),
    getProductReviewData(product.id)
  ]);
  const { summary, reviews } = reviewData;
  const structuredData = productStructuredData(product, getSiteUrl(), summary);

  return (
    <>
      {structuredData ? <StructuredData data={structuredData} /> : null}
      <StructuredData data={breadcrumbStructuredData([
        { name: "Home", url: getSiteUrl() },
        { name: "Products", url: `${getSiteUrl()}/products` },
        { name: product.name, url: `${getSiteUrl()}/products/${product.slug}` }
      ])} />
      <section className="py-8 md:py-10">
        <div className="container-page grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="min-w-0">
            <ProductGallery
              imageAlt={product.imageAlt}
              imageUrl={product.imageUrl}
              images={product.images}
              label={product.name}
              visual={product.visual}
            />
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-testid="product-purchase-panel">
              <div className="flex flex-wrap items-center gap-2">
                <ProductStateBadges product={product} />
                <StatusBadge tone="blue">{product.category}</StatusBadge>
                {summary.reviewCount > 0 && summary.averageRating !== null ? (
                  <a className="text-sm font-semibold text-amber-600 hover:underline" href="#reviews">
                    {summary.averageRating} rating ({summary.reviewCount} {summary.reviewCount === 1 ? "review" : "reviews"})
                  </a>
                ) : null}
              </div>
              <h1 className="mt-4 text-3xl font-bold text-slate-950">{product.name}</h1>
              <p className="mt-3 text-base leading-7 text-slate-600">{product.shortDescription}</p>

              <div className="mt-5">
                <ProductPrice product={product} size="page" />
              </div>

              {canBuyNow ? (
                <ProductPurchaseActions productId={product.id} stock={product.stock} />
              ) : (
                <div className="mt-5">
                  <ProductUnavailableNote product={product} />
                </div>
              )}

              <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <span className="inline-flex items-center gap-2">
                  <ShieldIcon className="h-4 w-4 text-emerald-600" />
                  Secure payment
                </span>
                <span className="inline-flex items-center gap-2">
                  <TruckIcon className="h-4 w-4 text-blue-600" />
                  Fast delivery
                </span>
                <span className="inline-flex items-center gap-2">
                  <SupportIcon className="h-4 w-4 text-amber-600" />
                  Easy support
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-emerald-600" />
                  Cash on delivery
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-10">
        <div className="container-page grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <article>
            <h2 className="text-2xl font-bold text-slate-950">Description</h2>
            <p className="mt-3 leading-7 text-slate-600">{product.description}</p>
            {product.specs.length > 0 && <h3 className="mt-8 text-lg font-bold text-slate-950">Specification</h3>}
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {product.specs.map((spec) => (
                <li className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" key={spec}>
                  {spec}
                </li>
              ))}
            </ul>
          </article>
          <aside className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-bold text-slate-950">ডেলিভারি ও রিটার্ন</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              ডেলিভারি চার্জ চেকআউটে যোগ হয়: ঢাকায় {formatMoney(DHAKA_DELIVERY_CHARGE)}, ঢাকার বাইরে {formatMoney(OUTSIDE_DHAKA_DELIVERY_CHARGE)}। কত দিনে পৌঁছাবে তা কুরিয়ারের এলাকার ওপর নির্ভর করে।
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600" data-testid="product-return-line">
              ক্যাশ অন ডেলিভারিতে পণ্য দেখে টাকা দিন। {RETURN_WINDOW_LINE}।{" "}
              <Link className="font-semibold text-blue-700 hover:text-blue-900" href={RETURN_POLICY_PATH}>রিটার্ন নীতি দেখুন</Link>
            </p>
            <h3 className="mt-5 text-base font-bold text-slate-950">Payment Info</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Cash on Delivery is active now. Online payment will be enabled later after gateway verification and customer demand.
            </p>
          </aside>
        </div>
      </section>

      <section className="py-10" id="reviews">
        <div className="container-page grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <article>
            <h2 className="text-2xl font-bold text-slate-950">Customer Reviews</h2>
            {summary.reviewCount > 0 && summary.averageRating !== null ? (
              <p className="mt-2 text-sm font-semibold text-slate-600">
                Rated {summary.averageRating} out of 5 by {summary.reviewCount} verified {summary.reviewCount === 1 ? "customer" : "customers"}.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                No reviews yet. Be the first verified customer to review this product.
              </p>
            )}
            <ul className="mt-5 grid gap-4">
              {reviews.map((review) => (
                <li className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={review.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-amber-600">{review.rating}/5</span>
                    {review.verified_purchase ? <StatusBadge tone="green">Verified purchase</StatusBadge> : null}
                    <span className="text-xs text-slate-500">
                      {new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(new Date(review.created_at))}
                    </span>
                  </div>
                  {review.title ? <h3 className="mt-3 text-base font-bold text-slate-950">{review.title}</h3> : null}
                  <p className="mt-2 text-sm leading-6 text-slate-600">{review.body}</p>
                  <p className="mt-3 text-xs font-semibold uppercase text-slate-500">{review.reviewer_label}</p>
                </li>
              ))}
            </ul>
          </article>
          <ProductReviewForm productId={product.id} productSlug={product.slug} />
        </div>
      </section>

      {related.length ? (
        <section className="bg-white py-10">
          <div className="container-page">
            <h2 className="mb-5 text-2xl font-bold text-slate-950">{canBuyNow ? "আরও পণ্য" : "স্টকে থাকা বিকল্প পণ্য"}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

    </>
  );
}
