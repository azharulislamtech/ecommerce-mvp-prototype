import Link from "next/link";
import { ProductCard } from "@/components/modules/product-card";
import { getStoreNav, getStoreProducts } from "@/lib/catalog";
import type { Product } from "@/lib/data";
import { MIN_PRODUCTS_PER_PROBLEM, PROBLEMS } from "@/lib/problems";
import { RETURN_POLICY_PATH, RETURN_WINDOW_LINE, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/order-copy";
import { jsonLd } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 60;
export const metadata = {
  title: { absolute: "কেনা সাথী — শিশুদের শেখার জিনিস আর সংসারের সহজ সমাধান" },
  description: "শিশুদের শেখার খেলনা আর সংসারের কাজের সহজ সমাধান। ক্যাশ অন ডেলিভারি, পণ্য দেখে টাকা দিন।",
  alternates: { canonical: "/" }
};

const featuredFirst = (left: Product, right: Product) => Number(right.featured) - Number(left.featured);

function ProductRow({ products, showProblem = false }: { products: Product[]; showProblem?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} showProblem={showProblem} />
      ))}
    </div>
  );
}

function SectionTitle({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
      {href ? (
        <Link className="text-sm font-semibold text-blue-700 hover:text-blue-900" href={href}>
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

// R3.1: wireframe §৪ page 1. Every block needs real products behind it, so an empty
// catalog shows only the honest intro and the trust cards, never invented claims.
export default async function HomePage() {
  const [products, nav] = await Promise.all([getStoreProducts(), getStoreNav()]);
  const inStock = products.filter((product) => product.state === "in_stock");
  const kidsProducts = inStock.filter((product) => product.section === "kids").sort(featuredFirst).slice(0, 4);
  const homeProducts = inStock.filter((product) => product.section === "home").sort(featuredFirst).slice(0, 4);
  const comingSoon = products.filter((product) => product.state === "coming_soon").slice(0, 4);
  const problems = PROBLEMS.filter(
    (problem) => inStock.filter((product) => product.problemTags?.includes(problem.tag)).length >= MIN_PRODUCTS_PER_PROBLEM
  );
  const hasVideo = [...inStock, ...comingSoon].some((product) => product.videoUrl);
  const sectionCards = [
    nav.kids && { href: "/kids", title: "Kids & Baby", text: "খেলতে খেলতে শেখা", tone: "bg-sky-50 border-sky-200 text-sky-900" },
    nav.home && { href: "/products?section=home", title: "সংসারের সমাধান", text: "ঘরের কাজ সহজ করার জিনিস", tone: "bg-emerald-50 border-emerald-200 text-emerald-900" }
  ].filter(Boolean) as { href: string; title: string; text: string; tone: string }[];

  const trustCards = [
    { title: "ক্যাশ অন ডেলিভারি", text: "ডেলিভারিম্যানের সামনে প্যাকেট খুলে পণ্য দেখে তারপর টাকা দিন।" },
    { title: RETURN_WINDOW_LINE, text: "বদল বা টাকা ফেরতের পুরো নিয়ম রিটার্ন নীতিতে।", href: RETURN_POLICY_PATH },
    hasVideo ? { title: "ভিডিওসহ পণ্য", text: "যে পণ্যে \"ভিডিও আছে\" লেখা, সেখানে আসল পণ্যের ভিডিও দেখে কিনুন।" } : null,
    { title: "সৎ তথ্য", text: "বানানো ছাড়, ভুয়া \"মাত্র কয়েকটা বাকি\" বা ভুয়া রিভিউ নেই। পণ্য হাতে থাকলে তবেই বিক্রি।" }
  ].filter(Boolean) as { title: string; text: string; href?: string }[];

  return (
    <div lang="bn">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${getSiteUrl()}#organization`,
        name: "Kena Sathi",
        url: getSiteUrl(),
        logo: {
          "@type": "ImageObject",
          url: `${getSiteUrl()}/brand/icon-512.png`,
          width: 512,
          height: 512
        }
      }) }} />

      <section className="bg-white" data-testid="home-intro">
        <div className="container-page py-6 md:py-8">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">শিশুদের শেখার জিনিস আর সংসারের সহজ সমাধান</h1>
          {inStock.length ? (
            <p className="mt-2 text-base leading-7 text-slate-600">
              ক্যাশ অন ডেলিভারি, পণ্য দেখে টাকা দিন।{" "}
              <Link className="font-semibold text-blue-700 hover:text-blue-900" href="/products">সব পণ্য দেখুন</Link>
            </p>
          ) : (
            <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600" data-testid="home-empty-note">
              এই মুহূর্তে বিক্রির জন্য কোনো পণ্য নেই। পণ্য নিজের হাতে আসার পর তবেই এখানে দেখানো হবে। কিছু জানতে চাইলে ফোন করুন:{" "}
              <a className="font-semibold text-blue-700 hover:text-blue-900" href={SUPPORT_PHONE_TEL}>{SUPPORT_PHONE_DISPLAY}</a>
            </p>
          )}

          {sectionCards.length ? (
            <div className="mt-5 grid grid-cols-2 gap-3" data-testid="home-section-cards">
              {sectionCards.map((card) => (
                <Link className={`focus-ring rounded-lg border p-4 transition hover:shadow-sm ${card.tone}`} href={card.href} key={card.href}>
                  <span className="block text-base font-bold sm:text-lg">{card.title}</span>
                  <span className="mt-1 block text-sm">{card.text}</span>
                  <span className="mt-3 inline-block text-sm font-semibold underline underline-offset-2">দেখুন</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {problems.length ? (
        <section className="py-8" data-testid="home-problems">
          <div className="container-page">
            <SectionTitle title="আপনার সমস্যা কোনটা?" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {problems.map((problem) => (
                <Link
                  className={`focus-ring rounded-lg border bg-white p-4 text-base font-semibold transition hover:shadow-sm ${problem.section === "kids" ? "border-sky-200 text-sky-900" : "border-emerald-200 text-emerald-900"}`}
                  href={`/products?tag=${problem.tag}`}
                  key={problem.tag}
                >
                  {problem.question}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {kidsProducts.length ? (
        <section className="py-8" data-testid="home-kids-products">
          <div className="container-page">
            <SectionTitle href="/kids" linkLabel="সব দেখুন" title="জনপ্রিয় Kids & Baby পণ্য" />
            <ProductRow products={kidsProducts} />
          </div>
        </section>
      ) : null}

      {homeProducts.length ? (
        <section className="py-8" data-testid="home-home-products">
          <div className="container-page">
            <SectionTitle href="/products?section=home" linkLabel="সব দেখুন" title="সংসারের সমাধান" />
            <ProductRow products={homeProducts} showProblem />
          </div>
        </section>
      ) : null}

      {comingSoon.length ? (
        <section className="py-8" data-testid="home-coming-soon">
          <div className="container-page">
            <SectionTitle href="/products?availability=coming_soon" linkLabel="সব দেখুন" title="শীঘ্রই আসছে" />
            <ProductRow products={comingSoon} />
          </div>
        </section>
      ) : null}

      <section className="bg-white py-8" data-testid="home-trust">
        <div className="container-page grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trustCards.map((card) => (
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={card.title}>
              <h2 className="text-base font-bold text-slate-950">
                {card.href ? <Link className="hover:text-blue-700" href={card.href}>{card.title}</Link> : card.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
