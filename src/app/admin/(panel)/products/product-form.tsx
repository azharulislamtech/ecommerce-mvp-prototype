"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createProductAction,
  deleteProductImageAction,
  updateProductAction,
  type ProductFormState
} from "@/app/actions";
import type { AdminProduct } from "@/lib/supabase/admin-catalog";
import type { CategoryRow } from "@/lib/supabase/database.types";
import { catalogReadiness } from "@/lib/catalog-readiness";
import { groupCategoryOptions } from "@/lib/admin/product-fields";

const initialState: ProductFormState = {
  status: "idle",
  message: "",
  fieldErrors: {}
};

type ProductFormProps = {
  categories: CategoryRow[];
  error?: string;
  mode: "add" | "edit";
  notice?: string;
  product?: AdminProduct;
};

type SubmitButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  intent: "publish" | "draft";
  variant?: "primary" | "secondary";
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm font-semibold text-rose-700">{message}</p>;
}

function SubmitButton({ children, disabled = false, intent, variant = "primary" }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      className={
        variant === "primary"
          ? "focus-ring min-h-12 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          : "focus-ring min-h-12 rounded-md border border-slate-300 px-5 text-sm font-semibold text-slate-950 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
      }
      disabled={isDisabled}
      name="intent"
      type="submit"
      value={intent}
    >
      {pending ? "Saving..." : children}
    </button>
  );
}

function DeleteImageButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="focus-ring rounded-md border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-300"
      disabled={pending}
      type="submit"
    >
      {pending ? "Removing" : "Remove"}
    </button>
  );
}

