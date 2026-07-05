"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { CartIcon, MenuIcon, SearchIcon } from "@/components/ui/icons";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/track-order", label: "Track" }
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { hydrated, itemCount } = useCart();

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {isMenuOpen ? (
        <button
          aria-label="Close menu backdrop"
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          onClick={closeMenu}
          tabIndex={-1}
          type="button"
        />
      ) : null}

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-page flex h-16 items-center gap-3">
          <Link className="flex shrink-0 items-center gap-2" href="/" onClick={closeMenu}>
            <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-950 text-sm font-bold text-white">
              SP
            </span>
            <span className="text-lg font-bold text-slate-950">ShopPilot</span>
          </Link>

          <form action="/products" className="ml-5 hidden flex-1 md:block">
            <label className="relative block">
              <span className="sr-only">Search products</span>
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="focus-ring h-11 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-500"
                name="q"
                placeholder="Search products"
                type="search"
              />
            </label>
          </form>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <Link
              aria-label="Search"
              className="focus-ring grid h-10 w-10 place-items-center rounded-md text-slate-700 transition hover:bg-slate-100 md:hidden"
              href="/products"
              onClick={closeMenu}
              title="Search"
            >
              <SearchIcon />
            </Link>
            <Link
              aria-label={`Cart with ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
              data-testid="cart-link"
              className="focus-ring relative grid h-10 w-10 place-items-center rounded-md text-slate-700 transition hover:bg-slate-100"
              href="/cart"
              onClick={closeMenu}
              title="Cart"
            >
              <CartIcon />
              <span className="absolute right-1 top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white" data-testid="cart-count">
                {hydrated ? itemCount : 0}
              </span>
            </Link>
            <div className="relative md:hidden">
              <button
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                className={`focus-ring relative z-[70] grid h-10 w-10 cursor-pointer place-items-center rounded-md text-slate-700 transition hover:bg-slate-100 ${
                  isMenuOpen ? "bg-slate-100" : ""
                }`}
                onClick={() => setIsMenuOpen((open) => !open)}
                title="Menu"
                type="button"
              >
                <MenuIcon />
              </button>

              {isMenuOpen ? (
                <div className="absolute right-0 top-12 z-[80] w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-slate-200 bg-white p-3 shadow-soft">
                  <nav className="grid gap-1">
                    {navLinks.map((link) => (
                      <Link
                        className="rounded-md px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        href={link.href}
                        key={link.href}
                        onClick={closeMenu}
                      >
                        {link.label}
                      </Link>
                    ))}
                    <Link
                      className="rounded-md px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      href="/admin/login"
                      onClick={closeMenu}
                    >
                      Admin
                    </Link>
                  </nav>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
