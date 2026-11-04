import Link from "next/link";
import { RETURN_FAQ, parseDescription } from "@/lib/product-description";
import { RETURN_POLICY_PATH, RETURN_WINDOW_LINE } from "@/lib/order-copy";

// R6.2: the description as sections (problem and solution, how to use in steps, facts,
// limitations, FAQ). The return question always uses the site's one return rule.
export function ProductDescription({ text, specs }: { text: string; specs: string[] }) {
  const { sections, facts } = parseDescription(text);

  return (
    <div className="space-y-6" data-testid="product-description" lang="bn">
      {sections.map((section, index) => (
        <section key={`${section.heading ?? "intro"}-${index}`}>
          {section.heading && section.heading !== "সাধারণ প্রশ্ন" ? (
            <h3 className="text-lg font-bold text-slate-950">{section.heading}</h3>
          ) : null}
          {section.paragraphs.map((paragraph) => (
            <p className="mt-2 leading-7 text-slate-600" key={paragraph}>{paragraph}</p>
          ))}
          {section.bullets.length ? (
            <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-7 text-slate-600">
              {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          ) : null}
          {section.steps.length ? (
            <ol className="mt-3 grid gap-3 sm:grid-cols-3" data-testid="product-steps">
              {section.steps.map((step, stepIndex) => (
                <li className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700" key={step}>
                  <span className="mb-1 block text-xs font-bold text-blue-700">ধাপ {(stepIndex + 1).toLocaleString("bn-BD")}</span>
                  {step}
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ))}

      {facts.length || specs.length ? (
        <section>
          <h3 className="text-lg font-bold text-slate-950">পণ্যের তথ্য</h3>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="product-facts">
            {facts.map((fact) => (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm" key={fact.label}>
                <dt className="font-semibold text-slate-950">{fact.label}</dt>
                <dd className="mt-1 text-slate-700">{fact.value}</dd>
              </div>
            ))}
            {specs.map((spec) => (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" key={spec}>
                <dd>{spec}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section data-testid="product-faq">
        <h3 className="text-lg font-bold text-slate-950">সাধারণ প্রশ্ন</h3>
        <div className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
          {sections.flatMap((section) => section.faqs).map((faq) => (
            <details className="group p-4" key={faq.question}>
              <summary className="cursor-pointer list-none font-semibold text-slate-950">{faq.question}</summary>
              <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
            </details>
          ))}
          <details className="group p-4" data-testid="product-return-faq">
            <summary className="cursor-pointer list-none font-semibold text-slate-950">{RETURN_FAQ.question}</summary>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {RETURN_WINDOW_LINE}। যাচাইয়ের পরে বদল বা টাকা ফেরত পাবেন।{" "}
              <Link className="font-semibold text-blue-700 hover:text-blue-900" href={RETURN_POLICY_PATH}>রিটার্ন নীতি দেখুন</Link>
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
