import { storefrontState } from "@/lib/storefront-state";

// R10.3: the admin categories page. After V12 the new section categories are seeded
// inactive and the legacy demo categories are hidden; this lets the owner switch the new
// ones on and off without SQL. Legacy categories are read-only here, so V12's cutover
// (and its rollback log) stays the only thing that changes them.

type CategoryLike = { id: string; name: string; slug: string; is_active: boolean; section: "kids" | "home" | null; parent_id: string | null };
type ProductLike = {
  category_id: string | null;
  is_active: boolean;
  availability: "available" | "coming_soon";
  stock_quantity: number;
  first_stocked_at: string | null;
};

export type CategoryRowView = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  isRoot: boolean;
  editable: boolean;
  inStock: number;
  comingSoon: number;
  warnings: string[];
};

export type CategoryGroupView = { key: "kids" | "home" | "legacy"; title: string; rows: CategoryRowView[] };

const GROUP_TITLES = { kids: "Kids & Baby", home: "সংসারের সমাধান · Home Solutions", legacy: "Legacy demo categories (hidden by V12, read-only)" };

export function buildCategoryGroups(categories: CategoryLike[], products: ProductLike[]): CategoryGroupView[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const childrenOf = (id: string) => categories.filter((category) => category.parent_id === id);
  const counts = (ids: string[]) => {
    let inStock = 0;
    let comingSoon = 0;
    for (const product of products) {
      if (!product.category_id || !ids.includes(product.category_id)) continue;
      const state = storefrontState({
        isActive: product.is_active,
        availability: product.availability,
        stock: product.stock_quantity,
        firstStockedAt: product.first_stocked_at
      });
      if (state === "in_stock") inStock += 1;
      if (state === "coming_soon") comingSoon += 1;
    }
    return { inStock, comingSoon };
  };

  const row = (category: CategoryLike): CategoryRowView => {
    const isRoot = !category.parent_id;
    // A section root counts the products of its sub-categories.
    const ids = isRoot && category.section ? [category.id, ...childrenOf(category.id).map((child) => child.id)] : [category.id];
    const { inStock, comingSoon } = counts(ids);
    const warnings: string[] = [];
    if (category.section) {
      if (inStock === 0) warnings.push(category.is_active
        ? "Active with no in-stock products: its page shows the empty note."
        : "No in-stock products yet: if you activate it, its page will show the empty note.");
      const parent = category.parent_id ? byId.get(category.parent_id) : undefined;
      if (category.is_active && parent && !parent.is_active) warnings.push(`Its section "${parent.name}" is inactive.`);
      if (!category.is_active && isRoot && childrenOf(category.id).some((child) => child.is_active)) {
        warnings.push("Some sub-categories are active while this section is inactive.");
      }
    }
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      active: category.is_active,
      isRoot,
      editable: Boolean(category.section),
      inStock,
      comingSoon,
      warnings
    };
  };

  const ordered = (section: "kids" | "home") =>
    categories
      .filter((category) => category.section === section && !category.parent_id)
      .flatMap((root) => [root, ...childrenOf(root.id).sort((a, b) => a.name.localeCompare(b.name))]);

  return [
    { key: "kids" as const, title: GROUP_TITLES.kids, rows: ordered("kids").map(row) },
    { key: "home" as const, title: GROUP_TITLES.home, rows: ordered("home").map(row) },
    { key: "legacy" as const, title: GROUP_TITLES.legacy, rows: categories.filter((category) => !category.section).map(row) }
  ].filter((group) => group.rows.length > 0);
}

// Server-side guard for the toggle: only new-section categories may be switched.
export function canToggleCategory(category: Pick<CategoryLike, "section"> | null) {
  return Boolean(category?.section);
}
