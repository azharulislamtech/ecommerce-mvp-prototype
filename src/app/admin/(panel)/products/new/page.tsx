import { ProductForm } from "@/app/admin/(panel)/products/product-form";
import { getAdminCategories } from "@/lib/supabase/admin-catalog";

export const dynamic = "force-dynamic";

type AddProductPageProps = {
  searchParams?: {
    error?: string | string[];
    notice?: string | string[];
  };
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AddProductPage({ searchParams }: AddProductPageProps) {
  const categories = await getAdminCategories();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-blue-700">Products</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Add Product</h1>
        <p className="mt-2 text-sm text-slate-600">Products are saved through Supabase RLS using the signed-in admin session.</p>
      </div>
      <ProductForm
        categories={categories}
        error={firstParam(searchParams?.error)}
        mode="add"
        notice={firstParam(searchParams?.notice)}
      />
    </div>
  );
}
