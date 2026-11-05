import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreCategories, getStoreProducts, type StoreCategory } from "@/lib/catalog";
import { CATEGORY_COPY, PRICE_RANGES, SECTION_NAMES } from "@/lib/category-copy";
import type { Product } from "@/lib/data";
import { AGE_BUCKETS, fitsAge } from "@/lib/kids";
import { ProductCard } from "@/components/modules/product-card";
import { StructuredData } from "@/components/modules/structured-data";
import { breadcrumbStructuredData } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type Filters = { availability?: string; age?: string; price?: string; sort?: string };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const FILTER_KEYS = ["availability", "age", "price", "sort"] as const;

function readFilters(params: Record<string, string | string[] | undefined> | undefined): Filters {
  return Object.fromEntries(FILTER_KEYS.map((key) => [key, first(params?.[key]) || undefined]));
}

// A section root (Kids & Baby, সংসারের সমাধান) shows all products of its sub-categories.
async function categoryProducts(category: StoreCategory, sort?: string) {
  const isRoot = Boolean(category.section && !category.parentSlug);
  return getStoreProducts(isRoot ? { section: category.section, sort } : { category: category.slug, sort });
}

function applyFilters(products: Product[], filters: Filters) {
  return products
    .filter((product) => (filters.availability === "in_stock" || filters.availability === "coming_soon" ? product.state === filters.availability : true))
    .filter((product) => (filters.age ? fitsAge(product, filters.age) : true))
    .filter((product) => {
      const range = PRICE_RANGES.find((item) => item.key === filters.price);
      // A coming-soon product has no confirmed price, so a price filter leaves it out.
      return range ? product.state !== "coming_soon" && range.test(product.price) : true;
    });
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const filters = readFilters(await searchParams);
  const category = (await getStoreCategories()).find((item) => item.slug === slug);
  if (!category) return { title: "Category Not Found", robots: { index: false } };
  const copy = CATEGORY_COPY[slug];
  const filtered = FILTER_KEYS.some((key) => filters[key]);
  return {
    title: copy ? `${category.name} — ${copy.question}` : category.name,
    description: copy?.intro ?? (category.description || `${category.name} — কেনা সাথী, ক্যাশ অন ডেলিভারি।`),
    alternates: { canonical: `/categories/${category.slug}` },
    ...(filtered ? { robots: { index: false, follow: true } } : {})
  };
}

const chip = (active: boolean) =>
  `focus-ring inline-flex min-h-10 items-center rounded-full border px-3 text-sm font-semibold ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`;

