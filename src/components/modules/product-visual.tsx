import type { ProductVisual as ProductVisualType } from "@/lib/data";

type ProductVisualProps = {
  label: string;
  visual: ProductVisualType;
  large?: boolean;
  compact?: boolean;
};

export function ProductVisual({ label, visual, large = false, compact = false }: ProductVisualProps) {
  return (
    <div
      aria-label={`${label} product image`}
      className={`product-visual visual-${visual} ${large ? "large" : ""} ${compact ? "compact" : ""}`}
      role="img"
    >
      <span className="product-shape shape-main" />
      <span className="product-shape shape-side" />
      <span className="product-shape shape-dot" />
    </div>
  );
}
