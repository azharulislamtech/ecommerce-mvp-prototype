import { notFound } from "next/navigation";
import { ProductForm } from "@/app/admin/(panel)/products/product-form";
import { products } from "@/lib/data";

type EditProductPageProps = {
  params: {
    id: string;
  };
};

export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const product = products.find((item) => item.id === params.id);

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
      <ProductForm mode="edit" product={product} />
    </div>
  );
}