// R5.1: wireframe §৪ page 2 — breadcrumb, the question, sub-category chips with stock,
// filters kept in the URL (on a phone behind one "ফিল্টার" button), sorting, and an honest
// message when a filter matches nothing. Filter options appear only with products behind them.
export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const filters = readFilters(await searchParams);
  const categories = await getStoreCategories();
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const all = await categoryProducts(category, filters.sort);
  const products = applyFilters(all, filters);
  const inStock = all.filter((product) => product.state === "in_stock");
  const copy = CATEGORY_COPY[slug];
  const section = category.section ? SECTION_NAMES[category.section] : null;
  const children = categories.filter(
    (item) => item.parentSlug === slug && inStock.some((product) => product.categorySlug === item.slug)
  );
  const availabilityOptions = [
    { key: "in_stock", label: "স্টকে আছে" },
    { key: "coming_soon", label: "শীঘ্রই আসছে" }
  ].filter((option) => all.some((product) => product.state === option.key));
  const ageOptions = category.section === "kids" ? AGE_BUCKETS.filter((bucket) => inStock.some((product) => fitsAge(product, bucket.key))) : [];
  const priceOptions = PRICE_RANGES.filter((range) => inStock.some((product) => range.test(product.price)));
  const filtered = FILTER_KEYS.some((key) => key !== "sort" && filters[key]);
  const breadcrumb = [
    { name: "হোম", url: getSiteUrl() },
    ...(section && category.parentSlug ? [{ name: section.name, url: `${getSiteUrl()}${section.href}` }] : []),
    { name: category.name, url: `${getSiteUrl()}/categories/${slug}` }
  ];

  const filterForm = (
    <form action={`/categories/${slug}`} className="space-y-5" data-testid="category-filters">
      {availabilityOptions.length > 1 ? (
        <fieldset>
          <legend className="text-sm font-bold text-slate-950">পাওয়া যায়</legend>
          <div className="mt-2 grid gap-2">
            {availabilityOptions.map((option) => (
              <label className="flex min-h-10 items-center gap-2 text-sm" key={option.key}>
                <input defaultChecked={filters.availability === option.key} name="availability" type="radio" value={option.key} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {ageOptions.length ? (
        <fieldset>
          <legend className="text-sm font-bold text-slate-950">বাচ্চার বয়স</legend>
          <div className="mt-2 grid gap-2">
            {ageOptions.map((bucket) => (
              <label className="flex min-h-10 items-center gap-2 text-sm" key={bucket.key}>
                <input defaultChecked={filters.age === bucket.key} name="age" type="radio" value={bucket.key} />
                {bucket.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {priceOptions.length ? (
        <fieldset>
          <legend className="text-sm font-bold text-slate-950">দাম</legend>
          <div className="mt-2 grid gap-2">
            {priceOptions.map((range) => (
              <label className="flex min-h-10 items-center gap-2 text-sm" key={range.key}>
                <input defaultChecked={filters.price === range.key} name="price" type="radio" value={range.key} />
                {range.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <label className="block">
        <span className="text-sm font-bold text-slate-950">সাজান</span>
        <select className="focus-ring mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" defaultValue={filters.sort ?? ""} name="sort">
          <option value="">প্রথমে স্টকে থাকা</option>
          <option value="price-asc">দাম: কম থেকে বেশি</option>
          <option value="price-desc">দাম: বেশি থেকে কম</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="focus-ring min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700" type="submit">
          ফিল্টার দেখুন
        </button>
        {filtered || filters.sort ? (
          <Link className="focus-ring inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" href={`/categories/${slug}`}>
            ফিল্টার মুছুন
          </Link>
        ) : null}
      </div>
    </form>
  );

  return (
    <section className="container-page py-8 md:py-10" lang="bn">
      <StructuredData data={breadcrumbStructuredData(breadcrumb)} />
      <nav aria-label="অবস্থান" className="mb-4 text-sm text-slate-600" data-testid="category-breadcrumb">
        <Link className="hover:text-blue-700" href="/">হোম</Link>
        {section && category.parentSlug ? (
          <>
            {" › "}
            <Link className="hover:text-blue-700" href={section.href}>{section.name}</Link>
          </>
        ) : null}
        {" › "}
        <span className="font-semibold text-slate-950">{category.name}</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">{copy?.question ?? category.name}</h1>
      {copy || category.description ? <p className="mt-2 text-base text-slate-600">{copy?.intro ?? category.description}</p> : null}

      {children.length ? (
        <nav aria-label="উপ-বিষয়" className="mt-4 flex flex-wrap gap-2" data-testid="category-chips">
          {children.map((child) => (
            <Link className={chip(false)} href={`/categories/${child.slug}`} key={child.slug}>{child.name}</Link>
          ))}
        </nav>
      ) : null}

      {all.length ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:block">{filterForm}</aside>
          <details className="rounded-lg border border-slate-200 bg-white p-3 lg:hidden" data-testid="category-filter-button">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-bold text-slate-950">
              ফিল্টার {filtered ? "(চালু)" : ""}
              <span className="text-slate-500">খুলুন</span>
            </summary>
            <div className="mt-4 border-t border-slate-200 pt-4">{filterForm}</div>
          </details>

          <div>
            <p className="mb-4 text-sm text-slate-600" data-testid="category-count">{products.length.toLocaleString("bn-BD")}টি পণ্য</p>
            {products.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} showLearning={category.section === "kids"} showProblem={category.section === "home"} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center" data-testid="category-empty-filter">
                <p className="text-base font-semibold text-slate-950">এই ফিল্টারে কোনো পণ্য নেই</p>
                <Link className="focus-ring mt-3 inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" href={`/categories/${slug}`}>
                  ফিল্টার মুছুন
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-base text-slate-700" data-testid="category-empty">
          এই মুহূর্তে এই ক্যাটাগরিতে বিক্রির জন্য কোনো পণ্য নেই। পণ্য নিজের হাতে আসার পর তবেই এখানে দেখানো হবে।
        </p>
      )}
    </section>
  );
}
