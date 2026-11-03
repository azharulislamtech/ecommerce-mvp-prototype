// R6.2: show a description written with the guideline template (Kids §৫.১, Home
// "বিবরণের টেমপ্লেট") as proper sections, without new database fields. The admin keeps
// typing plain text; anything that does not match is shown as ordinary paragraphs.

export const KNOWN_HEADINGS = [
  // Kids template
  "এই পণ্য কী",
  "কী শেখায়",
  "নিরাপত্তা",
  "জানা ত্রুটি বা সীমাবদ্ধতা",
  // Home template
  "কোন সমস্যা মেটায়",
  "কীভাবে মেটায়",
  "কীভাবে ব্যবহার করবেন",
  "জানা সীমাবদ্ধতা",
  // Both
  "ডেলিভারি ও ফেরত",
  "সাধারণ প্রশ্ন"
] as const;

export type DescriptionSection = {
  heading: string | null;
  paragraphs: string[];
  bullets: string[];
  steps: string[];
  faqs: { question: string; answer: string }[];
};

export type ParsedDescription = {
  sections: DescriptionSection[];
  facts: { label: string; value: string }[];
  structured: boolean;
};

const STEP = /^(?:[০-৯]+|\d+)[.)।]\s+(.+)$/;
const BULLET = /^[-•*]\s+(.+)$/;
// "মাপ: ১০ × ১০ সেমি" — a short label, a colon, a value. Sentences with a colon are not facts.
const FACT = /^([^:।?!]{2,30}):\s*(.+)$/;
const QUESTION = /^(?:প্রশ্ন[:：]\s*)?(.+\?)$/;
const ANSWER = /^(?:উত্তর[:：]\s*)?(.+)$/;

const emptySection = (heading: string | null): DescriptionSection => ({ heading, paragraphs: [], bullets: [], steps: [], faqs: [] });

function headingOf(line: string) {
  const plain = line.replace(/[:：]\s*$/, "").trim();
  return (KNOWN_HEADINGS as readonly string[]).includes(plain) ? plain : null;
}

export function parseDescription(text: string): ParsedDescription {
  const sections: DescriptionSection[] = [];
  const facts: { label: string; value: string }[] = [];
  let current = emptySection(null);
  let structured = false;
  let pendingQuestion: string | null = null;

  const flush = () => {
    if (pendingQuestion) {
      current.paragraphs.push(pendingQuestion);
      pendingQuestion = null;
    }
    if (current.heading || current.paragraphs.length || current.bullets.length || current.steps.length || current.faqs.length) {
      sections.push(current);
    }
  };

  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const heading = headingOf(line);
    if (heading) {
      flush();
      current = emptySection(heading);
      structured = true;
      continue;
    }

    if (current.heading === "সাধারণ প্রশ্ন") {
      if (pendingQuestion) {
        const answer = line.match(ANSWER)?.[1] ?? line;
        current.faqs.push({ question: pendingQuestion, answer });
        pendingQuestion = null;
        continue;
      }
      const question = line.replace(BULLET, "$1").match(QUESTION);
      if (question) {
        pendingQuestion = question[1];
        continue;
      }
    }

    const step = line.match(STEP);
    if (step) {
      current.steps.push(step[1]);
      structured = true;
      continue;
    }
    const bullet = line.match(BULLET);
    if (bullet) {
      current.bullets.push(bullet[1]);
      continue;
    }
    const fact = line.match(FACT);
    if (fact && !current.heading?.startsWith("ডেলিভারি")) {
      facts.push({ label: fact[1].trim(), value: fact[2].trim() });
      structured = true;
      continue;
    }
    current.paragraphs.push(line);
  }
  flush();

  return { sections, facts, structured };
}

// The return question is always answered with the site's one return rule (R2.5), even when
// the description has no FAQ, so a listing can never contradict the policy here.
export const RETURN_FAQ = { question: "ভাঙা বা ভুল পণ্য এলে কী করব?" };
