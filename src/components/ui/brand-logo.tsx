import Image from "next/image";
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
      {/* The logo sits above the fold on every page; lazy loading left the slot blank on first
          paint. Next 16 deprecates `priority`; its docs recommend loading="eager". */}
      <Image alt="" aria-hidden="true" src="/icon.svg" width={36} height={36} className="h-9 w-9 shrink-0" fetchPriority="high" loading="eager" unoptimized />
      <span className="whitespace-nowrap text-lg font-bold text-slate-950">{label}</span>
    </>
  );
}

export function BrandLogo({ className = "", href, label, onClick }: BrandLogoProps) {
  const logoClassName = `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md ${href ? "focus-ring" : ""} ${className}`.trim();

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
