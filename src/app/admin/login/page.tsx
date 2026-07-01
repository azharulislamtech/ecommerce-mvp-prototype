import Link from "next/link";
import { adminLoginAction } from "@/app/actions";

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link className="inline-flex items-center gap-2" href="/">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-950 text-sm font-bold text-white">
            SP
          </span>
          <span className="text-lg font-bold text-slate-950">ShopPilot Admin</span>
        </Link>
        <h1 className="mt-8 text-3xl font-bold text-slate-950">Admin Login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Supabase Auth can protect this route in phase one. This prototype redirects to the dashboard.
        </p>
        <form action={adminLoginAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">Email</span>
            <input
              className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
              defaultValue="admin@shoppilot.local"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">Password</span>
            <input
              className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
              defaultValue="password"
              name="password"
              required
              type="password"
            />
          </label>
          <button className="focus-ring min-h-12 w-full rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-blue-700">
            Sign In
          </button>
        </form>
      </section>
    </main>
  );
}
