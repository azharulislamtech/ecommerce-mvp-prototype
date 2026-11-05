import { manageWhatsAppSubscriberAction } from "@/app/actions";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth";
import { CONSENT_TEXTS, CURRENT_CONSENT_VERSION } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ notice?: string | string[]; error?: string | string[] }> };
type Subscriber = {
  id: string;
  phone: string;
  consent_at: string;
  consent_version: string;
  last_response_at: string | null;
  opted_out_at: string | null;
  reconsent_requested_at: string | null;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const date = (value: string | null) => (value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "—");

function ActionButton({ id, action, label, tone = "slate" }: { id: string; action: string; label: string; tone?: "slate" | "rose" | "emerald" }) {
  const colors = { slate: "border-slate-300 text-slate-950 hover:bg-slate-50", rose: "border-rose-200 text-rose-700 hover:bg-rose-50", emerald: "border-emerald-300 text-emerald-800 hover:bg-emerald-50" };
  return (
    <form action={manageWhatsAppSubscriberAction}>
      <input name="subscriber_id" type="hidden" value={id} />
      <input name="action" type="hidden" value={action} />
      <button className={`focus-ring min-h-10 rounded-md border px-3 text-sm font-semibold ${colors[tone]}`} type="submit">{label}</button>
    </form>
  );
}

// R9.1: WhatsApp subscribers. Numbers go into the WhatsApp Business broadcast list by hand
// (2–4 messages a month); this page is the record of consent, responses and opt-outs.
export default async function AdminWhatsAppPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseAuthServerClient();
  const { data } = await supabase.from("whatsapp_subscribers").select("*").order("consent_at", { ascending: false });
  const rows = (data ?? []) as Subscriber[];
  const active = rows.filter((row) => !row.opted_out_at);
  const pending = rows.filter((row) => row.opted_out_at && row.reconsent_requested_at);
  const optedOut = rows.filter((row) => row.opted_out_at && !row.reconsent_requested_at);
  const notice = first(params?.notice);
  const error = first(params?.error);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-blue-700">Updates</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">WhatsApp subscribers</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Copy the active numbers into the WhatsApp Business broadcast list, at most 2–4 messages a month. When someone replies,
          save their last response; a number with no response for 12 months is deleted automatically. Current consent text
          ({CURRENT_CONSENT_VERSION}): &ldquo;{CONSENT_TEXTS[CURRENT_CONSENT_VERSION]}&rdquo;
        </p>
      </div>
      {notice ? <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">{notice}</p> : null}
      {error ? <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">{error}</p> : null}

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-testid="whatsapp-active">
        <h2 className="text-lg font-bold text-slate-950">Active ({active.length})</h2>
        {active.length ? (
          <>
            <label className="mt-3 block text-sm font-semibold text-slate-950">
              Numbers for the broadcast list
              <textarea className="mt-2 h-28 w-full rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-sm" data-testid="whatsapp-copy-list" readOnly value={active.map((row) => row.phone).join("\n")} />
            </label>
            <ul className="mt-4 divide-y divide-slate-100">
              {active.map((row) => (
                <li className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid="whatsapp-row" key={row.id}>
                  <div className="text-sm">
                    <p className="font-semibold text-slate-950">{row.phone}</p>
                    <p className="text-xs text-slate-500">Consent {date(row.consent_at)} ({row.consent_version}) · Last response {date(row.last_response_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton action="responded" id={row.id} label="They replied today" tone="emerald" />
                    <ActionButton action="opt_out" id={row.id} label="Opt out" />
                    <ActionButton action="delete" id={row.id} label="Delete" tone="rose" />
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No active subscribers yet.</p>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-amber-200 bg-white p-5 shadow-sm" data-testid="whatsapp-pending">
        <h2 className="text-lg font-bold text-slate-950">Waiting for re-consent ({pending.length})</h2>
        <p className="mt-1 text-sm text-slate-600">
          These numbers had opted out and someone submitted them on the website again. Anyone can type any number, so reactivate
          only after that person messages you on WhatsApp themselves.
        </p>
        <ul className="mt-3 divide-y divide-slate-100">
          {pending.map((row) => (
            <li className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid="whatsapp-row" key={row.id}>
              <p className="text-sm font-semibold text-slate-950">{row.phone} <span className="text-xs font-normal text-slate-500">opted out {date(row.opted_out_at)}, asked again {date(row.reconsent_requested_at)}</span></p>
              <div className="flex flex-wrap gap-2">
                <ActionButton action="reactivate" id={row.id} label="They messaged us: reactivate" tone="emerald" />
                <ActionButton action="delete" id={row.id} label="Delete" tone="rose" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-testid="whatsapp-opted-out">
        <h2 className="text-lg font-bold text-slate-950">Opted out ({optedOut.length})</h2>
        <p className="mt-1 text-sm text-slate-600">Kept as the opt-out record so the website form can never add the number back.</p>
        <ul className="mt-3 divide-y divide-slate-100">
          {optedOut.map((row) => (
            <li className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid="whatsapp-row" key={row.id}>
              <p className="text-sm text-slate-700">{row.phone} <span className="text-xs text-slate-500">opted out {date(row.opted_out_at)}</span></p>
              <ActionButton action="delete" id={row.id} label="Delete on request" tone="rose" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
