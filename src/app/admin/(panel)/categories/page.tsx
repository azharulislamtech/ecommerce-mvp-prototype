import { setCategoryActiveAction } from "@/app/actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildCategoryGroups } from "@/lib/admin/category-admin";
import { getAdminCategories, getAdminProducts } from "@/lib/supabase/admin-catalog";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ notice?: string | string[]; error?: string | string[] }> };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// R10.3: switch the new section categories on and off without SQL.
export default async function AdminCategoriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const [categories, products] = await Promise.all([getAdminCategories(), getAdminProducts()]);
  const groups = buildCategoryGroups(categories, products);
  const notice = first(params?.notice);
  const error = first(params?.error);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-blue-700">Catalog</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Categories</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Switch a category on when it has products to show. The menus and section pages already hide anything without
          in-stock products, so an active but empty category shows an honest empty note.
        </p>
      </div>
      {notice ? <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">{notice}</p> : null}
      {error ? <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">{error}</p> : null}

      <div className="space-y-6">
        {groups.map((group) => (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-testid={`category-group-${group.key}`} key={group.key}>
            <h2 className="text-lg font-bold text-slate-950">{group.title}</h2>
            <ul className="mt-4 divide-y divide-slate-100">
              {group.rows.map((row) => (
                <li className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid={`category-row-${row.slug}`} key={row.id}>
                  <div className={row.isRoot || !row.editable ? "" : "pl-5"}>
                    <p className="font-semibold text-slate-950">
                      {row.name} <span className="text-xs font-normal text-slate-500">/{row.slug}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      In stock: {row.inStock} · Coming soon: {row.comingSoon}
                    </p>
                    {row.warnings.map((warning) => (
                      <p className="mt-1 text-xs font-semibold text-amber-700" key={warning}>{warning}</p>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge tone={row.active ? "green" : "slate"}>{row.active ? "Active" : "Inactive"}</StatusBadge>
                    {row.editable ? (
                      <form action={setCategoryActiveAction}>
                        <input name="category_id" type="hidden" value={row.id} />
                        <input name="next_active" type="hidden" value={row.active ? "false" : "true"} />
                        <button
                          className="focus-ring min-h-10 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-950 hover:bg-slate-50"
                          type="submit"
                        >
                          {row.active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
