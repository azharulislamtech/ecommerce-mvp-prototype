// R10.1: admin form fields added by V11 (docs/db/V11-contract.md §2). The checks mirror
// the database constraints so the admin sees a clear message instead of a raw DB error.

export type Availability = "available" | "coming_soon";

export type ProductExtras = {
  availability: Availability;
  estimatedPrice: number | null;
  ageMinMonths: number | null;
  ageMaxMonths: number | null;
  problemTags: string[];
  learningGoals: string[];
  videoUrl: string | null;
};

export type ProductExtrasField =
  | "availability"
  | "estimated_price"
  | "age_min_months"
  | "age_max_months"
  | "problem_tags"
  | "learning_goals"
  | "video_url";

const TAG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 40;
const MAX_AGE_MONTHS = 216;
// Same rule as products_video_url_valid.
const VIDEO_URL_PATTERN =
  /^https:\/\/((www\.|m\.)?youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/|(www\.|m\.|web\.)?facebook\.com\/|fb\.watch\/)[A-Za-z0-9_./?=&%-]+$/;

export function parseTagList(raw: string) {
  return [...new Set(raw.split(/[,\n]/).map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean))];
}

function parseOptionalWhole(raw: string) {
  if (!raw.trim()) return null;
  return /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : Number.NaN;
}

function parseOptionalAmount(raw: string) {
  if (!raw.trim()) return null;
  const value = Number(raw.trim());
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : Number.NaN;
}

function tagError(tags: string[]) {
  if (tags.length > MAX_TAGS) return `Use at most ${MAX_TAGS} tags.`;
  const bad = tags.find((tag) => !TAG_PATTERN.test(tag) || tag.length > MAX_TAG_LENGTH);
  return bad ? `"${bad}" is not valid. Use lowercase English words joined by hyphens, such as kitchen-storage.` : undefined;
}

export function parseProductExtras(get: (name: string) => string) {
  const errors: Partial<Record<ProductExtrasField, string>> = {};
  const rawAvailability = get("availability") || "available";
  const availability: Availability = rawAvailability === "coming_soon" ? "coming_soon" : "available";
  if (rawAvailability !== "available" && rawAvailability !== "coming_soon") errors.availability = "Choose an availability.";

  const estimatedPrice = parseOptionalAmount(get("estimated_price"));
  if (estimatedPrice !== null && (Number.isNaN(estimatedPrice) || estimatedPrice < 0)) {
    errors.estimated_price = "Enter a valid non-negative estimated price, or leave it empty.";
  }

  const ageMinMonths = parseOptionalWhole(get("age_min_months"));
  const ageMaxMonths = parseOptionalWhole(get("age_max_months"));
  for (const [field, value] of [["age_min_months", ageMinMonths], ["age_max_months", ageMaxMonths]] as const) {
    if (value !== null && (Number.isNaN(value) || value > MAX_AGE_MONTHS)) {
      errors[field] = `Age must be a whole number of months from 0 to ${MAX_AGE_MONTHS}.`;
    }
  }
  if (!errors.age_min_months && !errors.age_max_months && ageMinMonths !== null && ageMaxMonths !== null && ageMinMonths > ageMaxMonths) {
    errors.age_max_months = "Maximum age cannot be lower than minimum age.";
  }

  const problemTags = parseTagList(get("problem_tags"));
  const learningGoals = parseTagList(get("learning_goals"));
  const problemError = tagError(problemTags);
  const learningError = tagError(learningGoals);
  if (problemError) errors.problem_tags = problemError;
  if (learningError) errors.learning_goals = learningError;

  const videoUrl = get("video_url").trim() || null;
  if (videoUrl && (videoUrl.length > 500 || !VIDEO_URL_PATTERN.test(videoUrl))) {
    errors.video_url = "Use an https YouTube (watch, shorts, youtu.be) or Facebook video link.";
  }

  const extras: ProductExtras = { availability, estimatedPrice, ageMinMonths, ageMaxMonths, problemTags, learningGoals, videoUrl };
  return { extras, errors };
}

// A coming-soon product must have stock 0 (products_coming_soon_has_no_stock). The one
// exception: a product that is already coming soon and stays so, where stock is added.
// The form then leaves availability out, and the database trigger puts it on sale
// (guideline: when the goods arrive, sell them and drop the coming-soon badge).
export function comingSoonStockError(next: Availability, stock: number, previous: Availability | null) {
  if (next !== "coming_soon" || stock <= 0) return undefined;
  if (previous === "coming_soon") return undefined;
  return "A coming-soon product must have stock 0. Set stock to 0, or choose Available.";
}

// The column write for availability. guard_coming_soon_stock fires whenever availability
// is in the SET list, so on update it is sent only when it really changes.
export function availabilityWrite(next: Availability, previous: Availability | null) {
  if (previous === null) return { availability: next };
  return next === previous ? {} : { availability: next };
}

export function willGoOnSale(next: Availability, stock: number, previous: Availability | null) {
  return previous === "coming_soon" && next === "coming_soon" && stock > 0;
}

export function extrasColumns(extras: ProductExtras, previous: Availability | null) {
  return {
    ...availabilityWrite(extras.availability, previous),
    estimated_price: extras.estimatedPrice,
    age_min_months: extras.ageMinMonths,
    age_max_months: extras.ageMaxMonths,
    problem_tags: extras.problemTags,
    learning_goals: extras.learningGoals,
    video_url: extras.videoUrl
  };
}

type CategoryLike = { id: string; name: string; is_active: boolean; parent_id?: string | null; section?: string | null };

const SECTION_LABELS: Record<string, string> = { kids: "Kids & Baby", home: "সংসারের সমাধান · Home Solutions" };

// Category choices grouped by section. A product goes in a sub-category of a new section
// (the section root itself is only a heading); old categories without a section stay as they are.
export function groupCategoryOptions(categories: CategoryLike[]) {
  const groups: { label: string; options: { id: string; label: string; disabled: boolean }[] }[] = [];
  for (const section of ["kids", "home"]) {
    const roots = categories.filter((c) => c.section === section && !c.parent_id);
    const children = categories.filter((c) => c.section === section && c.parent_id);
    if (!roots.length && !children.length) continue;
    const options = roots.flatMap((root) => [
      { id: root.id, label: `${root.name} (section, choose a sub-category)`, disabled: true },
      ...children
        .filter((child) => child.parent_id === root.id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((child) => ({ id: child.id, label: `${root.name} › ${child.name}${child.is_active ? "" : " (inactive)"}`, disabled: false }))
    ]);
    groups.push({ label: SECTION_LABELS[section] ?? section, options });
  }
  const legacy = categories.filter((c) => !c.section);
  if (legacy.length) {
    groups.push({
      label: "Other categories",
      options: legacy.map((c) => ({ id: c.id, label: `${c.name}${c.is_active ? "" : " (inactive)"}`, disabled: false }))
    });
  }
  return groups;
}
