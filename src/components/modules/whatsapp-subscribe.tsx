"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { subscribeWhatsAppAction, type WhatsAppFormState } from "@/app/actions";
import { CURRENT_CONSENT_TEXT } from "@/lib/whatsapp";

const initialState: WhatsAppFormState = { status: "idle", message: "", fieldErrors: {} };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="focus-ring min-h-11 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      disabled={pending}
      type="submit"
    >
      {pending ? "পাঠানো হচ্ছে..." : "খবর পেতে চাই"}
    </button>
  );
}

// R9.1: wireframe §৪ page 5 item 6. The ticked consent text and its version are stored.
export function WhatsAppSubscribe() {
  const [state, formAction] = useActionState(subscribeWhatsAppAction, initialState);

  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5" data-testid="whatsapp-subscribe" lang="bn">
      <h2 className="text-lg font-bold text-slate-950">WhatsApp-এ নতুন খেলনার খবর</h2>
      <p className="mt-1 text-sm text-slate-700">মাসে সর্বোচ্চ ২–৪ বার। যেকোনো সময় &ldquo;বন্ধ&rdquo; লিখে থামানো যাবে।</p>
      {state.status === "success" ? (
        <p className="mt-4 rounded-md bg-white px-3 py-3 text-sm font-semibold text-emerald-800" data-testid="whatsapp-thanks" role="status">{state.message}</p>
      ) : (
        <form action={formAction} className="mt-4 space-y-3" key={state.values ? JSON.stringify(state.values) : "empty"}>
          <input aria-hidden="true" autoComplete="off" className="hidden" name="website" tabIndex={-1} type="text" />
          {state.status === "error" ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800" role="alert">{state.message}</p> : null}
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">মোবাইল নম্বর (WhatsApp)</span>
            <input
              autoComplete="tel"
              className="focus-ring mt-1 h-11 w-full max-w-sm rounded-md border border-slate-200 bg-white px-3 text-sm"
              defaultValue={state.values?.customer_phone}
              inputMode="tel"
              name="customer_phone"
              placeholder="01712345678"
              required
              type="tel"
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input className="mt-1 h-5 w-5 shrink-0 accent-emerald-700" name="consent" required type="checkbox" />
            <span data-testid="whatsapp-consent-text">{CURRENT_CONSENT_TEXT}</span>
          </label>
          <SubmitButton />
        </form>
      )}
      <p className="mt-3 text-xs text-slate-600">
        নম্বর কতদিন রাখা হয় আর কীভাবে মুছতে বলবেন:{" "}
        <Link className="font-semibold text-blue-700 hover:text-blue-900" href="/privacy-policy">গোপনীয়তা নীতি</Link>
      </p>
    </section>
  );
}
