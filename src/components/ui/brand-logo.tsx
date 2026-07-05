import Link from "next/link";
import type { MouseEventHandler } from "react";

type BrandLogoProps = {
  className?: string;
  href?: string;
  label?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

function BrandLogoContent({ label = "Kena Sathi" }: Pick<BrandLogoProps, "label">) {
  return (
    <>
      <span className="relative grid h-9 w-9 place-items-center rounded-md bg-emerald-700 text-sm font-black text-white shadow-sm ring-1 ring-emerald-200">
        KS
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white" />
      </span>
      <span className="text-lg font-bold text-slate-950">{label}</span>
    </>
  );
}

export function BrandLogo({ className = "", href, label, onClick }: BrandLogoProps) {
  const logoClassName = `inline-flex shrink-0 items-center gap-2 ${className}`.trim();

  if (href) {
    return (
      <Link aria-label={label ?? "Kena Sathi"} className={logoClassName} href={href} onClick={onClick}>
        <BrandLogoContent label={label} />
      </Link>
    );
  }

  return (
    <div aria-label={label ?? "Kena Sathi"} className={logoClassName}>
      <BrandLogoContent label={label} />
    </div>
  );
}