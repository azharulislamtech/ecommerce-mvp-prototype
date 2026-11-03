// R10.2: guideline checklist and warnings beside the admin product form.
// The checklist lines are copied word for word from the guideline files, and
// tests/unit/listing-guidelines.test.ts fails if a line no longer appears there.
// Change a rule in the docs first, then update the copy here.

export type GuidelineSection = "kids" | "home";

export type ChecklistGroup = { title: string; source: string; items: string[] };

export const COMMON_CHECKLIST: ChecklistGroup[] = [
  {
    title: "শরিয়াহ ও সততা",
    source: "docs/product-guideline-common.md §৯",
    items: [
      "পণ্য নিজের মালিকানা ও দখলে আছে; অথবা এজেন্ট, সালাম বা ইস্তিসনার শর্ত বাস্তবে পূরণ হচ্ছে, আর চুক্তিতে স্পষ্ট লেখা",
      "ছবি আর ডিজাইন নিজের, অথবা অনুমতি বা লাইসেন্স আছে; সাপ্লায়ারের ছবি হলে \"নমুনা ছবি\" লেখা",
      "ভিডিওতে ব্যাকগ্রাউন্ড মিউজিক নেই",
      "`discount_price` সত্য; ভুয়া রিভিউ, ভুয়া স্টক, ভুয়া কাউন্টডাউন বা অতিরঞ্জন নেই",
      "প্রমাণ ছাড়া \"non-toxic\", \"certified\" বা \"১০০% গ্যারান্টি\" লেখা নেই"
    ]
  },
  {
    title: "সাইট",
    source: "docs/product-guideline-common.md §৯",
    items: [
      "`stock_quantity` = হাতে থাকা সংখ্যা (supplier-এর স্টক নয়)",
      "স্টক ০ হলে: এখন `is_active` বন্ধ (অংশ ৩.১); নতুন ব্যাজ চালু হলে অংশ ৩.২-এর চার অবস্থার একটা, আর \"স্টক শেষ\" শুধু আগে সত্যিই স্টকে থাকা পণ্যে",
      "slug আর ক্যাটাগরি ঠিক",
      "স্টকে থাকা পণ্যে অন্তত ৪টা আসল ছবি, `alt_text` সহ; \"শীঘ্রই আসছে\" পণ্যে নমুনা ছবি চলবে, তবে \"নমুনা ছবি\" বা \"ডিজিটাল নমুনা — আসল পণ্যের ছবি নয়\" লেখা থাকতে হবে",
      "দাম লাভের সূত্র দিয়ে যাচাই করা; ডেলিভারি চার্জ আর ফেরতের শর্ত স্পষ্ট"
    ]
  },
  {
    title: "হিসাব",
    source: "docs/product-guideline-common.md §৯",
    items: [
      "ইনভয়েস আর সরবরাহকারীর লিখিত শর্ত সংরক্ষিত",
      "যাকাতের হিসাবের জন্য স্টকের তথ্য আপডেট"
    ]
  }
];

export const SECTION_CHECKLIST: Record<GuidelineSection, ChecklistGroup> = {
  kids: {
    title: "শিশুদের শিক্ষা",
    source: "docs/kids-education-product-guideline.md §৭",
    items: [
      "মিউজিকযুক্ত খেলনা নয়; পুতুল শুধু শিশুদের জন্য; অশালীন কিছু নেই; একেবারে বাস্তব চেহারার পুতুল নয়",
      "নমুনা হাতে নিয়ে নিরাপত্তা যাচাই (অংশ ৪) করা হয়েছে, গিলে ফেলার পরীক্ষাসহ",
      "বয়সসীমা, মাপ, উপকরণ, টুকরোর সংখ্যা আর ওজন বিবরণে আছে",
      "জানা ত্রুটি বা সীমাবদ্ধতা লেখা আছে",
      "ছবিতে শিশুর মুখ নেই; মকআপ শুধু \"শীঘ্রই আসছে\" অবস্থায়",
      "ক্যাটাগরি \"শিশুদের শিক্ষা\""
    ]
  },
  home: {
    title: "সংসারের সমাধান",
    source: "docs/home-solutions-product-guideline.md §৭",
    items: [
      "তিন প্রশ্নের পরীক্ষায় তিনটাতেই হ্যাঁ",
      "\"রাখা যাবে না\" তালিকায় পড়ে না",
      "এই ভাগের বাড়তি মান যাচাই (অংশ ৫) করা হয়েছে",
      "পেজের একদম উপরে সমস্যার লাইন আছে",
      "নিজেদের তোলা ১৫–৩০ সেকেন্ডের ভিডিও আছে, মিউজিক ছাড়া",
      "বিবরণ টেমপ্লেট অনুযায়ী পুরোটা লেখা, জানা সীমাবদ্ধতাসহ",
      "অন্তত একটা সমস্যা ট্যাগ ঠিক করা হয়েছে",
      "অন্তত ৩টা সাধারণ প্রশ্ন, রিটার্নের প্রশ্নসহ"
    ]
  }
};

