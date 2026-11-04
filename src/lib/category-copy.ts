// R5.1: the big question at the top of a category page (wireframe §৪ page 2), in the
// customer's words. Categories without an entry use their own name and description.
export const CATEGORY_COPY: Record<string, { question: string; intro: string }> = {
  "kids-baby": { question: "খেলতে খেলতে শেখাবেন?", intro: "৩–৬ বছরের শিশুর শেখার খেলনা ও উপকরণ।" },
  "kids-education": { question: "অক্ষর শেখাতে কষ্ট হচ্ছে?", intro: "অক্ষর, সংখ্যা আর হাতের কাজ শেখার খেলনা।" },
  "home-solutions": { question: "সংসারের কাজ সহজ করতে চান?", intro: "রান্নাঘর, পরিষ্কার আর ঘর গোছানোর কাজের জিনিস।" },
  "home-kitchen": { question: "রান্নাঘর গোছানো থাকে না?", intro: "জায়গা বাঁচানো আর কাজ দ্রুত করার রান্নাঘরের জিনিস।" },
  "home-cleaning": { question: "ঘর পরিষ্কারে অনেক সময় যায়?", intro: "কম সময়ে পরিষ্কার রাখার জিনিস।" },
  "home-organizing": { question: "আলমারিতে জায়গা নেই?", intro: "আলমারি আর ঘর গোছানোর জিনিস।" }
};

export const SECTION_NAMES: Record<"kids" | "home", { name: string; href: string }> = {
  kids: { name: "Kids & Baby", href: "/kids" },
  home: { name: "সংসারের সমাধান", href: "/products?section=home" }
};

export const PRICE_RANGES = [
  { key: "under-1500", label: "৳1,500-এর কম", test: (price: number) => price < 1500 },
  { key: "1500-3000", label: "৳1,500 – ৳3,000", test: (price: number) => price >= 1500 && price <= 3000 },
  { key: "over-3000", label: "৳3,000-এর বেশি", test: (price: number) => price > 3000 }
] as const;
