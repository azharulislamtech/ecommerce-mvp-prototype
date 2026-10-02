import { notFound } from "next/navigation";
import { ProductForm } from "@/app/admin/(panel)/products/product-form";
import { getAdminCategories, getAdminProductById } from "@/lib/supabase/admin-catalog";

export const dynamic = "force-dynamic";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string | string[];
    notice?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EditProductPage({ params, searchParams }: EditProductPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const [product, categories] = await Promise.all([getAdminProductById(resolvedParams.id), getAdminCategories()]);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-blue-700">Products</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Edit Product</h1>
        <p className="mt-2 text-sm text-slate-600">{product.name}</p>
      </div>
      <ProductForm
        categories={categories}
        error={firstParam(resolvedSearchParams?.error)}
        mode="edit"
        notice={firstParam(resolvedSearchParams?.notice)}
        product={product}
      />
    </div>
  );
}
