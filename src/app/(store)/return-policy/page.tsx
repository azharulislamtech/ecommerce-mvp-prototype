import Link from "next/link";
import { RETURN_WINDOW_LINE, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/order-copy";

export const metadata = {
  title: "রিটার্ন ও টাকা ফেরতের নীতি",
  description: "ভাঙা, ভুল বা অসম্পূর্ণ পণ্য ডেলিভারির ৭২ ঘণ্টার মধ্যে জানালে কেনা সাথী বদলে দেয় বা টাকা ফেরত দেয়।",
  alternates: { canonical: "/return-policy" }
};

// Owner decision 2026-11-02 (docs/website-redesign-plan.md §৩, R2.5): 72 hours from
// delivery for damaged, wrong or missing items; open-box check before paying; no
// change-of-mind returns at launch; refund within 7 business days of a passed check.
export default function ReturnPolicyPage() {
  return (
    <section className="py-10">
      <article className="container-page max-w-3xl">
        <p className="text-sm font-semibold text-blue-700">নীতি</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">রিটার্ন ও টাকা ফেরতের নীতি</h1>
        <p className="mt-2 text-sm text-slate-500">সর্বশেষ হালনাগাদ: ৩ নভেম্বর ২০২৬</p>

        <p className="mt-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-base font-semibold text-blue-900" data-testid="return-window">
          {RETURN_WINDOW_LINE}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-600">
          <div>
            <h2 className="text-lg font-bold text-slate-950">পণ্য দেখে টাকা দিন</h2>
            <p className="mt-2">
              ক্যাশ অন ডেলিভারিতে ডেলিভারিম্যানের সামনেই প্যাকেট খুলে পণ্য দেখে তারপর টাকা দিন। পণ্য ভাঙা,
              ভুল বা অসম্পূর্ণ হলে পার্সেলটা নেবেন না — ফেরত দেওয়া ক্যাশ অন ডেলিভারি পার্সেলের জন্য আপনাকে কোনো
              টাকা দিতে হবে না।
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">কখন ফেরত বা বদল পাবেন</h2>
            <p className="mt-2">ডেলিভারির ৭২ ঘণ্টার (৩ দিন) মধ্যে আমাদের জানান, যদি:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>পণ্য ভাঙা বা ত্রুটিপূর্ণ অবস্থায় পৌঁছায়।</li>
              <li>ভুল পণ্য, ভুল মাপ বা ভুল রং আসে।</li>
              <li>অর্ডারের কোনো পণ্য বা অংশ পাওয়া না যায়।</li>
            </ul>
            <p className="mt-2">
              পণ্যটা পাওয়ার পরে ব্যবহারে নষ্ট হলে, অথবা আগে থেকে জানানো ত্রুটিসহ বিক্রি হলে, ফেরত নেওয়া হবে না।
              যতটা সম্ভব আসল প্যাকেট আর সাথের জিনিসপত্র রেখে দিন।
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">যা ফেরত নেওয়া হয় না</h2>
            <p className="mt-2">
              এখন শুধু &ldquo;পছন্দ হয়নি&rdquo; বা &ldquo;মত বদলেছি&rdquo; কারণে ফেরত নেওয়া হয় না। ভবিষ্যতে চালু হলে এই পেজে জানানো হবে।
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">কীভাবে জানাবেন</h2>
            <p className="mt-2">
              অর্ডার নম্বর, চেকআউটে দেওয়া মোবাইল নম্বর আর সমস্যার একটা ছবি দিয়ে ফোন বা মেসেজ করুন। আমরা যাচাই
              করে পণ্য ফেরত নেওয়ার ব্যবস্থা করব, অথবা কীভাবে পাঠাবেন জানিয়ে দেব। যাচাই করা ত্রুটির ক্ষেত্রে ফেরত
              পাঠানোর কুরিয়ার খরচ আমরা বহন করি। অর্ডার নম্বর খুঁজে না পেলে{" "}
              <Link className="font-semibold text-blue-700 hover:text-blue-900" href="/track-order">অর্ডার ট্র্যাক করুন</Link>{" "}
              পেজ দেখুন।
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">বদল আর টাকা ফেরত</h2>
            <p className="mt-2">
              ফেরত পণ্য হাতে পেয়ে যাচাই করার পর আপনি বদল (স্টক থাকা সাপেক্ষে) অথবা টাকা ফেরত বেছে নিতে পারবেন।
              যাচাইয়ে ঠিক থাকলে ৭ কর্মদিবসের মধ্যে আপনার দেওয়া বিকাশ, নগদ বা ব্যাংক অ্যাকাউন্টে টাকা পাঠানো হয়।
              অনলাইনে পরিশোধ করা অর্ডারের টাকা সম্ভব হলে একই মাধ্যমে ফেরত যায়।
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">যোগাযোগ</h2>
            <p className="mt-2">
              ফোন:{" "}
              <a className="font-semibold text-slate-700 hover:text-blue-700" href={SUPPORT_PHONE_TEL}>{SUPPORT_PHONE_DISPLAY}</a>
              <br />
              ইমেইল: support@kenasathi.com
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
