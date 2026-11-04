"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitInterestAction, type InterestFormState } from "@/app/actions";
import { INTEREST_NOTICE, INTEREST_PRIVACY_NOTE } from "@/lib/order-copy";

const initialState: InterestFormState = { status: "idle", message: "", fieldErrors: {} };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="focus-ring min-h-12 w-full rounded-md bg-orange-600 px-5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      disabled={pending}
      type="submit"
    >
      {pending ? "পাঠানো হচ্ছে..." : "আগ্রহ জানান"}
    </button>
  );
}

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-1 text-xs font-semibold text-rose-700">{message}</p> : null;

// R7.1: wireframe §৪ page 4 — the exact notice, the form (name optional), and what happens
// to the number. No public count of interested people.
export function InterestForm({ productId }: { productId: string }) {
  const [state, formAction] = useActionState(submitInterestAction.bind(null, productId), initialState);

  return (
    <section className="mt-5 rounded-lg border border-orange-200 bg-orange-50 p-4" data-testid="interest-form" id="interest" lang="bn">
      <p className="rounded-md border border-orange-300 bg-white px-3 py-2 text-sm font-semibold leading-6 text-orange-900" data-testid="interest-notice">
        {INTEREST_NOTICE}
      </p>

      {state.status === "success" ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800" data-testid="interest-thanks" role="status">
          {state.message}
        </p>
      ) : (
        <form action={formAction} className="mt-4 space-y-3" key={state.values ? JSON.stringify(state.values) : "empty"}>
          <input aria-hidden="true" autoComplete="off" className="hidden" name="website" tabIndex={-1} type="text" />
          {state.status === "error" ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800" role="alert">{state.message}</p>
          ) : null}
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">নাম (ঐচ্ছিক)</span>
            <input
              autoComplete="name"
              className="focus-ring mt-1 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              defaultValue={state.values?.customer_name}
              maxLength={80}
              name="customer_name"
            />
            <FieldError message={state.fieldErrors.customer_name} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">মোবাইল নম্বর (WhatsApp)</span>
            <input
              autoComplete="tel"
              className="focus-ring mt-1 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              defaultValue={state.values?.customer_phone}
              inputMode="tel"
              name="customer_phone"
              placeholder="01712345678"
              required
              type="tel"
            />
            <FieldError message={state.fieldErrors.customer_phone} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">কতটা লাগবে (ঐচ্ছিক)</span>
            <input
              className="focus-ring mt-1 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              defaultValue={state.values?.quantity}
              max={99}
              min={1}
              name="quantity"
              type="number"
            />
            <FieldError message={state.fieldErrors.quantity} />
          </label>
          <SubmitButton />
        </form>
      )}

      <p className="mt-3 text-xs leading-5 text-slate-600">
        {INTEREST_PRIVACY_NOTE}{" "}
        <Link className="font-semibold text-blue-700 hover:text-blue-900" href="/privacy-policy">গোপনীয়তা নীতি</Link>
      </p>
    </section>
  );
}
