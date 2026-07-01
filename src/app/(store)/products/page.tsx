import Link from "next/link";
import { FilterIcon, SearchIcon } from "@/components/ui/icons";
import { ProductCard } from "@/components/modules/product-card";
import { SectionHeading } from "@/components/modules/section-heading";
import { categories, products } from "@/lib/data";

function FilterPanel() {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-semibold text-slate-950" htmlFor="category">
          Category
        </label>
        <select
          className="focus-ring mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          id="category"
          name="category"
        >
          <option>All categories</option>
          {categories.map((category) => (
            <option key={category.slug}>{category.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-950" htmlFor="price">
          Price range
        </label>
        <select
          className="focus-ring mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          id="price"
          name="price"
        >
          <option>Any price</option>
          <option>Under BDT 1,500</option>
          <option>BDT 1,500 to 3,000</option>
          <option>Over BDT 3,000</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-950" htmlFor="sort">
          Sort by
        </label>
        <select
          className="focus-ring mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          id="sort"
          name="sort"
        >
          <option>Latest</option>
          <option>Price low to high</option>
          <option>Price high to low</option>
        </select>
      </div>
      <button className="focus-ring min-h-11 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700">
        Apply Filter
      </button>
    </div>
  );
}

export default function ProductListingPage() {
  return (
    <section className="py-8 md:py-10">
      <div className="container-page">
        <SectionHeading
          description="Browse focused products with simple filters that stay usable on small screens."
          eyebrow="Products"
          title="Shop All Products"
        />

        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <form action="/products" className="relative">
            <label>
              <span className="sr-only">Search products</span>
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="focus-ring h-12 w-full rounded-md border border-slate-200 bg-white pl-10 pr-4 text-sm"
                name="q"
                placeholder="Search product name"
                type="search"
              />
            </label>
          </form>
          <details className="rounded-lg border border-slate-200 bg-white p-3 lg:hidden">
            <summary className="menu-summary flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-slate-950">
              <span className="inline-flex items-center gap-2">
                <FilterIcon className="h-4 w-4" />
                Filter products
              </span>
              <span className="text-slate-400">Open</span>
            </summary>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <FilterPanel />
            </div>
          </details>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:block">
            <h2 className="mb-4 text-base font-bold text-slate-950">Filters</h2>
            <FilterPanel />
          </aside>

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">{products.length} products available</p>
              <Link className="text-sm font-semibold text-blue-700 hover:text-blue-900" href="/cart">
                Review cart
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <button className="focus-ring min-h-12 rounded-md border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-950 hover:bg-slate-50">
                Load More
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