export function checklistFor(section: GuidelineSection | null) {
  return section ? [...COMMON_CHECKLIST, SECTION_CHECKLIST[section]] : COMMON_CHECKLIST;
}

// Claims the guidelines forbid without proof (common §২.২, kids §৪). Matching is a
// prompt to check, not a block: a claim backed by a real report is allowed.
const CLAIM_RULES: { label: string; pattern: RegExp }[] = [
  { label: "non-toxic", pattern: /non[\s-]?toxic|নন[\s-]?টক্সিক|বিষমুক্ত/i },
  { label: "certified", pattern: /\bcertified\b|সার্টিফাইড|সনদপ্রাপ্ত/i },
  { label: "১০০% গ্যারান্টি / নিরাপদ", pattern: /(100|১০০)\s*%\s*(guarantee|guaranteed|safe|গ্যারান্টি|নিরাপদ)/i },
  { label: "জীবনভর চলবে", pattern: /জীবনভর|lifetime|life\s*long/i },
  { label: "\"মাত্র কয়েকটা বাকি\"", pattern: /(মাত্র\s*[০-৯0-9]+\s*(টা|টি|পিস)?\s*বাকি)|only\s+[0-9]+\s+left/i }
];

export type ListingDraft = {
  name: string;
  shortDescription: string;
  description: string;
  price: string;
  discountPrice: string;
  availability: string;
  stock: string;
  estimatedPrice: string;
  problemTags: string;
  section: GuidelineSection | null;
};

export function listingWarnings(draft: ListingDraft) {
  const warnings: string[] = [];
  const text = [draft.name, draft.shortDescription, draft.description].join("\n");
  for (const rule of CLAIM_RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      warnings.push(`"${match[0]}" লেখা আছে (${rule.label})। পরীক্ষার রিপোর্ট বা লিখিত প্রমাণ না থাকলে সরিয়ে দিন।`);
    }
  }
  if (draft.discountPrice.trim()) {
    warnings.push(
      "ছাড়ের দাম দিয়েছেন। শুধু তখনই রাখুন, যখন আসলেই আগে মূল দামে বিক্রি হয়েছিল, বা সময়সীমাসহ সত্যিকারের ছাড়। বানানো \"আগের দাম\" নয়।"
    );
  }
  if (draft.availability === "coming_soon" && draft.discountPrice.trim()) {
    warnings.push("\"শীঘ্রই আসছে\" পণ্যে ছাড় দেখানো যায় না, কারণ এখনো বিক্রিই শুরু হয়নি। ছাড়ের দাম খালি রাখুন।");
  }
  if (draft.availability !== "coming_soon" && draft.estimatedPrice.trim()) {
    warnings.push("আনুমানিক দাম শুধু \"শীঘ্রই আসছে\" পণ্যের জন্য। বিক্রির পণ্যে আসল দাম দিন, আনুমানিক দাম খালি রাখুন।");
  }
  if (draft.section === "home" && !draft.problemTags.trim()) {
    warnings.push("সংসারের সমাধানের পণ্যে অন্তত একটা সমস্যা ট্যাগ দিন।");
  }
  return warnings;
}
