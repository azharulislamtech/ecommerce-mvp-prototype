# V12 contract — পুরনো ডেমো ক্যাটালগ লুকানো (R1.8) + পুরনো লিংকের redirect (R2.8)

ফাইল: [`db/migration/V12__hide_legacy_demo_catalog.sql`](../../db/migration/V12__hide_legacy_demo_catalog.sql) · ফেরানো: [`db/rollback/V12-rollback.sql`](../../db/rollback/V12-rollback.sql) · যাচাই: [`db/checks/V12-precheck.sql`](../../db/checks/V12-precheck.sql), [`db/checks/V12-postcheck.sql`](../../db/checks/V12-postcheck.sql) · টেস্ট: [`tests/db/v12-cutover.test.mjs`](../../tests/db/v12-cutover.test.mjs), [`tests/e2e/storefront-cutover.spec.ts`](../../tests/e2e/storefront-cutover.spec.ts) · পরিকল্পনা: [website-redesign-plan.md](../website-redesign-plan.md) R1.8, R2.8

**অবস্থা:** লেখা আর টেস্ট করা হয়েছে, **প্রোডাকশনে চালানো হয়নি।** চালানোর জন্য মালিকের আলাদা স্পষ্ট অনুমতি লাগবে।

## কী করে

শুধু ডাটা বদলায়; কোনো পুরনো টেবিলের গঠন বদলায় না, কিছু মোছে না।

1. পুরনো ৫টা ডেমো ক্যাটাগরি (`electronics`, `fashion`, `home-living`, `beauty`, `accessories`) — শুধু যদি এখনো পুরনো ধাঁচের (ভাগ নেই, মূল ক্যাটাগরি নেই) — লুকানো (`is_active = false`)। পুরনো অর্ডার আগের মতো পণ্য আর ক্যাটাগরির সাথে যুক্ত থাকে।
2. ওই ক্যাটাগরির যে পণ্য **কখনো স্টকে আসেনি** (`first_stocked_at IS NULL`, `availability = 'available'`) আর এখনো চালু, সেগুলো লুকানো। যে পণ্য কখনো স্টকে ছিল, V12 সেটা কখনো ছোঁয় না।
3. যা বন্ধ করে, তার প্রতিটা সারি `v12_catalog_cutover_log`-এ লেখা থাকে (RLS চালু, কোনো API role পড়তে বা লিখতে পারে না)। তাই rollback ঠিক সেগুলোই ফেরায়, অন্য কিছু নয়।
4. নতুন ভাগের ক্যাটাগরি চালু করে না, কোনো পণ্য নতুন ভাগে সরায় না — সেগুলো মালিকের সিদ্ধান্ত, অ্যাডমিন থেকে।
5. দুবার চালালেও কিছু বাড়তি বদলায় না।

প্রোডাকশনে আশা করা ফল (২০২৬-১১-০২-এর তথ্য অনুযায়ী): ৫টা ক্যাটাগরি লুকানো হবে; ১০টা dummy পণ্য আগেই বন্ধ, তাই কোনো পণ্য বদলাবে না (log-এ শুধু ৫টা ক্যাটাগরি)। precheck-এর সারি ০৯ ঠিক সংখ্যা দেখাবে।

**R2.8 (একই রিলিজে):** `next.config.mjs`-এ পুরনো ক্যাটাগরির লিংক 301 — `/categories/home-living` → `/products?section=home`, বাকি চারটা → `/`। (Next-এর `permanent: true` 308 পাঠায়, তাই `statusCode: 301`; মালিকের সিদ্ধান্ত Q6।) "সংসারের সমাধান" ক্যাটাগরি এখনো বন্ধ, তাই `home-living` তার পেজে নয়, Home ভাগের তালিকায় যায়।

## চালানোর ক্রম (মালিকের অনুমতির পরে, এই ক্রমেই)

