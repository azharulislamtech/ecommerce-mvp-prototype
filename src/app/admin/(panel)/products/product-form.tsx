import { categories, type Product } from "@/lib/data";

type ProductFormProps = {
  product?: Product;
  mode: "add" | "edit";
};

export function ProductForm({ product, mode }: ProductFormProps) {
  return (
    <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-950">Product Name</span>
          <input
            className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
            defaultValue={product?.name}
            name="name"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-950">Slug</span>
          <input
            className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
            defaultValue={product?.slug}
            name="slug"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-950">Category</span>
          <select
            className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            defaultValue={product?.category}
            name="category"
            required
          >
            {categories.map((category) => (
              <option key={category.slug}>{category.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-950">Status</span>
          <select
            className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            defaultValue="active"
            name="status"
          >
            <option>active</option>
            <option>inactive</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-950">Price</span>
          <input
            className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
            defaultValue={product?.price}
            min="0"
            name="price"
            required
            type="number"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-950">Discount Price</span>
          <input
            className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
            defaultValue={product?.oldPrice}
            min="0"
            name="discountPrice"
            type="number"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-950">Stock Quantity</span>
          <input
            className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
            defaultValue={product?.stock}
            min="0"
            name="stock"
            required
            type="number"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-950">Featured</span>
          <select
            className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            defaultValue={product?.featured ? "yes" : "no"}
            name="featured"
          >
            <option>yes</option>
            <option>no</option>
          </select>
        </label>
        <label className="block lg:col-span-2">
          <span className="text-sm font-semibold text-slate-950">Short Description</span>
          <input
            className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
            defaultValue={product?.shortDescription}
            name="shortDescription"
            required
          />
        </label>
        <label className="block lg:col-span-2">
          <span className="text-sm font-semibold text-slate-950">Full Description</span>
          <textarea
            className="focus-ring mt-2 min-h-32 w-full rounded-md border border-slate-200 px-3 py-3 text-sm"
            defaultValue={product?.description}
            name="description"
            required
          />
        </label>
        <label className="block lg:col-span-2">
          <span className="text-sm font-semibold text-slate-950">Product Images</span>
          <input
            className="focus-ring mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm"
            name="images"
            type="file"
            multiple
          />
        </label>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button className="focus-ring min-h-12 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-blue-700">
          {mode === "add" ? "Create Product" : "Save Changes"}
        </button>
        <button className="focus-ring min-h-12 rounded-md border border-slate-300 px-5 text-sm font-semibold text-slate-950 hover:bg-slate-50">
          Save Draft
        </button>
      </div>
    </form>
  );
}
