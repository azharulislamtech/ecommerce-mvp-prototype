import Link from "next/link";
import { ProductVisual } from "@/components/modules/product-visual";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProductRowActions } from "@/app/admin/(panel)/products/product-row-actions";
import { formatMoney, type ProductVisual as ProductVisualType } from "@/lib/data";
import { getAdminProducts, type AdminProduct } from "@/lib/supabase/admin-catalog";

export const dynamic = "force-dynamic";

type AdminProductListPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
    notice?: string | string[];
    q?: string | string[];
    status?: string | string[];
  }>;
};

const visualByCategorySlug: Record<string, ProductVisualType> = {
  accessories: "accessories",
  beauty: "beauty",
  electronics: "electronics",
  fashion: "fashion",
  "home-living": "home"
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function visualFromCategorySlug(slug: string | null | undefined): ProductVisualType {
  if (!slug) {
    return "accessories";
  }

  return visualByCategorySlug[slug] ?? "accessories";
}

function ProductThumbnail({ product }: { product: AdminProduct }) {
  const primaryImage = product.images[0];

  if (primaryImage) {
    return (
      <div
        aria-label={`${product.name} product image`}
        className="aspect-[4/3] w-20 rounded-md border border-slate-200 bg-slate-100 bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url(${primaryImage.image_url})` }}
      />
    );
  }

  return <ProductVisual compact label={product.name} visual={visualFromCategorySlug(product.category?.slug)} />;
}

export default async function AdminProductListPage({ searchParams }: AdminProductListPageProps) {
  const resolvedSearchParams = await searchParams;
  const q = firstParam(resolvedSearchParams?.q) ?? "";
  const status = firstParam(resolvedSearchParams?.status) ?? "all";
  const notice = firstParam(resolvedSearchParams?.notice);
  const error = firstParam(resolvedSearchParams?.error);
  const products = await getAdminProducts({ q, status });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-blue-700">Products</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Product Management</h1>
          <p className="mt-2 text-sm text-slate-600">Create, edit, deactivate, and safely delete catalog products.</p>
        </div>
        <Link
          className="focus-ring inline-flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          href="/admin/products/new"
        >
          Add Product
        </Link>
      </div>

      {notice ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <form className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_auto_auto]">
          <input
            className="focus-ring h-11 rounded-md border border-slate-200 px-3 text-sm"
            defaultValue={q}
            name="q"
            placeholder="Search products"
            type="search"
          />
          <select
            className="focus-ring h-11 rounded-md border border-slate-200 bg-white px-3 text-sm"
            defaultValue={status}
            name="status"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="focus-ring min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700">
            Search
          </button>
          <Link
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-950 hover:bg-slate-50"
            href="/admin/products"
          >
            Reset
          </Link>
        </form>
        <div className="overflow-x-auto">
          <table className="admin-table w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-3 pr-4 font-semibold">Image</th>
                <th className="py-3 pr-4 font-semibold">Product Name</th>
                <th className="py-3 pr-4 font-semibold">Category</th>
                <th className="py-3 pr-4 font-semibold">Price</th>
                <th className="py-3 pr-4 font-semibold">Stock</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr className="border-b border-slate-100 last:border-0" key={product.id}>
                  <td className="py-3 pr-4">
                    <ProductThumbnail product={product} />
                  </td>
                  <td className="py-3 pr-4">
                    <Link className="font-bold text-slate-950 hover:text-blue-700" href={`/admin/products/${product.id}/edit`}>
                      {product.name}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">/{product.slug}</p>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{product.category?.name ?? "Uncategorized"}</td>
                  <td className="py-3 pr-4 font-semibold text-slate-950">
                    {formatMoney(product.discount_price ?? product.price)}
                    {product.discount_price ? (
                      <span className="ml-2 text-xs font-medium text-slate-400 line-through">{formatMoney(product.price)}</span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{product.stock_quantity}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge tone={product.is_active ? "green" : "red"}>
                      {product.is_active ? "active" : "inactive"}
                    </StatusBadge>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        href={`/admin/products/${product.id}/edit`}
                      >
                        Edit
                      </Link>
                      <ProductRowActions isActive={product.is_active} productId={product.id} productName={product.name} />
                    </div>
                  </td>
                </tr>
              ))}
              {!products.length ? (
                <tr>
                  <td className="py-8 text-center text-sm font-semibold text-slate-500" colSpan={7}>
                    No products matched this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
