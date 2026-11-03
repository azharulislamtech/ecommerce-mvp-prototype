"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { BrandLogo } from "@/components/ui/brand-logo";
import { CartIcon, MenuIcon, SearchIcon } from "@/components/ui/icons";

type MenuLink = { href: string; label: string };

const SEARCH_PLACEHOLDER = "পণ্য বা সমস্যা লিখে খুঁজুন…";

// R2.1: logo, Bangla search and cart, then the main menu. The links come from the
// server (mainMenuLinks), so a section shows only when it has real products.
export function SiteHeader({ links }: { links: MenuLink[] }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { hydrated, itemCount } = useCart();

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {isMenuOpen ? (
        <button
          aria-label="মেনু বন্ধ করুন"
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          onClick={closeMenu}
          tabIndex={-1}
          type="button"
        />
      ) : null}

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur" lang="bn">
        <div className="container-page flex h-16 items-center gap-3">
          <BrandLogo href="/" label="কেনা সাথী" onClick={closeMenu} />

          <form action="/products" className="ml-5 hidden flex-1 md:block" role="search">
            <label className="relative block">
              <span className="sr-only">পণ্য খুঁজুন</span>
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="focus-ring h-11 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-500"
                name="q"
                placeholder={SEARCH_PLACEHOLDER}
                type="search"
              />
            </label>
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <Link
              aria-label="খুঁজুন"
              className="focus-ring grid h-11 w-11 place-items-center rounded-md text-slate-700 transition hover:bg-slate-100 md:hidden"
              href="/products"
              onClick={closeMenu}
              title="খুঁজুন"
            >
              <SearchIcon />
            </Link>
            <Link
              aria-label={`কার্ট, ${hydrated ? itemCount : 0}টি পণ্য`}
              data-testid="cart-link"
              className="focus-ring relative grid h-11 w-11 place-items-center rounded-md text-slate-700 transition hover:bg-slate-100"
              href="/cart"
              onClick={closeMenu}
              title="কার্ট"
            >
              <CartIcon />
              <span className="absolute right-1 top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white" data-testid="cart-count">
                {hydrated ? itemCount : 0}
              </span>
            </Link>
            <div className="relative md:hidden">
              <button
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? "মেনু বন্ধ করুন" : "মেনু খুলুন"}
                className={`focus-ring relative z-[70] grid h-11 w-11 cursor-pointer place-items-center rounded-md text-slate-700 transition hover:bg-slate-100 ${
                  isMenuOpen ? "bg-slate-100" : ""
                }`}
                data-testid="mobile-menu-button"
                onClick={() => setIsMenuOpen((open) => !open)}
                title="মেনু"
                type="button"
              >
                <MenuIcon />
              </button>

              {isMenuOpen ? (
                <div className="absolute right-0 top-12 z-[80] w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-slate-200 bg-white p-3 shadow-soft">
                  <form action="/products" className="mb-2" role="search">
                    <label className="block">
                      <span className="sr-only">পণ্য খুঁজুন</span>
                      <input
                        className="focus-ring h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm placeholder:text-slate-500"
                        name="q"
                        placeholder={SEARCH_PLACEHOLDER}
                        type="search"
                      />
                    </label>
                  </form>
                  <nav aria-label="প্রধান মেনু" className="grid gap-1" data-testid="mobile-menu">
                    {links.map((link) => (
                      <Link
                        className="rounded-md px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        href={link.href}
                        key={link.href}
                        onClick={closeMenu}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <nav aria-label="প্রধান মেনু" className="hidden border-t border-slate-100 md:block" data-testid="main-menu">
          <div className="container-page flex h-11 items-center gap-1">
            {links.map((link) => (
              <Link
                className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
}
