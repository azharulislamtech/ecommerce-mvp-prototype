import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreCategories, getStoreProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/modules/product-card";
import { StructuredData } from "@/components/modules/structured-data";
import { breadcrumbStructuredData } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getStoreCategories()).find((item) => item.slug === slug);
  if (!category) return { title: "Category Not Found", robots: { index: false } };
  return { title: `${category.name} in Bangladesh`, description: `${category.description}. Shop ${category.name} with cash on delivery from Kena Sathi.`,
    alternates: { canonical: `/categories/${category.slug}` } };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = (await getStoreCategories()).find((item) => item.slug === slug);
  if (!category) notFound();
  const products = await getStoreProducts({ category: slug });
  return <section className="container-page py-10">
    <StructuredData data={breadcrumbStructuredData([{ name: "Home", url: getSiteUrl() }, { name: category.name, url: `${getSiteUrl()}/categories/${slug}` }])} />
    <nav aria-label="Breadcrumb" className="mb-5 text-sm"><Link href="/products">All products</Link> / {category.name}</nav>
    <h1 className="text-3xl font-bold">{category.name}</h1>
    <p className="my-4 text-slate-600">{category.description}</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    {!products.length && <p>Products in this category will be available soon.</p>}
  </section>;
}
