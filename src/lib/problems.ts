// R3.1: the six homepage problems (owner decision Q3, plan §৩ 2026-11-02). Each card is
// matched by one problem tag; the admin enters these exact tags (R10.1 form). The list is
// also written in the section guideline files, so the two must change together.
export type Problem = { tag: string; section: "kids" | "home"; question: string };

export const PROBLEMS: Problem[] = [
  { tag: "letters-learning", section: "kids", question: "অক্ষর শেখাতে কষ্ট হচ্ছে?" },
  { tag: "screen-time", section: "kids", question: "বাচ্চা সারাদিন ফোন চায়?" },
  { tag: "counting-numbers", section: "kids", question: "গুনতে আর সংখ্যা চিনতে শেখাবেন?" },
  { tag: "kitchen-clutter", section: "home", question: "রান্নাঘর গোছানো থাকে না?" },
  { tag: "cleaning-time", section: "home", question: "ঘর পরিষ্কারে অনেক সময় যায়?" },
  { tag: "wardrobe-space", section: "home", question: "আলমারিতে জায়গা নেই?" }
];

// A problem card needs at least two in-stock products behind it (wireframe §৪).
export const MIN_PRODUCTS_PER_PROBLEM = 2;

export function problemByTag(tag: string) {
  return PROBLEMS.find((problem) => problem.tag === tag);
}

// "সমস্যা: …" line for a card: the first known problem among the product's tags.
export function problemLine(tags: string[] | undefined) {
  const problem = tags?.map(problemByTag).find(Boolean);
  return problem ? problem.question.replace(/\?$/, "") : null;
}
