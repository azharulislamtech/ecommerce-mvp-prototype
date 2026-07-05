"use client";

import { deleteProductAction, updateProductStatusAction } from "@/app/actions";

type ProductRowActionsProps = {
  isActive: boolean;
  productId: string;
  productName: string;
};

export function ProductRowActions({ isActive, productId, productName }: ProductRowActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <form
        action={updateProductStatusAction}
        onSubmit={(event) => {
          const verb = isActive ? "deactivate" : "restore";

          if (!window.confirm(`Are you sure you want to ${verb} ${productName}?`)) {
            event.preventDefault();
          }
        }}
      >
        <input name="product_id" type="hidden" value={productId} />
        <input name="next_status" type="hidden" value={isActive ? "inactive" : "active"} />
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          type="submit"
        >
          {isActive ? "Deactivate" : "Restore"}
        </button>
      </form>
      <form
        action={deleteProductAction}
        onSubmit={(event) => {
          if (!window.confirm(`Delete ${productName}? Products with order history will be deactivated instead.`)) {
            event.preventDefault();
          }
        }}
      >
        <input name="product_id" type="hidden" value={productId} />
        <button
          className="rounded-md border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
          type="submit"
        >
          Delete
        </button>
      </form>
    </div>
  );
}
