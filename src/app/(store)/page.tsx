import Image from "next/image";
import Link from "next/link";
import { CheckIcon, ShieldIcon, SupportIcon, TruckIcon } from "@/components/ui/icons";
import { ProductCard } from "@/components/modules/product-card";
import { ProductVisual } from "@/components/modules/product-visual";
import { SectionHeading } from "@/components/modules/section-heading";
import { getStoreCategories, getStoreFeaturedProducts } from "@/lib/catalog";

export const revalidate = 60;

const trustItems = [
  {
    title: "Secure Payment",
    text: "Cash on Delivery checkout with clear delivery charges for Dhaka and all other Bangladesh districts.",
    icon: ShieldIcon
  },
  {
    title: "Fast Delivery",
    text: "District-based checkout helps prepare delivery across Bangladesh.",
    icon: TruckIcon
  },
  {
    title: "Quality Product",
    text: "Curated products with clear photos, visible stock, and honest pricing.",
    icon: CheckIcon
  },
  {
    title: "Customer Support",
    text: "Helpful support stays close before and after every order.",
    icon: SupportIcon
  }
];

export default async function HomePage() {
  const [categories, featuredProducts] = await Promise.all([
    getStoreCategories(),
    getStoreFeaturedProducts(8)
  ]);

  return (
    <>
      <section className="bg-white">
        <div className="container-page grid items-center gap-8 py-8 md:grid-cols-[0.9fr_1.1fr] md:py-12">
          <div className="max-w-xl">
            <p className="mb-3 text-sm font-semibold uppercase text-blue-700">Kena Sathi Online Store</p>
            <h1 className="text-4xl font-bold text-slate-950 sm:text-5xl">
              Your Trusted Shopping Partner
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
              Discover everyday products, clear offers, cash-on-delivery checkout, and simple order tracking from Kena Sathi.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
                href="/products"
              >
                Shop Now
              </Link>
              <Link
                className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-950 transition hover:border-blue-300 hover:bg-blue-50"
                href="/products?sort=offers"
              >
                View Offers
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-sm text-slate-600">
              <div>
                <strong className="block text-lg text-slate-950">24h</strong>
                Dispatch
              </div>
              <div>
                <strong className="block text-lg text-slate-950">Live</strong>
                Catalog
              </div>
              <div>
                <strong className="block text-lg text-slate-950">COD</strong>
                Available
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-soft">
            <Image
              alt="Kena Sathi featured product collage"
              className="h-full w-full object-cover"
              height={720}
              priority
              src="/hero-products.png"
              width={960}
            />
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="container-page">
          <SectionHeading
            description="Browse the categories Kena Sathi customers use most and move quickly to the right product."
            title="Featured Categories"
          />
          {categories.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((category) => (
                <Link
                  className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
                  href={`/products?category=${category.slug}`}
                  key={category.slug}
                >
                  <ProductVisual label={category.name} visual={category.visual} />
                  <h3 className="mt-3 text-sm font-bold text-slate-950">{category.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{category.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              Categories will appear here after the catalog is published.
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-10">
        <div className="container-page">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              description="Fresh picks from the Kena Sathi catalog with clear pricing, visible stock, and quick cart actions."
              title="Featured Products"
            />
            <Link className="text-sm font-semibold text-blue-700 hover:text-blue-900" href="/products">
              View all products
            </Link>
          </div>
          {featuredProducts.length ? (
            <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              Featured products will appear here after products are marked as featured.
            </div>
          )}
        </div>
      </section>

      <section className="py-10">
        <div className="container-page">
          <SectionHeading
            description="Kena Sathi keeps shopping practical with payment clarity, delivery updates, and friendly support."
            title="Why Buy From Us"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => {
              const Icon = item.icon;

              return (
                <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={item.title}>
                  <span className="grid h-11 w-11 place-items-center rounded-md bg-blue-50 text-blue-700">
                    <Icon />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-10 text-white">
        <div className="container-page grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-amber-300">Shop with confidence</p>
            <h2 className="mt-2 text-2xl font-bold">Order from Kena Sathi with a simple, secure flow.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Browse the live catalog, add your favorite products, and track each order with your phone number.
            </p>
          </div>
          <Link
            className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-amber-100"
            href="/products"
          >
            Browse Products
          </Link>
        </div>
      </section>
    </>
  );
}
