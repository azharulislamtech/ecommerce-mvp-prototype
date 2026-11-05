import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import type { Product } from "@/lib/data";
import { problemLine } from "@/lib/problems";
import { learningLine } from "@/lib/kids";
import { ProductVisual } from "@/components/modules/product-visual";
import { ProductPrice, ProductStateBadges, ProductUnavailableNote } from "@/components/modules/product-state";

type ProductCardProps = {
  product: Product;
  // R3.1: Home Solutions cards show the problem the product solves.
  showProblem?: boolean;
  // R4.1: Kids cards show what the product teaches.
  showLearning?: boolean;
};

export function ProductCard({ product, showProblem = false, showLearning = false }: ProductCardProps) {
  const problem = showProblem ? problemLine(product.problemTags) : null;
  const learning = showLearning ? learningLine(product.learningGoals) : null;
  const inStock = product.state === "in_stock";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" data-product-id={product.id} data-product-state={product.state} data-testid="product-card">
      <Link className="relative block" href={`/products/${product.slug}`}>
        <ProductVisual imageAlt={product.imageAlt} imageUrl={product.imageUrl} label={product.name} visual={product.visual} />
        {product.videoUrl ? (
          <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2.5 py-1 text-xs font-semibold text-white" data-testid="product-video-mark">
            ▶ ভিডিও আছে
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              className="focus-ring line-clamp-2 flex min-h-11 items-center text-base font-semibold text-slate-950 hover:text-blue-700"
              href={`/products/${product.slug}`}
            >
              {product.name}
            </Link>
            {learning ? <p className="mt-1 text-sm font-semibold text-sky-800" data-testid="product-learning-line">শেখায়: {learning}</p> : null}
            {problem ? <p className="mt-1 text-sm font-semibold text-emerald-700" data-testid="product-problem-line">সমস্যা: {problem}</p> : null}
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{product.shortDescription}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ProductStateBadges product={product} />
        </div>

        <div className="mt-auto">
          <ProductPrice product={product} size="card" />
        </div>

        {inStock ? (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <AddToCartButton
            checkout
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            label="এখনই কিনুন"
            productId={product.id}
            stock={product.stock}
          />
          <AddToCartButton
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
            label="কার্টে যোগ করুন"
            productId={product.id}
            stock={product.stock}
          />
        </div>
        ) : (
          <ProductUnavailableNote link product={product} />
        )}
      </div>
    </article>
  );
}
