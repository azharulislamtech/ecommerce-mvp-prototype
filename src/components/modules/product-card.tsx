import Link from "next/link";
import { formatMoney, type Product } from "@/lib/data";
import { ProductVisual } from "@/components/modules/product-visual";
import { StatusBadge } from "@/components/ui/status-badge";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const inStock = product.stock > 0;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <Link className="block" href={`/products/${product.slug}`}>
        <ProductVisual label={product.name} visual={product.visual} />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              className="line-clamp-2 text-base font-semibold text-slate-950 hover:text-blue-700"
              href={`/products/${product.slug}`}
            >
              {product.name}
            </Link>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{product.shortDescription}</p>
          </div>
          <StatusBadge tone={inStock ? "green" : "red"}>{inStock ? "In stock" : "Sold out"}</StatusBadge>
        </div>

        <div className="mt-auto flex flex-wrap items-end gap-2">
          <span className="text-xl font-bold text-slate-950">{formatMoney(product.price)}</span>
          {product.oldPrice ? (
            <span className="text-sm text-slate-400 line-through">{formatMoney(product.oldPrice)}</span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Link
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            href="/checkout"
          >
            Buy Now
          </Link>
          <Link
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 transition hover:border-blue-300 hover:bg-blue-50"
            href="/cart"
          >
            Add
          </Link>
        </div>
      </div>
    </article>
  );
}
