import { ProductForm } from "@/app/admin/(panel)/products/product-form";

export default function AddProductPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-blue-700">Products</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Add Product</h1>
        <p className="mt-2 text-sm text-slate-600">Fields match the database-ready product structure.</p>
      </div>
      <ProductForm mode="add" />
    </div>
  );
}
