import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PROBLEMS, problemLine } from "../../src/lib/problems";

// R3.1: the six homepage problems, kept in step with the section guideline files.
test("there are the owner's six problems, three per section, with valid tags", () => {
  assert.equal(PROBLEMS.length, 6);
  assert.equal(PROBLEMS.filter((p) => p.section === "kids").length, 3);
  for (const problem of PROBLEMS) assert.match(problem.tag, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("every problem tag and card text is written in its section guideline", () => {
  const files = { kids: "docs/kids-education-product-guideline.md", home: "docs/home-solutions-product-guideline.md" };
  for (const problem of PROBLEMS) {
    const text = readFileSync(files[problem.section], "utf8");
    assert.ok(text.includes(`| \`${problem.tag}\` | ${problem.question} |`), `${problem.tag} missing in ${files[problem.section]}`);
  }
});

test("the card problem line uses the first known tag", () => {
  assert.equal(problemLine(["small-space", "kitchen-clutter"]), "রান্নাঘর গোছানো থাকে না");
  assert.equal(problemLine(["unknown"]), null);
  assert.equal(problemLine(undefined), null);
});
