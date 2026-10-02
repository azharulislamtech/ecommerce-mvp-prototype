export function catalogReadiness(product: { short_description: string | null; description: string | null; images: unknown[] }) {
  const issues: string[] = [];
  if (!product.short_description || /^(short description|test|sample|placeholder)$/i.test(product.short_description.trim())) {
    issues.push("Replace the placeholder summary with the product's actual model and main benefit.");
  }
  if (!product.description || product.description.trim().length < 80) {
    issues.push("Add accurate specifications, included items and applicable warranty/return information.");
  }
  if (!product.images.length) issues.push("Upload a clear photo of the actual product.");
  return issues;
}
