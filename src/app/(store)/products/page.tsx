import Link from "next/link";
import { FilterIcon, SearchIcon } from "@/components/ui/icons";
import { ProductCard } from "@/components/modules/product-card";
import { SectionHeading } from "@/components/modules/section-heading";
import { getStoreCategories, getStoreNav, getStoreProducts, type CatalogFilters, type StoreCategory } from "@/lib/catalog";
import { problemByTag } from "@/lib/problems";

export const revalidate = 60;

const listingMetadata = {
  title: "Shop All Products",
  description:
    "Browse the full Kena Sathi catalog: electronics, fashion, home, beauty, and accessories with cash on delivery across Bangladesh.",
  alternates: { canonical: "/products" }
};

export async function generateMetadata({ searchParams }: ProductListingPageProps) {
  const filters = await searchParams;
  const category = firstValue(filters?.category);
  const hasFilters = Boolean(filters?.q || filters?.price || filters?.sort || filters?.section || filters?.availability || filters?.tag);
  const knownCategory = category && (await getStoreCategories()).some((item) => item.slug === category);
  return { ...listingMetadata,
    alternates: { canonical: knownCategory && !hasFilters ? `/categories/${category}` : "/products" },
    ...(hasFilters ? { robots: { index: false, follow: true } } : {})
  };
}

type ProductListingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type FilterPanelProps = {
  categories: StoreCategory[];
  filters: CatalogFilters;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function FilterPanel({ categories, filters }: FilterPanelProps) {
  return (
    <div className="space-y-5">
      {filters.q ? <input name="q" type="hidden" value={filters.q} /> : null}
      {filters.section ? <input name="section" type="hidden" value={filters.section} /> : null}
      {filters.availability ? <input name="availability" type="hidden" value={filters.availability} /> : null}
      {filters.tag ? <input name="tag" type="hidden" value={filters.tag} /> : null}
      <div>
        <label className="text-sm font-semibold text-slate-950" htmlFor="category">
          Category
        </label>
        <select
          className="focus-ring mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          defaultValue={filters.category ?? ""}
          id="category"
          name="category"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-950" htmlFor="price">
          Price range
        </label>
        <select
          className="focus-ring mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          defaultValue={filters.price ?? ""}
          id="price"
          name="price"
        >
          <option value="">Any price</option>
          <option value="under-1500">Under ৳1,500</option>
          <option value="1500-3000">৳1,500 to ৳3,000</option>
          <option value="over-3000">Over ৳3,000</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-950" htmlFor="sort">
          Sort by
        </label>
        <select
          className="focus-ring mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          defaultValue={filters.sort ?? "latest"}
          id="sort"
          name="sort"
        >
          <option value="latest">Latest</option>
          <option value="offers">Offers first</option>
          <option value="price-asc">Price low to high</option>
          <option value="price-desc">Price high to low</option>
        </select>
      </div>
      <button className="focus-ring min-h-11 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700">
        Apply Filter
      </button>
    </div>
  );
}

export default async function ProductListingPage({ searchParams }: ProductListingPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters: CatalogFilters = {
    q: firstValue(resolvedSearchParams?.q),
    category: firstValue(resolvedSearchParams?.category),
    price: firstValue(resolvedSearchParams?.price),
    sort: firstValue(resolvedSearchParams?.sort),
    section: firstValue(resolvedSearchParams?.section),
    availability: firstValue(resolvedSearchParams?.availability),
    tag: firstValue(resolvedSearchParams?.tag)
  };
  // R2.1: the header menu lands here with a section or "শীঘ্রই আসছে" filter.
  const menuTitle =
    filters.section === "kids" ? "Kids & Baby"
      : filters.section === "home" ? "সংসারের সমাধান"
        : filters.availability === "coming_soon" ? "শীঘ্রই আসছে"
          : filters.tag ? problemByTag(filters.tag)?.question ?? null : null;

  const [categories, products, nav] = await Promise.all([
    getStoreCategories(),
    getStoreProducts(filters),
    getStoreNav()
  ]);

  return (
    <section className="py-8 md:py-10">
      <div className="container-page">
        <SectionHeading
          description="Browse focused products with simple filters that stay usable on small screens."
          eyebrow="Products"
          title="Shop All Products"
        />

        {menuTitle ? (
          <div className="mb-5" lang="bn">
            <h2 className="text-2xl font-bold text-slate-950" data-testid="menu-section-title">{menuTitle}</h2>
            {filters.section === "kids" && nav.kidsCategories.length ? (
              <nav aria-label="Kids & Baby ক্যাটাগরি" className="mt-3 flex flex-wrap gap-2 rounded-lg bg-sky-50 p-2" data-testid="kids-category-menu">
                {nav.kidsCategories.map((item) => (
                  <Link
                    className={`rounded-full px-3 py-2 text-sm font-semibold ${filters.category === item.slug ? "bg-sky-600 text-white" : "bg-white text-sky-800 hover:bg-sky-100"}`}
                    href={`/products?section=kids&category=${encodeURIComponent(item.slug)}`}
                    key={item.slug}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
        ) : null}

        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <form action="/products" className="relative">
            <label>
              <span className="sr-only">Search products</span>
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="focus-ring h-12 w-full rounded-md border border-slate-200 bg-white pl-10 pr-4 text-sm"
                defaultValue={filters.q ?? ""}
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
            <form action="/products" className="mt-4 border-t border-slate-200 pt-4">
              <FilterPanel categories={categories} filters={filters} />
            </form>
          </details>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:block">
            <h2 className="mb-4 text-base font-bold text-slate-950">Filters</h2>
            <form action="/products">
              <FilterPanel categories={categories} filters={filters} />
            </form>
          </aside>

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">{products.length} products available</p>
              <Link className="text-sm font-semibold text-blue-700 hover:text-blue-900" href="/cart">
                Review cart
              </Link>
            </div>
            {products.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">No products found</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Try a different search, clear filters, or check back after new products are published.
                </p>
                <Link
                  className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 px-5 text-sm font-semibold text-slate-950 hover:bg-slate-50"
                  href="/products"
                >
                  Clear Filters
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
