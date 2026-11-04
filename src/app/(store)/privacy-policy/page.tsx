import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/order-copy";

export const metadata = {
  title: "গোপনীয়তা নীতি",
  description: "কেনা সাথী কোন তথ্য নেয়, কেন নেয়, কতদিন রাখে আর কীভাবে মুছে ফেলার অনুরোধ করবেন।",
  alternates: { canonical: "/privacy-policy" }
};

// R2.7 (docs/website-redesign-plan.md §৩ and the R9.2 data map). Only describe what the
// site really does. The interest list and WhatsApp updates are described as "when you use
// them"; they go live in R7.1 and R9.1, after this page is in production.
export default function PrivacyPolicyPage() {
  return (
    <section className="py-10">
      <article className="container-page max-w-3xl">
        <p className="text-sm font-semibold text-blue-700">নীতি</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">গোপনীয়তা নীতি</h1>
        <p className="mt-2 text-sm text-slate-500">সর্বশেষ হালনাগাদ: ৩ নভেম্বর ২০২৬</p>

        <p className="mt-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-base font-semibold text-blue-900" data-testid="privacy-promise">
          আপনার ফোন নম্বর আর ঠিকানা আমরা কখনো বিক্রি করি না, আর প্রচারের মেসেজে ব্যবহার করি না — শুধু আপনি নিজে WhatsApp খবরে যোগ দিলে তবেই।
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-600">
          <div>
            <h2 className="text-lg font-bold text-slate-950">অর্ডারের তথ্য</h2>
            <p className="mt-2">
              অর্ডার দিলে ডেলিভারির জন্য দরকারি তথ্য নিই: নাম, মোবাইল নম্বর, জেলা, পুরো ঠিকানা আর আপনার
              দেওয়া নোট। এগুলো ব্যবহার হয় শুধু অর্ডার নিশ্চিত করা, পৌঁছে দেওয়া, অর্ডার ট্র্যাক করা, রিটার্ন
              আর হিসাব রাখার জন্য। কুরিয়ারকে দেওয়া হয় শুধু পার্সেল পৌঁছাতে যতটুকু লাগে। নতুন অর্ডারের খবর
              আমাদের নিজেদের Telegram-এ আসে, তাতে থাকে শুধু অর্ডার নম্বর, জেলা, টাকার অঙ্ক আর উপহার কিনা — আপনার নাম, ফোন
              বা ঠিকানা নয়।
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>নাম, ফোন, ঠিকানা আর নোট রাখা হয় অর্ডারের <strong>২ বছর</strong> পর্যন্ত। তারপর নাম, ঠিকানা আর নোট মুছে ফেলা হয়, ফোনের শুধু শেষ ৩ অঙ্ক থাকে।</li>
              <li>হিসাবের অংশ — অর্ডার নম্বর, তারিখ, পণ্য, দাম, ডেলিভারি চার্জ, জেলা আর টাকা পাওয়ার অবস্থা — রাখা হয় অর্ডারের <strong>৬ বছর</strong> পর্যন্ত, তারপর পুরো অর্ডার মুছে ফেলা হয়।</li>
              <li>অর্ডারের নম্বর শুধু আমাদের অ্যাডমিন দেখেন, কখনো প্রচারে ব্যবহার হয় না।</li>
              <li>অর্ডার দুবার না হওয়ার জন্য চেকআউটের সময় রাখা অনুরোধের কপি <strong>৩০ দিন</strong> পরে মুছে ফেলা হয়।</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">&ldquo;আগ্রহ জানান&rdquo; তালিকা</h2>
            <p className="mt-2">
              কোনো পণ্য &ldquo;শীঘ্রই আসছে&rdquo; থাকলে আপনি ফোন নম্বর (নাম দেওয়া ঐচ্ছিক) দিয়ে আগ্রহ জানাতে
              পারেন। এই নম্বরে শুধু ওই পণ্য আসার খবর একবার দেওয়া হয়। খবর দেওয়ার <strong>৩০ দিন</strong> পরে,
              আর পণ্য না এলে জমা দেওয়ার <strong>৬ মাস</strong> পরে — যেটা আগে আসে — নম্বরটা মুছে ফেলা হয়। এটা
              কোনো অগ্রিম অর্ডার নয়, কোনো টাকা নেওয়া হয় না।
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">WhatsApp খবর</h2>
            <p className="mt-2">
              নিজে থেকে যোগ দিলে তবেই নতুন পণ্য আর স্টকের খবর WhatsApp-এ পাঠানো হয়, মাসে সর্বোচ্চ ২–৪ বার।
              আপনার নম্বর আমাদের WhatsApp Business-এর broadcast list-এ রাখা হয়; একজনের নম্বর অন্যরা দেখতে পান
              না। কখন আর কোন লেখায় সম্মতি দিয়েছেন, তার রেকর্ড রাখা হয়।
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>বন্ধ করতে যেকোনো সময় WhatsApp-এ &ldquo;বন্ধ&rdquo; লিখুন বা ফোন করুন। বন্ধ করলে আর মেসেজ যাবে না, আর আপনি নিজে আবার সম্মতি না দিলে নম্বরটা আর যোগ হবে না — সেজন্য শুধু &ldquo;বন্ধ করা হয়েছে&rdquo; রেকর্ডটা রাখা হয়।</li>
              <li><strong>১২ মাস</strong> কোনো সাড়া না থাকলে নম্বরটা তালিকা থেকে মুছে ফেলা হয়।</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">রিভিউ</h2>
            <p className="mt-2">
              রিভিউ দিতে অর্ডার নম্বর আর ফোন নম্বর মিলিয়ে দেখা হয়, যাতে শুধু আসল ক্রেতাই রিভিউ দিতে পারেন।
              রিভিউর শিরোনাম, লেখা আর রেটিং সবাই দেখেন; আপনার নাম, ফোন বা অর্ডার নম্বর দেখানো হয় না।
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">আপনার ব্রাউজারে যা থাকে</h2>
            <p className="mt-2">
              কার্টের পণ্য আর এই ডিভাইসে দেওয়া শেষ কয়েকটা অর্ডারের নম্বর আপনার নিজের ব্রাউজারেই থাকে, আমাদের
              সার্ভারে নয়। আমরা কোনো বিজ্ঞাপনের cookie ব্যবহার করি না; শুধু সাইট চালাতে যা লাগে (যেমন অ্যাডমিনের
              লগইন), সেটুকু। ভিজিটের হিসাব (analytics) চালু থাকলে তা শুধু পণ্য আর ক্যাটাগরির পেজে চলে — চেকআউট,
              অর্ডার ট্র্যাকিং আর পেমেন্টের পেজে নয় — আর লিংকের সার্চের অংশ বাদ দিয়ে।
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">নিরাপত্তা আর পেমেন্ট</h2>
            <p className="mt-2">
              তথ্য রাখা হয় আমাদের ডাটাবেস সেবায়, শুধু অনুমতিপ্রাপ্ত অ্যাডমিন দেখতে পারেন। কার্ড বা মোবাইল
              ব্যাংকিংয়ের পিন আমরা কখনো চাই না, রাখিও না। অনলাইন পেমেন্ট চালু হলে তা পেমেন্ট গেটওয়ের নিজের
              নিরাপদ পেজে হবে।
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">দেখা, ঠিক করা বা মুছে ফেলার অনুরোধ</h2>
            <p className="mt-2">
              আপনার কী তথ্য আমাদের কাছে আছে জানতে, ভুল ঠিক করতে, WhatsApp খবর বন্ধ করতে বা আগ্রহের নম্বর
              মুছে ফেলতে ফোন বা ইমেইল করুন — যে নম্বরটা দিয়েছিলেন সেটা থেকে হলে যাচাই সহজ হয়। অর্ডারের
              ঠিকানা আর নামও মুছে ফেলার অনুরোধ করতে পারেন; শুধু হিসাবের অংশ ওপরের সময় পর্যন্ত রাখতে হয়।
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
