import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckIcon } from "@/components/ui/icons";
import { ProductVideoLink } from "@/components/modules/product-video-link";
import { ProductDescription } from "@/components/modules/product-description";
import { isOnlineCheckoutEnabled } from "@/lib/payments/payment-service";
import { problemLine } from "@/lib/problems";
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
  const problem = problemLine(product.problemTags);
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
          {/* R6.1: on a phone the buy panel comes first so price and buttons are on the first
              screen; on desktop the video and photos sit on the left as in the wireframe. */}
          <div className="order-2 min-w-0 lg:order-1">
            {product.videoUrl ? <ProductVideoLink name={product.name} url={product.videoUrl} /> : null}
            <ProductGallery
              imageAlt={product.imageAlt}
              imageUrl={product.imageUrl}
              images={product.images}
              label={product.name}
              visual={product.visual}
            />
          </div>

          <div className="order-1 lg:order-2 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-testid="product-purchase-panel" lang="bn">
              <div className="flex flex-wrap items-center gap-2">
                <ProductStateBadges product={product} />
                <StatusBadge tone="blue">{product.category}</StatusBadge>
                {summary.reviewCount > 0 && summary.averageRating !== null ? (
                  <a className="text-sm font-semibold text-amber-600 hover:underline" href="#reviews">
                    রেটিং {summary.averageRating} ({summary.reviewCount}টি রিভিউ)
                  </a>
                ) : null}
              </div>
              {problem ? (
                <p className="mt-3 text-sm font-semibold text-emerald-700" data-testid="product-problem-line">সমস্যা: {problem}</p>
              ) : null}
              <div className="mt-3 flex items-start gap-3">
                {product.imageUrl ? (
                  // Small photo for phones, where the big gallery comes after the buy panel.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="h-16 w-16 shrink-0 rounded-md border border-slate-200 object-cover lg:hidden" loading="eager" src={product.imageUrl} />
                ) : null}
                <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">{product.name}</h1>
              </div>

              <div className="mt-4">
                <ProductPrice product={product} size="page" />
              </div>

              {canBuyNow ? (
                <ProductPurchaseActions productId={product.id} stock={product.stock} />
              ) : (
                <div className="mt-5">
                  <ProductUnavailableNote product={product} />
                </div>
              )}

              <p className="mt-5 text-base leading-7 text-slate-600">{product.shortDescription}</p>

              <ul className="mt-5 grid gap-2 text-sm text-slate-700" data-testid="product-trust-marks">
                <li className="inline-flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                  ক্যাশ অন ডেলিভারি
                </li>
                <li className="inline-flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                  পণ্য দেখে টাকা দিন
                </li>
                <li className="inline-flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                  <Link className="hover:text-blue-700" href={RETURN_POLICY_PATH}>{RETURN_WINDOW_LINE}</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-10">
        <div className="container-page grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <article>
            <h2 className="mb-4 text-2xl font-bold text-slate-950">পণ্যের বিবরণ</h2>
            <ProductDescription specs={product.specs} text={product.description} />
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
            <h3 className="mt-5 text-base font-bold text-slate-950">পেমেন্ট</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600" data-testid="product-payment-info">
              {isOnlineCheckoutEnabled()
                ? "ক্যাশ অন ডেলিভারি, অথবা চেকআউটে অনলাইন পেমেন্ট।"
                : "এখন শুধু ক্যাশ অন ডেলিভারি: পণ্য হাতে পেয়ে টাকা দিন।"}
            </p>
          </aside>
        </div>
      </section>

      <section className="py-10" id="reviews">
        <div className="container-page grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <article>
            <h2 className="text-2xl font-bold text-slate-950">ক্রেতাদের রিভিউ</h2>
            {summary.reviewCount > 0 && summary.averageRating !== null ? (
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {summary.reviewCount}জন যাচাই করা ক্রেতার গড় রেটিং ৫-এর মধ্যে {summary.averageRating}।
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                এখনো কোনো রিভিউ নেই। এই পণ্য কিনে থাকলে প্রথম রিভিউটা আপনিই দিন।
              </p>
            )}
            <ul className="mt-5 grid gap-4">
              {reviews.map((review) => (
                <li className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={review.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-amber-600">{review.rating}/5</span>
                    {review.verified_purchase ? <StatusBadge tone="green">যাচাই করা ক্রেতা</StatusBadge> : null}
                    <span className="text-xs text-slate-500">
                      {new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium" }).format(new Date(review.created_at))}
                    </span>
                  </div>
                  {review.title ? <h3 className="mt-3 text-base font-bold text-slate-950">{review.title}</h3> : null}
                  <p className="mt-2 text-sm leading-6 text-slate-600">{review.body}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-500">{review.reviewer_label === "Verified customer" ? "যাচাই করা ক্রেতা" : review.reviewer_label}</p>
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
