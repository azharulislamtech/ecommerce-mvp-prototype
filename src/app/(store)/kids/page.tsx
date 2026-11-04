import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/modules/product-card";
import { getStoreNav, getStoreProducts } from "@/lib/catalog";
import { fitsAge, hasGoal, kidsPageData } from "@/lib/kids";
import { RETURN_POLICY_PATH, RETURN_WINDOW_LINE } from "@/lib/order-copy";

export const revalidate = 60;

type KidsPageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ searchParams }: KidsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const filtered = Boolean(first(params?.age) || first(params?.goal));
  const kids = (await getStoreProducts({ section: "kids" })).filter((product) => product.state === "in_stock");
  return {
    title: "Kids & Baby — খেলতে খেলতে শেখা",
    description: "৩–৬ বছরের শিশুর শেখার খেলনা ও উপকরণ। ক্যাশ অন ডেলিভারি, পণ্য দেখে টাকা দিন।",
    alternates: { canonical: "/kids" },
    // A filtered view, or an empty section, is not a page to index.
    ...(filtered || kids.length === 0 ? { robots: { index: false, follow: true } } : {})
  };
}

const chip = (active: boolean) =>
  `focus-ring rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? "border-sky-700 bg-sky-700 text-white" : "border-sky-200 bg-white text-sky-900 hover:bg-sky-50"}`;

// R4.1: wireframe §৪ page 5. Age buttons and learning tiles appear only with in-stock
// products behind them; the list follows the chosen age and learning goal.
export default async function KidsPage({ searchParams }: KidsPageProps) {
  const params = await searchParams;
  const age = first(params?.age);
  const goal = first(params?.goal);
  const [kidsProducts, nav] = await Promise.all([getStoreProducts({ section: "kids" }), getStoreNav()]);
  const { inStock, comingSoon, ages, goals } = kidsPageData(kidsProducts);
  const activeAge = ages.find((bucket) => bucket.key === age)?.key;
  const activeGoal = goals.find((item) => item.tag === goal)?.tag;
  const list = kidsProducts
    .filter((product) => product.state !== "coming_soon")
    .filter((product) => (activeAge ? fitsAge(product, activeAge) : true))
    .filter((product) => (activeGoal ? hasGoal(product, activeGoal) : true));
  const link = (next: { age?: string; goal?: string }) => {
    const query = new URLSearchParams();
    if (next.age) query.set("age", next.age);
    if (next.goal) query.set("goal", next.goal);
    const text = query.toString();
    return text ? `/kids?${text}#products` : "/kids#products";
  };

  return (
    <div lang="bn">
      <section className="bg-sky-50" data-testid="kids-banner">
        <div className="container-page py-8 md:py-10">
          <p className="text-sm font-semibold text-sky-700">Kids & Baby</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">খেলতে খেলতে শেখা, নিরাপদে বেড়ে ওঠা</h1>
          {inStock.length ? (
            <p className="mt-2 text-base text-slate-700">৩–৬ বছরের শিশুর শেখার খেলনা ও উপকরণ।</p>
          ) : (
            <p className="mt-2 max-w-2xl text-base leading-7 text-slate-700" data-testid="kids-empty-note">
              এই মুহূর্তে এই ভাগে বিক্রির জন্য কোনো পণ্য নেই। পণ্য নিজের হাতে আসার পর তবেই এখানে দেখানো হবে।
            </p>
          )}
          {ages.length ? (
            <a className="focus-ring mt-4 inline-flex min-h-11 items-center rounded-md bg-sky-700 px-5 text-sm font-semibold text-white hover:bg-sky-800" href="#age">
              বয়স অনুযায়ী দেখুন
            </a>
          ) : null}
          {nav.kidsCategories.length > 1 ? (
            <nav aria-label="Kids & Baby ক্যাটাগরি" className="mt-4 flex flex-wrap gap-2" data-testid="kids-category-menu">
              {nav.kidsCategories.map((item) => (
                <Link className={chip(false)} href={`/products?section=kids&category=${encodeURIComponent(item.slug)}`} key={item.slug}>
                  {item.name}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </section>

      {ages.length ? (
        <section className="py-6" data-testid="kids-ages" id="age">
          <div className="container-page">
            <h2 className="text-xl font-bold text-slate-950">বয়স অনুযায়ী</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link className={chip(!activeAge)} href={link({ goal: activeGoal })}>সব বয়স</Link>
              {ages.map((bucket) => (
                <Link aria-current={activeAge === bucket.key ? "true" : undefined} className={chip(activeAge === bucket.key)} href={link({ age: bucket.key, goal: activeGoal })} key={bucket.key}>
                  {bucket.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {goals.length ? (
        <section className="py-6" data-testid="kids-goals">
          <div className="container-page">
            <h2 className="text-xl font-bold text-slate-950">আপনার বাচ্চা কী শিখবে?</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {goals.map((item) => (
                <Link
                  aria-current={activeGoal === item.tag ? "true" : undefined}
                  className={`focus-ring rounded-lg border p-4 transition hover:shadow-sm ${activeGoal === item.tag ? "border-sky-700 bg-sky-50" : "border-sky-200 bg-white"}`}
                  href={link({ age: activeAge, goal: activeGoal === item.tag ? undefined : item.tag })}
                  key={item.tag}
                >
                  <span className="block text-base font-bold text-slate-950">{item.title}</span>
                  <span className="mt-1 block text-sm text-slate-600">{item.question}</span>
                  <span className="mt-2 block text-xs font-semibold text-sky-800" data-testid="kids-goal-count">
                    {item.count.toLocaleString("bn-BD")}টি পণ্য
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {comingSoon.length ? (
        <section className="py-6" data-testid="kids-coming-soon">
          <div className="container-page">
            <h2 className="text-xl font-bold text-slate-950">শীঘ্রই আসছে</h2>
            <p className="mt-1 text-sm text-slate-600">পণ্য হাতে আসার আগে কোনো অর্ডার বা টাকা নেওয়া হয় না।</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {comingSoon.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        </section>
      ) : null}

      {inStock.length ? (
        <section className="py-6" data-testid="kids-products" id="products">
          <div className="container-page">
            <h2 className="text-xl font-bold text-slate-950">পণ্য</h2>
            {list.length ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {list.map((product) => <ProductCard key={product.id} product={product} showLearning />)}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                এই বাছাইয়ে কোনো পণ্য নেই।{" "}
                <Link className="font-semibold text-blue-700 hover:text-blue-900" href="/kids#products">বাছাই মুছে ফেলুন</Link>
              </p>
            )}
          </div>
        </section>
      ) : null}

      <section className="bg-white py-8" data-testid="kids-trust">
        <div className="container-page grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "নিরাপত্তা যাচাই", text: "প্রতিটা খেলনা নমুনা হাতে নিয়ে ছোট অংশ, ধারালো কোণা আর গন্ধ যাচাই করে তবেই তোলা হয়।" },
            { title: "মিউজিক ছাড়া", text: "মিউজিকযুক্ত খেলনা আর ব্যাকগ্রাউন্ড মিউজিকওয়ালা ভিডিও রাখা হয় না।" },
            { title: "ক্যাশ অন ডেলিভারি", text: "প্যাকেট খুলে পণ্য দেখে তারপর টাকা দিন।" },
            { title: RETURN_WINDOW_LINE, text: "বদল বা টাকা ফেরতের পুরো নিয়ম রিটার্ন নীতিতে।", href: RETURN_POLICY_PATH }
          ].map((card) => (
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

