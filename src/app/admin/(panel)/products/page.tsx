import Link from "next/link";
import { ProductVisual } from "@/components/modules/product-visual";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney, products } from "@/lib/data";

export default function AdminProductListPage() {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-blue-700">Products</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Product Management</h1>
        </div>
        <Link
          className="focus-ring inline-flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          href="/admin/products/new"
        >
          Add Product
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            className="focus-ring h-11 rounded-md border border-slate-200 px-3 text-sm"
            placeholder="Search products"
            type="search"
          />
          <select className="focus-ring h-11 rounded-md border border-slate-200 bg-white px-3 text-sm">
            <option>All status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-3 pr-4 font-semibold">Image</th>
                <th className="py-3 pr-4 font-semibold">Product Name</th>
                <th className="py-3 pr-4 font-semibold">Category</th>
                <th className="py-3 pr-4 font-semibold">Price</th>
                <th className="py-3 pr-4 font-semibold">Stock</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr className="border-b border-slate-100 last:border-0" key={product.id}>
                  <td className="py-3 pr-4">
                    <div className="w-20">
                      <ProductVisual compact label={product.name} visual={product.visual} />
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-bold text-slate-950">{product.name}</td>
                  <td className="py-3 pr-4 text-slate-700">{product.category}</td>
                  <td className="py-3 pr-4 font-semibold text-slate-950">{formatMoney(product.price)}</td>
                  <td className="py-3 pr-4 text-slate-700">{product.stock}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge tone={product.stock > 0 ? "green" : "red"}>active</StatusBadge>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Link
                        className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        href={`/admin/products/${product.id}/edit`}
                      >
                        Edit
                      </Link>
                      <button className="rounded-md border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
