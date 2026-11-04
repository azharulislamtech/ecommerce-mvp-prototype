import type { Product } from "@/lib/data";

// R4.1: Kids & Baby page (wireframe §৪ page 5). The learning tiles are matched by the
// product's learning goals (V11 learning_goals); the admin enters these exact tags. The
// list is also written in the Kids guideline (§৫.৪), and a unit test keeps both in step.
export type LearningGoal = { tag: string; title: string; question: string };

export const LEARNING_GOALS: LearningGoal[] = [
  { tag: "letters-words", title: "অক্ষর ও শব্দ", question: "অক্ষর চিনতে আর শব্দ বানাতে শিখবে?" },
  { tag: "numbers-counting", title: "সংখ্যা ও গণনা", question: "গুনতে আর সংখ্যা চিনতে শিখবে?" },
  { tag: "hand-skills", title: "হাতের দক্ষতা", question: "হাতের আঙুল আর মনোযোগ বাড়াবে?" },
  { tag: "drawing-colors", title: "আঁকা ও রং", question: "আঁকতে আর রং চিনতে শিখবে?" }
];

// Launch range is 3–6 years (wireframe), in one-year buttons. Months match V11's age columns.
export const AGE_BUCKETS = [
  { key: "3-4", label: "৩–৪ বছর", min: 36, max: 48 },
  { key: "4-5", label: "৪–৫ বছর", min: 48, max: 60 },
  { key: "5-6", label: "৫–৬ বছর", min: 60, max: 72 }
] as const;

export type AgeKey = (typeof AGE_BUCKETS)[number]["key"];

// A product fits an age button when its range overlaps that year. A product with no age
// range set is not placed in any age button (it still shows in the full list).
export function fitsAge(product: Pick<Product, "ageMinMonths" | "ageMaxMonths">, key: string) {
  const bucket = AGE_BUCKETS.find((item) => item.key === key);
  if (!bucket) return true;
  if (product.ageMinMonths === undefined && product.ageMaxMonths === undefined) return false;
  const min = product.ageMinMonths ?? 0;
  const max = product.ageMaxMonths ?? 216;
  // Ranges are [min, max): a toy saved as 36–48 months ("৩–৪ বছর") is not a "৪–৫ বছর" toy.
  return min < bucket.max && max > bucket.min;
}

export function hasGoal(product: Pick<Product, "learningGoals">, tag: string) {
  return product.learningGoals?.includes(tag) ?? false;
}

// Only buttons and tiles with at least one in-stock product behind them are shown.
export function kidsPageData(kidsProducts: Product[]) {
  const inStock = kidsProducts.filter((product) => product.state === "in_stock");
  return {
    inStock,
    comingSoon: kidsProducts.filter((product) => product.state === "coming_soon"),
    ages: AGE_BUCKETS.filter((bucket) => inStock.some((product) => fitsAge(product, bucket.key))),
    goals: LEARNING_GOALS.map((goal) => ({ ...goal, count: inStock.filter((product) => hasGoal(product, goal.tag)).length }))
      .filter((goal) => goal.count > 0)
  };
}

// "শেখায়: …" line for a Kids card, from the known learning goals.
export function learningLine(goals: string[] | undefined) {
  const titles = LEARNING_GOALS.filter((goal) => goals?.includes(goal.tag)).map((goal) => goal.title);
  return titles.length ? titles.join(", ") : null;
}
