import Image from "next/image";
import type { ProductVisual as ProductVisualType } from "@/lib/data";

type ProductVisualProps = {
  imageAlt?: string;
  imageUrl?: string;
  label: string;
  visual: ProductVisualType;
  large?: boolean;
  compact?: boolean;
};

export function ProductVisual({
  imageAlt,
  imageUrl,
  label,
  visual,
  large = false,
  compact = false
}: ProductVisualProps) {
  const className = `product-visual visual-${visual} ${large ? "large" : ""} ${compact ? "compact" : ""} ${imageUrl ? "has-image" : ""}`;

  if (imageUrl) {
    return (
      <div className={className}>
        <Image
          alt={imageAlt ?? `${label} product image`}
          className="product-image"
          fill
          sizes={large ? "(min-width: 1024px) 50vw, 100vw" : compact ? "80px" : "(min-width: 1024px) 25vw, 50vw"}
          src={imageUrl}
          loading={large ? "eager" : "lazy"}
          fetchPriority={large ? "high" : "auto"}
        />
      </div>
    );
  }

  return (
    <div aria-label={`${label} product image`} className={className} role="img">
      <span className="product-shape shape-main" />
      <span className="product-shape shape-side" />
      <span className="product-shape shape-dot" />
    </div>
  );
}