1. ব্যাকআপ: `scripts/backup-production.ps1`।
2. [`V12-precheck.sql`](../../db/checks/V12-precheck.sql) চালান (শুধু পড়ে)। প্রতিটা সারিতে `ok = true` না হলে থামুন। সারি ০৭ মিথ্যা হলে মানে পুরনো ক্যাটাগরিতে কোনো আসল (স্টকে থাকা) পণ্য আছে — আগে সেটার সিদ্ধান্ত। সারি ০৯ আর ১০-এর সংখ্যা decision-log-এ লিখুন।
3. পুরো V12 একবারে: প্রথম লাইনে `begin;` আর `set local lock_timeout = '5s';`, তারপর V12-এর পুরো লেখা, শেষে `commit;`। ভুল হলে পুরোটা ফিরে যায়।
4. [`V12-postcheck.sql`](../../db/checks/V12-postcheck.sql) চালান (শুধু পড়ে)। প্রতিটা সারিতে `ok = true`।
5. তারপর R2.8-এর redirect-সহ কোড deploy (`npx vercel --prod`, staged → `verify-live-release` → promote), engineering log-এ লেখা।

ধাপ ৩ আর ৫-এর মাঝে পুরনো ক্যাটাগরির পেজ অল্প সময় 404 দেখাতে পারে (ক্যাটাগরি বন্ধ, redirect এখনো আসেনি); দোকানে কোনো আসল পণ্য নেই, তাই ক্ষতি নেই।

## ফেরানো (দরকার হলে)

[`V12-rollback.sql`](../../db/rollback/V12-rollback.sql) begin/commit-এর মধ্যে চালান, তারপর `V12-precheck.sql` আবার পাস করবে। এটা `v12_catalog_cutover_log` দেখে শুধু V12-এর বন্ধ করা সারি চালু করে, তারপর log টেবিল মুছে দেয়। V12-এর আগে থেকেই বন্ধ ছিল এমন কিছু (যেমন অ্যাডমিন থেকে বন্ধ করা dummy পণ্য) বন্ধই থাকে। log না থাকলে কিছুই বদলায় না। redirect ফেরাতে আগের deploy-এ rollback (`npx vercel rollback` বা আগের deployment promote)।

## টেস্ট

- `tests/db/v12-cutover.test.mjs` (PGlite, V11 পর্যন্ত, তারপর V12): precheck পাস আর কিছু বদলায় না; V12 শুধু পুরনো ক্যাটাগরি আর কখনো-না-আসা পণ্য লুকায়, নতুন ভাগ আর আগে থেকে বন্ধ পণ্য ছোঁয় না, শুধু বদলানো সারি log-এ; পুরনো অর্ডারের আইটেম থাকে, dummy পণ্য কেনা যায় না, `anon` পুরনো ক্যাটাগরি বা log দেখে না; দুবার চালালে কিছু বাড়ে না; rollback হুবহু ফেরায়, log মোছে, precheck আবার পাস, rollback দুবার নিরাপদ, তারপর V12 আবার চলে; পুরনো ক্যাটাগরিতে আসল পণ্য থাকলে precheck ০৭ ব্যর্থ আর V12 সেটা লুকায় না।
- e2e: টেস্টের ডাটাবেস সব migration চালিয়ে তারপর V12 rollback চালায় (তাই প্রতিটা e2e run-এ rollback পরীক্ষা হয়, আর ব্রাউজার টেস্ট ডেমো ক্যাটালগ পায়)। `storefront-cutover.spec.ts` আসল V12 ফাইল চালায়: `/products`-এ কোনো পণ্য নেই আর সৎ বার্তা, সার্চে dummy নেই, পুরনো লিংক 301 ঠিক জায়গায়, dummy পণ্যের লিংক 404, sitemap-এ পুরনো ক্যাটাগরি বা dummy নেই, কার্টে রাখা dummy চেকআউটে যায় না, হেডারে শুধু "সব পণ্য" আর "অর্ডার ট্র্যাক"; শেষে rollback করে আগের চালু পণ্যগুলো হুবহু ফেরত।
