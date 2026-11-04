"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitProductReviewAction, type ProductReviewFormState } from "@/app/actions";

const initialState: ProductReviewFormState = {
  status: "idle",
  message: "",
  fieldErrors: {}
};

type ProductReviewFormProps = {
  productId: string;
  productSlug: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="focus-ring mt-5 min-h-11 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      disabled={pending}
      type="submit"
    >
      {pending ? "পাঠানো হচ্ছে..." : "রিভিউ পাঠান"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs font-semibold text-rose-700">{message}</p> : null;
}

export function ProductReviewForm({ productId, productSlug }: ProductReviewFormProps) {
  const action = submitProductReviewAction.bind(null, productId, productSlug);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-5" id="write-review">
      <p className="text-sm font-semibold text-blue-700">শুধু যাচাই করা ক্রেতা</p>
      <h2 className="mt-2 text-xl font-bold text-slate-950">আপনার অভিজ্ঞতা লিখুন</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        শুধু এই পণ্যসহ ডেলিভারি হওয়া অর্ডারের ক্রেতা রিভিউ দিতে পারেন। প্রতিটা রিভিউ যাচাইয়ের পরে দেখানো হয়।
      </p>

      <form action={formAction} className="mt-5">
        <input className="hidden" name="website" tabIndex={-1} type="text" autoComplete="off" aria-hidden="true" />
        {state.status !== "idle" ? (
          <div
            className={
              state.status === "success"
                ? "mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"
                : "mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"
            }
          >
            {state.message}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">অর্ডার নম্বর</span>
            <input
              className="focus-ring mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              name="order_number"
              placeholder="SP-20260704-001001"
              required
            />
            <FieldError message={state.fieldErrors.order_number} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-950">চেকআউটে দেওয়া মোবাইল নম্বর</span>
            <input
              className="focus-ring mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              name="customer_phone"
              pattern="^(?:\+?88)?01[3-9][0-9]{8}$"
              placeholder="01712000000"
              required
              type="tel"
            />
            <FieldError message={state.fieldErrors.customer_phone} />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-slate-950">রেটিং</span>
          <select className="focus-ring mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" defaultValue="" name="rating" required>
            <option disabled value="">রেটিং বাছুন</option>
            <option value="5">৫ — খুব ভালো</option>
            <option value="4">৪ — ভালো</option>
            <option value="3">৩ — মোটামুটি</option>
            <option value="2">২ — ভালো না</option>
            <option value="1">১ — একদম ভালো না</option>
          </select>
          <FieldError message={state.fieldErrors.rating} />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-slate-950">শিরোনাম <span className="font-normal text-slate-500">(ঐচ্ছিক)</span></span>
          <input
            className="focus-ring mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            maxLength={120}
            name="title"
            placeholder="কী ভালো লেগেছে?"
          />
          <FieldError message={state.fieldErrors.title} />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-slate-950">আপনার রিভিউ</span>
          <textarea
            className="focus-ring mt-2 min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm"
            maxLength={1500}
            minLength={20}
            name="body"
            placeholder="পণ্যটা কেমন, কীভাবে কাজে লাগল — অন্য ক্রেতাদের জন্য লিখুন।"
            required
          />
          <FieldError message={state.fieldErrors.body} />
        </label>

        <SubmitButton />
      </form>
    </section>
  );
}
