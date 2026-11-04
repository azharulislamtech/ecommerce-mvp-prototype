import type { Product } from "@/lib/data";
import { LEARNING_GOALS } from "@/lib/kids";
import { PROBLEMS } from "@/lib/problems";

// R2.10: search by name, category, section, problem tags and learning goals, in Bangla
// or English ("পাজল" finds a "Puzzle", "kitchen" finds রান্নাঘর). Hidden products never
// reach this (the catalog drops them first).

// Each group is one meaning; any word in a group finds the others. Add pairs here as real
// products arrive (keep them lowercase).
const WORD_GROUPS: string[][] = [
  ["পাজল", "পাজেল", "puzzle", "puzzles"],
  ["খেলনা", "toy", "toys"],
  ["অক্ষর", "বর্ণ", "letter", "letters", "alphabet", "abc"],
  ["শব্দ", "word", "words"],
  ["সংখ্যা", "নম্বর", "number", "numbers"],
  ["গণনা", "গুনতে", "count", "counting"],
  ["আঁকা", "drawing", "draw"],
  ["রং", "রঙ", "color", "colour", "colors", "colours"],
  ["বই", "book", "books"],
  ["ফ্ল্যাশকার্ড", "কার্ড", "flashcard", "flashcards", "card", "cards"],
  ["শিশু", "বাচ্চা", "kid", "kids", "child", "children", "baby"],
  ["রান্নাঘর", "kitchen"],
  ["পরিষ্কার", "clean", "cleaning"],
  ["আলমারি", "wardrobe", "closet", "almirah"],
  ["গোছানো", "অর্গানাইজার", "organizer", "organiser", "organizing", "storage"],
  ["কাটার", "cutter", "slicer"],
  ["র‍্যাক", "র্যাক", "rack"],
  ["মসলা", "মশলা", "spice", "spices"],
  ["সংসার", "home", "house"]
];

const SECTION_WORDS: Record<string, string> = {
  kids: "kids & baby শিশু বাচ্চা",
  home: "সংসারের সমাধান home solutions সংসার"
};

export function normalizeSearch(text: string) {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[‌‍]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}&]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function variants(term: string) {
  const group = WORD_GROUPS.find((words) => words.some((word) => word === term || (term.length >= 3 && word.startsWith(term))));
  return group ? [term, ...group] : [term];
}

export function searchText(product: Product) {
  const problems = (product.problemTags ?? []).flatMap((tag) => [tag.replace(/-/g, " "), PROBLEMS.find((p) => p.tag === tag)?.question ?? ""]);
  const goals = (product.learningGoals ?? []).flatMap((tag) => [tag.replace(/-/g, " "), LEARNING_GOALS.find((g) => g.tag === tag)?.title ?? ""]);
  return normalizeSearch(
    [product.name, product.shortDescription, product.category, product.section ? SECTION_WORDS[product.section] : "", ...problems, ...goals].join(" ")
  );
}

// Every word of the query must match (in either language); names count most.
export function searchProducts(products: Product[], query: string) {
  const terms = normalizeSearch(query).split(" ").filter(Boolean);
  if (!terms.length) return products;
  const scored = products
    .map((product, index) => {
      const haystack = searchText(product);
      const name = normalizeSearch(product.name);
      let score = 0;
      for (const term of terms) {
        const options = variants(term);
        if (!options.some((option) => haystack.includes(option))) return null;
        if (options.some((option) => name.includes(option))) score += 2;
        else score += 1;
      }
      return { product, score, index };
    })
    .filter((item): item is { product: Product; score: number; index: number } => item !== null);
  return scored.sort((left, right) => right.score - left.score || left.index - right.index).map((item) => item.product);
}
