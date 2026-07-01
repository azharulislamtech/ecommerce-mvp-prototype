import Image from "next/image";
import Link from "next/link";
import { CheckIcon, ShieldIcon, SupportIcon, TruckIcon } from "@/components/ui/icons";
import { ProductCard } from "@/components/modules/product-card";
import { ProductVisual } from "@/components/modules/product-visual";
import { SectionHeading } from "@/components/modules/section-heading";
import { categories, products } from "@/lib/data";

const trustItems = [
  {
    title: "Secure Payment",
    text: "Payment gateway ready flow with server-side callback assumptions.",
    icon: ShieldIcon
  },
  {
    title: "Fast Delivery",
    text: "Clear delivery charge and district-based checkout fields.",
    icon: TruckIcon
  },
  {
    title: "Quality Product",
    text: "Focused product cards with stock, price, and primary action.",
    icon: CheckIcon
  },
  {
    title: "Customer Support",
    text: "Support contact stays visible through checkout and footer.",
    icon: SupportIcon
  }
];

export default function HomePage() {
  const featuredProducts = products.filter((product) => product.featured);

  return (
    <>
      <section className="bg-white">
        <div className="container-page grid items-center gap-8 py-8 md:grid-cols-[0.9fr_1.1fr] md:py-12">
          <div className="max-w-xl">
            <p className="mb-3 text-sm font-semibold uppercase text-blue-700">Premium single-brand store</p>
            <h1 className="text-4xl font-bold text-slate-950 sm:text-5xl">
              Shop Quality Products Online
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
              Fast delivery, secure payment, and trusted service for first-time online shoppers.
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
                <strong className="block text-lg text-slate-950">4.8</strong>
                Rating
              </div>
              <div>
                <strong className="block text-lg text-slate-950">COD</strong>
                Available
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-soft">
            <Image
              alt="Curated product collage for ShopPilot"
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
            description="Start from a familiar category and reach buy actions within a few taps."
            title="Featured Categories"
          />
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
        </div>
      </section>

      <section className="bg-white py-10">
        <div className="container-page">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              description="Clear pricing, visible stock, and simple actions keep the first purchase easy."
              title="Featured Products"
            />
            <Link className="text-sm font-semibold text-blue-700 hover:text-blue-900" href="/products">
              View all products
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="container-page">
          <SectionHeading
            description="Trust elements are short and practical, so the page stays calm on mobile."
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
            <p className="text-sm font-semibold uppercase text-amber-300">Customer trust</p>
            <h2 className="mt-2 text-2xl font-bold">Order today with a clear payment-ready flow.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              The prototype keeps customers out of account creation and moves them from product to checkout
              with visible order totals.
            </p>
          </div>
          <Link
            className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-amber-100"
            href="/checkout"
          >
            Checkout Preview
          </Link>
        </div>
      </section>
    </>
  );
}
