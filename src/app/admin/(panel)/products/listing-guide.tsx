import { checklistFor, listingWarnings, type ListingDraft } from "@/lib/admin/listing-guidelines";

// R10.2: guideline checklist and live warnings beside the product form. Warnings are
// prompts to check, not blocks; the admin decides after reading the guideline.
export function ListingGuide({ draft }: { draft: ListingDraft }) {
  const warnings = listingWarnings(draft);
  const groups = checklistFor(draft.section);

  return (
    <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto" data-testid="listing-guide" lang="bn">
      <div>
        <h2 className="text-lg font-bold text-slate-950">গাইডলাইন যাচাই</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">চালু করার আগে প্রতিটা ঘর মিলিয়ে নিন। পুরো নিয়ম docs ফোল্ডারের গাইডলাইন ফাইলে।</p>
      </div>

      <div aria-live="polite" data-testid="listing-warnings">
        {warnings.length > 0 ? (
          <ul className="space-y-2">
            {warnings.map((warning) => (
              <li className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900" key={warning}>
                {warning}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">এখন কোনো সতর্কবার্তা নেই।</p>
        )}
      </div>

      {groups.map((group) => (
        <section key={group.title}>
          <h3 className="text-sm font-bold text-slate-950">{group.title}</h3>
          <p className="text-xs text-slate-500">{group.source}</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700">
            {group.items.map((item) => (
              <li key={item}>{item.replace(/`/g, "")}</li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  );
}
