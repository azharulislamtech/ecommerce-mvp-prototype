import { redirect } from "next/navigation";
import { adminLoginAction } from "@/app/actions";
import { BrandLogo } from "@/components/ui/brand-logo";
import { getCurrentAdmin } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

type AdminLoginPageProps = {
  searchParams?: {
    error?: string;
    reason?: string;
  };
};

function getMessage(searchParams: AdminLoginPageProps["searchParams"]) {
  if (searchParams?.error) {
    return searchParams.error;
  }

  if (searchParams?.reason === "auth-required") {
    return "Please sign in with an authorized admin account.";
  }

  return null;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/admin");
  }

  const message = getMessage(searchParams);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <BrandLogo href="/" label="Kena Sathi Admin" />
        <h1 className="mt-8 text-3xl font-bold text-slate-950">Admin Login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sign in to manage the Kena Sathi catalog, orders, payments, and delivery updates.
        </p>
        {message ? (
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {message}
          </div>
        ) : null}
        <form action={adminLoginAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">Email</span>
            <input
              autoComplete="email"
              className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">Password</span>
            <input
              autoComplete="current-password"
              className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
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