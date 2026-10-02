import Link from "next/link";
import { moderateProductReviewAction } from "@/app/actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminProductReviews } from "@/lib/supabase/reviews";

export const dynamic = "force-dynamic";

type AdminReviewListPageProps = {
  searchParams?: Promise<{
    status?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

const statusFilters = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" }
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusTone(status: string): "green" | "red" | "amber" {
  if (status === "approved") {
    return "green";
  }

  return status === "rejected" ? "red" : "amber";
}

export default async function AdminReviewListPage({ searchParams }: AdminReviewListPageProps) {
  const resolvedSearchParams = await searchParams;
  const status = firstParam(resolvedSearchParams?.status) ?? "";
  const notice = firstParam(resolvedSearchParams?.notice);
  const error = firstParam(resolvedSearchParams?.error);
  const reviews = await getAdminProductReviews(status);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-blue-700">Reviews</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Review Moderation</h1>
        <p className="mt-2 text-sm text-slate-600">
          Reviews come only from verified delivered orders. Approve a review to publish it on the product page.
        </p>
      </div>

      {notice ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Link
            className={
              filter.value === status
                ? "rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
                : "rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            }
            href={filter.value ? `/admin/reviews?status=${filter.value}` : "/admin/reviews"}
            key={filter.value || "all"}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <section className="grid gap-4">
        {reviews.map((review) => (
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={review.id}>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={statusTone(review.status)}>{review.status}</StatusBadge>
              <span className="text-sm font-bold text-amber-600">{review.rating}/5</span>
              <span className="text-xs text-slate-500">{formatDate(review.created_at)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700">
              <span>
                Product:{" "}
                {review.product ? (
                  <Link className="font-semibold text-blue-700 hover:underline" href={`/products/${review.product.slug}`}>
                    {review.product.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-500">Deleted product</span>
                )}
              </span>
              <span>
                Order: <span className="font-semibold text-slate-950">{review.order?.order_number ?? "Unknown"}</span>
              </span>
            </div>
            {review.title ? <h2 className="mt-3 text-base font-bold text-slate-950">{review.title}</h2> : null}
            <p className="mt-2 text-sm leading-6 text-slate-600">{review.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {review.status !== "approved" ? (
                <form action={moderateProductReviewAction}>
                  <input name="review_id" type="hidden" value={review.id} />
                  <input name="status" type="hidden" value="approved" />
                  <button className="focus-ring rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
                    Approve
                  </button>
                </form>
              ) : null}
              {review.status !== "rejected" ? (
                <form action={moderateProductReviewAction}>
                  <input name="review_id" type="hidden" value={review.id} />
                  <input name="status" type="hidden" value="rejected" />
                  <button className="focus-ring rounded-md border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                    Reject
                  </button>
                </form>
              ) : null}
            </div>
          </article>
        ))}
        {!reviews.length ? (
          <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
            No reviews matched this filter.
          </p>
        ) : null}
      </section>
    </div>
  );
}
