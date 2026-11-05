import { deleteInterestAction, runDataRetentionAction, updateInterestStatusAction } from "@/app/actions";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ notice?: string | string[]; error?: string | string[] }> };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const STATUS_LABELS = { new: "New", contacted: "Contacted", purchased: "Purchased", not_interested: "Not interested" } as const;
const date = (value: string | null) => (value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "—");

// R7.2 / R9.2: interest requests per product (admin only; never shown publicly), status and
// contact date, delete on request, and the data retention run.
export default async function AdminInterestPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseAuthServerClient();
  const [{ data: requests }, { data: runs }] = await Promise.all([
    supabase.from("interest_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("data_retention_runs").select("*").order("ran_at", { ascending: false }).limit(1)
  ]);
  const rows = requests ?? [];
  const productIds = [...new Set(rows.map((row) => row.product_id))];
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, name, slug").in("id", productIds)
    : { data: [] as { id: string; name: string; slug: string }[] };
  const productName = new Map((products ?? []).map((product) => [product.id, product.name]));
  const byProduct = productIds.map((id) => ({ id, name: productName.get(id) ?? id, rows: rows.filter((row) => row.product_id === id) }));
  const lastRun = runs?.[0];
  const notice = first(params?.notice);
  const error = first(params?.error);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-blue-700">Coming soon</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Interest requests</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          People who asked to hear when a coming-soon product arrives. No money is taken. Contact them within 24–48 hours of the
          stock arriving, then mark them contacted: a request is deleted 30 days after contact, or 6 months after it was made.
        </p>
      </div>
      {notice ? <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">{notice}</p> : null}
      {error ? <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">{error}</p> : null}

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-testid="retention-panel">
        <h2 className="text-lg font-bold text-slate-950">Data retention</h2>
        <p className="mt-1 text-sm text-slate-600">
          Runs daily on schedule. Last run: {lastRun ? `${date(lastRun.ran_at)} (${lastRun.run_trigger})` : "never"}.
        </p>
        <form action={runDataRetentionAction} className="mt-3">
          <button className="focus-ring min-h-10 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-950 hover:bg-slate-50" type="submit">
            Run data retention now
          </button>
        </form>
      </section>

      {byProduct.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600" data-testid="interest-empty">No interest requests yet.</p>
      ) : (
        <div className="space-y-6">
          {byProduct.map((group) => (
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-testid="interest-product" key={group.id}>
              <h2 className="text-lg font-bold text-slate-950">
                {group.name} <span className="text-sm font-normal text-slate-500">({group.rows.length} interested)</span>
              </h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {group.rows.map((row) => (
                  <li className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid="interest-row" key={row.id}>
                    <div className="text-sm">
                      <p className="font-semibold text-slate-950">{row.phone}{row.customer_name ? ` · ${row.customer_name}` : ""}</p>
                      <p className="text-xs text-slate-500">
                        Qty {row.quantity ?? "—"} · Asked {date(row.created_at)} · Contacted {date(row.contacted_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={updateInterestStatusAction} className="flex items-center gap-2">
                        <input name="interest_id" type="hidden" value={row.id} />
                        <select aria-label="Status" className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" defaultValue={row.status} name="status">
                          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <button className="focus-ring min-h-10 rounded-md border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50" type="submit">Save</button>
                      </form>
                      <form action={deleteInterestAction}>
                        <input name="interest_id" type="hidden" value={row.id} />
                        <button className="focus-ring min-h-10 rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50" type="submit">Delete</button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
