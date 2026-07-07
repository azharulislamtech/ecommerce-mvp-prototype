import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, ShieldIcon, SupportIcon, TruckIcon } from "@/components/ui/icons";
import { ProductPurchaseActions } from "@/components/cart/product-purchase-actions";
import { ProductCard } from "@/components/modules/product-card";
import { ProductGallery } from "@/components/modules/product-gallery";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/data";
import { getStoreProductBySlug, getStoreProducts, getStoreRelatedProducts } from "@/lib/catalog";

export const revalidate = 60;

type ProductDetailsPageProps = {
  params: {
    slug: string;
  };
};

export async function generateStaticParams() {
  const products = await getStoreProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const product = await getStoreProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const related = await getStoreRelatedProducts(product, 3);

  return (
    <>
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
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={product.stock > 0 ? "green" : "red"}>
                  {product.stock > 0 ? `${product.stock} in stock` : "Sold out"}
                </StatusBadge>
                <StatusBadge tone="blue">{product.category}</StatusBadge>
                <span className="text-sm font-semibold text-amber-600">{product.rating} rating</span>
              </div>
              <h1 className="mt-4 text-3xl font-bold text-slate-950">{product.name}</h1>
              <p className="mt-3 text-base leading-7 text-slate-600">{product.shortDescription}</p>

              <div className="mt-5 flex flex-wrap items-end gap-3">
                <span className="text-3xl font-bold text-slate-950">{formatMoney(product.price)}</span>
                {product.oldPrice ? (
                  <span className="text-base text-slate-400 line-through">{formatMoney(product.oldPrice)}</span>
                ) : null}
              </div>

              <ProductPurchaseActions productId={product.id} stock={product.stock} />

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
            <h3 className="mt-8 text-lg font-bold text-slate-950">Specification</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {product.specs.map((spec) => (
                <li className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" key={spec}>
                  {spec}
                </li>
              ))}
            </ul>
          </article>
          <aside className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-bold text-slate-950">Delivery Info</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Delivery charge is calculated at checkout: Dhaka is BDT 60, and all other Bangladesh districts are BDT 120. Delivery time depends on courier coverage.
            </p>
            <h3 className="mt-5 text-base font-bold text-slate-950">Payment Info</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Cash on Delivery is active now. Online payment will be enabled later after gateway verification and customer demand.
            </p>
          </aside>
        </div>
      </section>

      {related.length ? (
        <section className="py-10">
          <div className="container-page">
            <h2 className="mb-5 text-2xl font-bold text-slate-950">Related Products</h2>
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
