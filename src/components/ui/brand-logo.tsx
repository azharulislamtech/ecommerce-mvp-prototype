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
      <Image alt="" aria-hidden="true" src="/icon.svg" width={36} height={36} className="h-9 w-9 shrink-0" unoptimized />
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
