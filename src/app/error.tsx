"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="container-page py-16" role="alert">
    <h1 className="text-2xl font-bold">We could not load this page</h1>
    <p className="my-4">Please try again. If you just placed an order, check Track Order before starting another checkout.</p>
    <button className="focus-ring rounded bg-slate-950 px-5 py-3 text-white" onClick={reset}>Try again</button>
    <a className="ml-4 underline" href="/track-order">Track Order</a>
  </section>;
}
