import Link from "next/link";
import { adminLogoutAction } from "@/app/actions";
import { BrandLogo } from "@/components/ui/brand-logo";
import { UserIcon } from "@/components/ui/icons";

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/products/new", label: "Add Product" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/", label: "Storefront" }
];

type AdminShellProps = {
  children: React.ReactNode;
  adminEmail: string;
};

export function AdminShell({ children, adminEmail }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
        <div className="container-page flex items-center justify-between gap-4 py-4 lg:block lg:w-auto lg:px-6">
          <BrandLogo href="/admin" label="Kena Sathi Admin" />
          <div className="hidden min-w-0 items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 lg:mt-8 lg:flex">
            <UserIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{adminEmail}</span>
          </div>
        </div>
        <nav className="container-page flex gap-2 overflow-x-auto pb-4 lg:block lg:w-auto lg:px-4">
          {adminLinks.map((link) => (
            <Link
              className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950 lg:block"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
          <form action={adminLogoutAction} className="shrink-0 lg:mt-2">
            <button className="rounded-md px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 lg:w-full lg:text-left">
              Sign Out
            </button>
          </form>
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="hidden border-b border-slate-200 bg-white px-8 py-4 lg:block">
          <p className="text-sm text-slate-500">Kena Sathi protected admin area</p>
        </header>
        <main className="container-page py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}