export function ProductForm({ categories, error, mode, notice, product }: ProductFormProps) {
  const action = mode === "edit" && product ? updateProductAction.bind(null, product.id) : createProductAction;
  const [state, formAction] = useActionState(action, initialState);
  const cannotSave = categories.length === 0;
  const currentStatus = product?.is_active === false ? "inactive" : "active";
  const contentIssues = product ? catalogReadiness(product) : [];
  const categoryGroups = groupCategoryOptions(categories);
  // After an error, show what the admin typed; otherwise the saved product.
  const value = (name: string, saved: string | number | null | undefined) =>
    state.values ? state.values[name] ?? "" : saved ?? "";
  const savedAvailability = product?.availability ?? "available";

  return (
    <div className="space-y-5">
      {contentIssues.length > 0 && <aside className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <h2 className="font-bold">Improve this listing before promotion</h2>
        <ul className="mt-2 list-inside list-disc">{contentIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
      </aside>}
      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}
      {state.status === "error" ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {state.message}
        </div>
      ) : null}
      {cannotSave ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Create at least one category before saving products.
        </div>
      ) : null}

      <form action={formAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={state.values ? JSON.stringify(state.values) : "saved"}>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">Product Name</span>
            <input
              className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
              defaultValue={value("name", product?.name)}
              name="name"
              required
            />
            <FieldError message={state.fieldErrors.name} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">Slug</span>
            <input
              className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
              defaultValue={value("slug", product?.slug)}
              name="slug"
              placeholder="auto-generated-from-name"
            />
            <FieldError message={state.fieldErrors.slug} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">Category</span>
            <select
              className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              defaultValue={value("category_id", product?.category_id)}
              name="category_id"
              required
            >
              <option value="">Choose category</option>
              {categoryGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option disabled={option.disabled} key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <FieldError message={state.fieldErrors.category_id} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">Status</span>
            <select
              className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              defaultValue={value("status", currentStatus)}
              name="status"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">Price</span>
            <input
              className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
              defaultValue={value("price", product?.price)}
              min="0"
              name="price"
              required
              step="0.01"
              type="number"
            />
            <FieldError message={state.fieldErrors.price} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">Discount Price</span>
            <input
              className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
              defaultValue={value("discount_price", product?.discount_price)}
              min="0"
              name="discount_price"
              step="0.01"
              type="number"
            />
            <FieldError message={state.fieldErrors.discount_price} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">Stock Quantity</span>
            <input
              className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
              defaultValue={value("stock_quantity", product?.stock_quantity ?? 0)}
              min="0"
              name="stock_quantity"
              required
              step="1"
              type="number"
            />
            <FieldError message={state.fieldErrors.stock_quantity} />
          </label>
          <label className="flex min-h-12 items-center gap-3 self-end rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-950">
            <input
              className="h-4 w-4 rounded border-slate-300 text-blue-700"
              defaultChecked={state.values ? state.values.is_featured === "on" : product?.is_featured ?? false}
              name="is_featured"
              type="checkbox"
            />
            Featured product
          </label>
          <fieldset className="rounded-md border border-slate-200 p-4 lg:col-span-2" data-testid="storefront-fields">
            <legend className="px-1 text-sm font-bold text-slate-950">Storefront details</legend>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="block">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">Availability</span>
                  <select
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    defaultValue={value("availability", savedAvailability)}
                    aria-describedby="availability-help"
                    name="availability"
                  >
                    <option value="available">Available (sell when stock is above 0)</option>
                    <option value="coming_soon">Coming soon (stock must be 0)</option>
                  </select>
                </label>
                <p id="availability-help" className="mt-2 text-xs leading-5 text-slate-500">
                  Choose Coming soon only for goods you will stock. No orders or payment are taken. When the goods arrive, add stock and
                  the product goes on sale by itself.
                </p>
                <FieldError message={state.fieldErrors.availability} />
              </div>
              <div className="block">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">Estimated price (coming soon only)</span>
                  <input
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                    defaultValue={value("estimated_price", product?.estimated_price)}
                    min="0"
                    aria-describedby="estimated_price-help"
                    name="estimated_price"
                    step="0.01"
                    type="number"
                  />
                </label>
                <p id="estimated_price-help" className="mt-2 text-xs leading-5 text-slate-500">Shown as &ldquo;আনুমানিক দাম&rdquo;. Leave empty if you do not know it yet.</p>
                <FieldError message={state.fieldErrors.estimated_price} />
              </div>
              <div className="block">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">Minimum age (months)</span>
                  <input
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                    defaultValue={value("age_min_months", product?.age_min_months)}
                    max="216"
                    min="0"
                    name="age_min_months"
                    step="1"
                    type="number"
                  />
                </label>
                <FieldError message={state.fieldErrors.age_min_months} />
              </div>
              <div className="block">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">Maximum age (months)</span>
                  <input
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                    defaultValue={value("age_max_months", product?.age_max_months)}
                    max="216"
                    min="0"
                    aria-describedby="age_max_months-help"
                    name="age_max_months"
                    step="1"
                    type="number"
                  />
                </label>
                <p id="age_max_months-help" className="mt-2 text-xs leading-5 text-slate-500">For Kids products, such as 36 to 72 for 3–6 years. Leave both empty otherwise.</p>
                <FieldError message={state.fieldErrors.age_max_months} />
              </div>
              <div className="block">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">Problem tags</span>
                  <input
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                    defaultValue={value("problem_tags", product?.problem_tags.join(", "))}
                    aria-describedby="problem_tags-help"
                    name="problem_tags"
                    placeholder="kitchen-storage, small-space"
                  />
                </label>
                <p id="problem_tags-help" className="mt-2 text-xs leading-5 text-slate-500">Comma separated, lowercase English with hyphens, up to 10.</p>
                <FieldError message={state.fieldErrors.problem_tags} />
              </div>
              <div className="block">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">Learning goals</span>
                  <input
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                    defaultValue={value("learning_goals", product?.learning_goals.join(", "))}
                    aria-describedby="learning_goals-help"
                    name="learning_goals"
                    placeholder="bangla-letters, counting"
                  />
                </label>
                <p id="learning_goals-help" className="mt-2 text-xs leading-5 text-slate-500">Kids products only. Same format as problem tags.</p>
                <FieldError message={state.fieldErrors.learning_goals} />
              </div>
              <div className="block lg:col-span-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">Video link</span>
                  <input
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                    defaultValue={value("video_url", product?.video_url)}
                    aria-describedby="video_url-help"
                    name="video_url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    type="url"
                  />
                </label>
                <p id="video_url-help" className="mt-2 text-xs leading-5 text-slate-500">
                  Your own https YouTube or Facebook video of the real product. Do not upload video to the site.
                </p>
                <FieldError message={state.fieldErrors.video_url} />
              </div>
            </div>
          </fieldset>
          <label className="block lg:col-span-2">
            <span className="text-sm font-semibold text-slate-950">Short Description</span>
            <input
              className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
              defaultValue={value("short_description", product?.short_description ?? "")}
              name="short_description"
              required
            />
            <FieldError message={state.fieldErrors.short_description} />
          </label>
          <label className="block lg:col-span-2">
            <span className="text-sm font-semibold text-slate-950">Full Description</span>
            <textarea
              className="focus-ring mt-2 min-h-32 w-full rounded-md border border-slate-200 px-3 py-3 text-sm"
              defaultValue={value("description", product?.description ?? "")}
              name="description"
              required
            />
            <FieldError message={state.fieldErrors.description} />
          </label>
          <label className="block lg:col-span-2">
            <span className="text-sm font-semibold text-slate-950">
              {mode === "edit" ? "Add Product Images" : "Product Images"}
            </span>
            <input
              accept="image/avif,image/jpeg,image/png,image/webp"
              className="focus-ring mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm"
              multiple
              name="images"
              type="file"
            />
            <FieldError message={state.fieldErrors.images} />
          </label>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <SubmitButton disabled={cannotSave} intent="publish">
            {mode === "add" ? "Create Product" : "Save Changes"}
          </SubmitButton>
          <SubmitButton disabled={cannotSave} intent="draft" variant="secondary">
            Save Draft
          </SubmitButton>
          <Link
            className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 px-5 text-sm font-semibold text-slate-950 hover:bg-slate-50"
            href="/admin/products"
          >
            Cancel
          </Link>
        </div>
      </form>

      {mode === "edit" && product?.images.length ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Current Images</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {product.images.map((image) => (
              <article className="rounded-md border border-slate-200 p-3" key={image.id}>
                <a
                  aria-label={`Open image for ${product.name}`}
                  className="block aspect-video rounded-md border border-slate-200 bg-slate-100 bg-cover bg-center"
                  href={image.image_url}
                  rel="noreferrer"
                  style={{ backgroundImage: `url(${image.image_url})` }}
                  target="_blank"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">Sort {image.sort_order}</p>
                  <form
                    action={deleteProductImageAction}
                    onSubmit={(event) => {
                      if (!window.confirm("Remove this product image?")) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input name="product_id" type="hidden" value={product.id} />
                    <input name="image_id" type="hidden" value={image.id} />
                    <DeleteImageButton />
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
