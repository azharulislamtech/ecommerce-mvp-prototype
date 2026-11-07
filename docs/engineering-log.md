# Engineering Log

Append meaningful changes here. Keep newest entries at the top.

## 2026-11-07: CRON_SECRET Set and Daily Retention Schedule Enabled (R9.2)

- The owner added `CRON_SECRET` in Vercel → project Settings → Environment Variables (Production only, sensitive). Its value was never shared in chat or with Claude.
- Redeployed `a4f245f` with `--skip-domain` as `dpl_8xJqPjervpze99ieW6tg6m8fA4SU` (https://ecommerce-mvp-prototype-ouqt3il7u-azadbasis-4964s-projects.vercel.app), then promoted. verify-live-release (empty mode) passed 11 checks on the staged URL and again on https://kenasathi.com.
- `/api/cron/retention` now returns 401 "Unauthorized" without a token or with a wrong bearer, where it returned 503 "CRON_SECRET is not configured" before. That proves the secret is set without revealing it.
- `vercel crons ls` lists `/api/cron/retention` at `0 21 * * *` (03:00 Dhaka).
- R9.2 stays 🔄 until the first `schedule` row appears in `data_retention_runs`. The first scheduled run is expected at 2026-11-07 21:00 UTC; on the Hobby plan Vercel may run it any time within that hour.
- Rollback target: `dpl_9xzFAwcm4ysU994G7DxmEiDwFDcg`. No database change.

## 2026-11-05: GitHub Repository Renamed to kenasathi-web

- On owner request, the GitHub repository `azharulislamtech/ecommerce-mvp-prototype` was renamed to `azharulislamtech/kenasathi-web` through the GitHub API.
  - GitHub keeps permanent redirects: the old web URL returns 301 to the new one, and the old API path returns 301.
  - Do not create a new repository with the old name, because that would break the redirects.
- The local `origin` remote now points to `https://github.com/azharulislamtech/kenasathi-web.git`. All worktrees share it. Fetch works and `main` was unchanged at `4d7e75d`.
- This PR updates the GitHub links in the docs and the package name in `package.json` and `package-lock.json` to `kenasathi-web`.
- Not changed: the Vercel project is still named `ecommerce-mvp-prototype`. Deploys are linked by project ID through the CLI, not by repo name, so deployment URLs keep that prefix. kenasathi.com is not affected. Renaming the Vercel project is a separate, optional step.
- No runtime change and no database change.

## 2026-11-05: R11.2 Bangla Font and Accessibility Deployment

- #52 (R11.2) adds:
  - `<html lang="bn">`, with the admin wrapped in `lang="en"`.
  - Hind Siliguri via `next/font/google`, self-hosted from `/_next/static/immutable/media`.
  - A "মূল লেখায় যান" skip link and `<main id="main">`.
  - Fixes for axe and the 44px-target check: contrast, the OrderSummary `dl`, and small links and controls.
  - `@axe-core/playwright` 4.10.2 (devDependency, exact pin) with 12 accessibility e2e tests.
- Verification: independently re-run in one full pass on a clean checkout of c083dfc (unit 61/61, db 58/58, e2e 57/57, build, audit). On owner request it merged as `86f3a61` after green CI.
- Deployed `86f3a61` with `--skip-domain` as `dpl_9xzFAwcm4ysU994G7DxmEiDwFDcg` (https://ecommerce-mvp-prototype-dke4df1hr-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 11 checks on the staged URL and again on https://kenasathi.com after promotion.
  - Live HTML has `lang="bn"` and the skip link.
  - The font file returns 200 `font/woff2` from our own origin, and there is no googleapis or gstatic reference.
  - A 375px screenshot of `/kids` shows the Bangla font and the WhatsApp form.
- Remaining plan items all depend on the owner: `CRON_SECRET` (R9.2), real products (R0.2), the controlled COD test (R11.3), then R7.3.
- Rollback target: `dpl_FjWzCiYVa8DBMg4SobwvMFe1ndDz`.

## 2026-11-05: R9.1 WhatsApp Updates Deployment

- #50 (R9.1) adds the WhatsApp subscribe form on the Kids page:
  - Versioned consent text (`wa-2026-11-v1`) with a required tick, a honeypot and a privacy link.
  - The same thank-you for everyone. An opted-out number is only marked for re-consent.
  - Rate-limited by the V11 RPC (5 per hour per phone, 30 per hour per hashed-IP key).
- It also adds `/admin/whatsapp`:
  - a copy-all of active numbers;
  - "They replied today", which feeds V13's 12-month rule;
  - opt out and delete, with the broadcast-list reminder;
  - a re-consent queue with reactivate, which writes a new consent time and version.

  Admin writes check that a row changed.
- No migration and no DB change.
- Verification: main (#49) was merged into the branch at `75085e4`, keeping both plan §৯ rows. Then, independently re-run in one full pass on the merged commit in a fresh worktree (unit 61/61, db 58/58, e2e 45/45, build, audit). On owner request it merged as `01e03e5` after green CI.
- Deployed `01e03e5` with `--skip-domain` as `dpl_FjWzCiYVa8DBMg4SobwvMFe1ndDz` (https://ecommerce-mvp-prototype-p3f7cno29-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 11 checks on the staged URL and again on https://kenasathi.com after promotion. Live `/kids` shows the consent text. Signed out, `/admin/whatsapp` returns 307 to login.
- Still open: `CRON_SECRET` in Vercel production (owner), for R9.2's daily schedule.
- Rollback target: `dpl_AS9f6RUBpoQUmYhs6B5hkaAku3FC`.

## 2026-11-05: V13 Applied (R9.2) with Interest Form and Admin Interest List (R7.1, R7.2)

- On the owner's explicit OK ("Yes, apply and deploy"), V13 was applied to production in the contract order (`docs/db/V13-contract.md`). V13 was wrapped in `begin; set local lock_timeout = '5s'; … commit;`.
  1. Backup: `.private-backups/20261105-064713` (verified, encrypted). It counted orders 8, products 10, payments 8, cancelled 1, payment mismatches 0.
  2. `V13-precheck.sql`: 6/6 ok. The first run would change 0 rows under every rule.
  3. V13: table, index, RLS, grants, policy and function created, in 1.5 s. The one NOTICE is the expected "policy does not exist, skipping" from `drop policy if exists`.
  4. `V13-postcheck.sql`: 6/6 ok. Security definer with fixed search_path, execute for service_role only, run log RLS on and closed to the public, admin read policy present.
- #48 (R7.1, R7.2, R9.2) merged as `99ab754` after green CI. It was independently re-run first in a clean checkout of a62d93b (unit 57/57, db 58/58, e2e 43/43, build, audit).
- Deployed `99ab754` with `--skip-domain` as `dpl_AS9f6RUBpoQUmYhs6B5hkaAku3FC` (https://ecommerce-mvp-prototype-3zimmjnua-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 11 checks on the staged URL and again on https://kenasathi.com after promotion. Signed out, `/admin/interest` returns 307 to login. `/api/cron/retention` returns 503 "CRON_SECRET is not configured".
- First retention run: `run_data_retention('admin')` ran via psql. A guard aborted it if any rule would change rows, because the admin button needs the owner's login. Every rule affected 0 rows, and the run was logged in `data_retention_runs`.
- Not done (R9.2 stays 🔄): `CRON_SECRET` is not set in Vercel production, because writing secrets is outside Claude's permissions. The owner sets it in Vercel → Settings → Environment Variables (Production, a long random value). Then redeploy, and confirm a `schedule` run the next day. Until then the daily cron safely returns 503.
- Plan: R7.1 ✅, R7.2 ✅, R9.2 🔄.
- Rollback:
  - Code: `dpl_9RtUMscDzw14GdcqNwKkEuVfZy7q`.
  - Data: `db/rollback/V13-rollback.sql` drops the function and the log. It does not restore deleted rows; use the backup for that.

## 2026-11-04: R10.3 Admin Categories Page Deployment

- #46 (R10.3) adds `/admin/categories`:
  - Categories are grouped by section, with active/inactive status and in-stock and coming-soon counts.
  - Warnings for an empty category and for an inactive parent.
  - Legacy categories are read-only, so V12's log stays accurate.
- `setCategoryActiveAction` runs `requireAdmin()` first, re-reads the category on the server, refuses a category without a section, and writes through the V2 "Admins can manage categories" RLS policy. It then calls `revalidatePath("/", "layout")`.
- No migration and no DB change.
- Verification:
  - Independently re-run in one full pass on a clean checkout of a417667 (unit 55/55, db 51/51, e2e 41/41, build, audit).
  - #45 merged first, and origin/main was merged into the branch (`e96cd5f`), keeping both plan §৯ rows. That diff is docs only. Lint and typecheck were re-run.
  - On owner request #46 merged as `1f56b68` after green CI.
- Deployed `1f56b68` with `--skip-domain` as `dpl_9RtUMscDzw14GdcqNwKkEuVfZy7q` (https://ecommerce-mvp-prototype-i0r7gjmma-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 11 checks on the staged URL and again on https://kenasathi.com after promotion. Signed out, `/admin/categories` returns 307 to `/admin/login?reason=auth-required`.
- Next owner step: activate the new categories in the admin and add the first real products.
- Rollback target: `dpl_Czfvyr4x5a69dSmk7kCq2NXJ4vz2`.

## 2026-11-04: V12 Applied (R1.8) and Legacy Category Redirects Deployed (R2.8)

- On the owner's explicit OK ("Yes, apply V12 now"), V12 was applied to production in the contract order (`docs/db/V12-contract.md`). The run files are the repo files, with V12 wrapped in `begin; set local lock_timeout = '5s'; … commit;`.
  1. Backup: `scripts/backup-production.ps1` produced `.private-backups/20261104-213847` (verified, encrypted). It counted orders 8, products 10, payments 8, cancelled 1, payment mismatches 0.
  2. `V12-precheck.sql`: 10/10 ok. Active legacy categories 5, active never-stocked legacy products 0, all legacy products 10, order_items on legacy products 8 (kept).
  3. V12: `CREATE TABLE`, `ALTER TABLE`, `REVOKE`, `INSERT 0 5`, `INSERT 0 0`, `UPDATE 5`, `UPDATE 0`, `COMMIT`, in 3.3 s.
  4. `V12-postcheck.sql`: 8/8 ok. The log has RLS on and is closed to API roles. The legacy categories are hidden. The log holds 5 categories and 0 products. Launch categories are untouched, and every order item still finds its product.
- #44 (R1.8, R2.8) merged as `0fc8a12` after green CI. It was independently re-run first in a clean checkout of c8bb887 (unit 51/51, db 51/51 including the 6 V12 tests, e2e 38/38, build, audit).
- Deployed `0fc8a12` with `--skip-domain` as `dpl_Czfvyr4x5a69dSmk7kCq2NXJ4vz2` (https://ecommerce-mvp-prototype-4d1zwnm1j-azadbasis-4964s-projects.vercel.app), right after the postcheck.
  - verify-live-release (empty mode) passed 11 checks on the staged URL and again on https://kenasathi.com after promotion. It is 11 instead of 16 because the 5 legacy categories left the sitemap.
  - Live: `/categories/home-living` returns 301 to `/products?section=home`. Electronics, fashion, beauty and accessories return 301 to `/`. The sitemap has no legacy category, and `/products` shows the `store-empty` note.
- Plan: R1.8 ✅ and R2.8 ✅.
- Next owner steps (admin): activate the new categories and add the first real products. R11.3, the controlled COD test, happens on the first real product.
- Rollback:
  - Code: `dpl_FpDzSM8t1pLphJjJ2xKovWeaxP6N`.
  - Data: `db/rollback/V12-rollback.sql` inside begin/commit, which restores exactly the 5 logged categories. Then `V12-precheck.sql` passes again.

## 2026-11-04: R2.10 Bangla and English Search Deployment

- #41 (R2.10) adds `src/lib/search.ts`:
  - Bangla and English word groups, matched both ways (পাজল / puzzle, রান্নাঘর / kitchen).
  - Search covers the name, short description, category, section, problem tags and their questions, and learning goals and their titles.
  - Every query word must match, and name matches rank first. Hidden products never match.
- `/products` has a Bangla search box and empty state. A search with no match shows up to 4 popular in-stock products.
- Verification: the branch was cut before #39, so origin/main was merged in first. Then it was independently re-run in one full pass in a fresh worktree (lint, typecheck, unit 51/51, db 45/45, e2e 37/37, build, audit). The first e2e attempt could not start because another session's e2e held fixture port 54329. That runner still exited 0, so e2e results are now read from the log, not the exit code. On owner request it merged as `dc87680` after green CI.
- Deployed `dc87680` with `--skip-domain` as `dpl_FpDzSM8t1pLphJjJ2xKovWeaxP6N` (https://ecommerce-mvp-prototype-44k6gvp6s-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 16 checks on the staged URL and again on https://kenasathi.com after promotion. Live `/products?q=পাজল` shows the Bangla empty state and placeholder.
- Rollback target: `dpl_EXGdx9PbgRXKLftuSqpGb9rKt1zJ`. No database changes.

## 2026-11-04: R5.1 Category Pages Deployment

- #39 (R5.1) rebuilds `/categories/[slug]`:
  - A Bangla breadcrumb with JSON-LD, and an h1 question from `category-copy.ts`.
  - Section roots show their whole section, with sub-category chips only when backed by stock.
  - URL filters (availability, Kids age, price), each shown only when products back it, plus sorting. On phones they sit behind one "ফিল্টার" `<details>`.
  - Honest Bangla empty and no-match states. Filtered views are noindex. The old English "available soon" claim is gone.
- Also in #39: the review form now keeps what the customer typed after an error (React 19 form reset). The action echoes the values back, using the checkout R2.9 pattern. Validation and the RPC are unchanged.
- Verification: independently re-run in one full pass on a clean checkout of 3dc2aa2 (lint, typecheck, unit 47/47, db 45/45, e2e 35/35, build, audit). On owner request it merged as `248d19a` after green CI.
- Deployed `248d19a` with `--skip-domain` as `dpl_EXGdx9PbgRXKLftuSqpGb9rKt1zJ` (https://ecommerce-mvp-prototype-k96xfqhdt-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 16 checks on the staged URL and again on https://kenasathi.com after promotion. Live `/categories/accessories` returns 200 with BreadcrumbList and without the old claim. `/categories/kids-education` stays 404 (inactive until R1.8/V12).
- Rollback target: `dpl_Fgkn5r63cTsuFtA5FdQjCKYb9p7d`. No database changes.

## 2026-11-04: R4.1 Kids & Baby Page Deployment

- #37 (R4.1) adds the `/kids` page:
  - Age buttons (৩–৪, ৪–৫, ৫–৬ বছর), learning-goal tiles, a coming-soon block, and a list filtered by `?age` and `?goal`. Each part appears only when in-stock products back it.
  - Filtered views and an empty section are `noindex`.
  - Kids links in the header, footer and homepage now go to `/kids`, and `/products?section=kids` still works.
  - The sitemap lists `/kids` only when in-stock Kids products exist.
  - Uses the V11 `learning_goals` column, so no DB change.
  - Also: the Kids guideline is now v1.4 (learning-goal tags), and the review form is fully Bangla.
- Verification: independently re-run in one full pass on a clean checkout of 0e2ec86 (lint, typecheck, unit 47/47, db 45/45, e2e 33/33, build, audit). On owner request it merged as `6787351` after green CI.
- Deployed `6787351` with `--skip-domain` as `dpl_Fgkn5r63cTsuFtA5FdQjCKYb9p7d` (https://ecommerce-mvp-prototype-rpcon9gpo-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 16 checks on the staged URL and again on https://kenasathi.com after promotion. Live `/kids` returns 200 with the empty note and `noindex`, and the sitemap has no `/kids` (no products yet).
- Still English: the Terms page body (separate task).
- Rollback target: `dpl_R8yRE554dpuzfwSKYUQ9p1Yw6khW`. No database changes.

## 2026-11-04: R6.2 Product Description and Bangla Review Copy Deployment

- #35 (R6.2) changes the product page:
  - Descriptions written with the guideline template show as sections: steps, a "পণ্যের তথ্য" table and an FAQ, with no DB change.
  - The return FAQ always uses the site's one return rule.
  - Payment info, reviews and the review form are in Bangla. The review action changed message strings only.
  - JSON-LD and SSLCommerz keep "BDT".
- Verification: independently re-run in one full pass on a clean checkout of 6fb4140 (lint, typecheck, unit 43/43, db 45/45, e2e 31/31 including the full verified-review path, build, audit 0 high). On owner request it merged as `08b8cf5` after green CI.
- Deployed `08b8cf5` with `--skip-domain` as `dpl_R8yRE554dpuzfwSKYUQ9p1Yw6khW` (https://ecommerce-mvp-prototype-p6h5zox1m-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 16 checks on the staged URL and again on https://kenasathi.com after promotion.
- Not checkable live yet: the product page itself, because no products are active.
- Follow-ups: one English sentence is left in the review form, and React keys use line text (a duplicate line gives a dev-only warning).
- Rollback target: `dpl_Go1biSUukrDDCXfcXkMMVG32GbpX`. No database changes.

## 2026-11-04: R6.1 Product Page Deployment

- #33 (R6.1) changes the product page:
  - The video is a link-out card (no iframe, so no third-party cookies before a click).
  - A problem line.
  - On mobile the buy panel comes first, so the price and the COD button are on the first 390×844 screen.
  - Bangla trust marks replace the English ones, including the unproven "Fast delivery".
  - The header logo loads eagerly (fixes the blank slot noted in the R3.1 entry).
- Verification: re-run in one full pass on the result merged with latest main (unit 39/39, db 45/45, e2e 29/29). On owner request it merged as `07888a0` after green CI.
- Deployed `07888a0` with `--skip-domain` as `dpl_Go1biSUukrDDCXfcXkMMVG32GbpX` (https://ecommerce-mvp-prototype-97txhn3xr-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 16 checks on the staged URL and again on https://kenasathi.com after promotion. The logo `<img>` has `loading="eager"`.
- Still English on the product page (R6.2): Specification, Payment Info and the reviews section and form. The product page itself is not checkable live yet because no products are active.
- Rollback target: `dpl_DRkQXeZjdhSVEMKYAZxZ4Rhjd11M`. No database changes.

## 2026-11-04: R3.1 Honest Bangla Homepage Deployment

- #31 (R3.1) changes the homepage:
  - Rewritten in Bangla.
  - Section cards, problem cards and product blocks only appear when real products back them.
  - Trust cards are limited to true claims.
  - Removed: the English hero, the "24h Dispatch" and "Live Catalog" claims, and the dummy-product image.
  - The empty state honestly says no products are for sale yet.
  - Problem tags are documented in the Kids and Home section guidelines (v1.3), and the common guideline is unchanged.
- Verification: re-run in one full pass on the result merged with latest main (unit 39/39, db 45/45, e2e 27/27). On owner request it merged as `f5e97ee` after green CI.
- Deployed `f5e97ee` with `--skip-domain` as `dpl_DRkQXeZjdhSVEMKYAZxZ4Rhjd11M` (https://ecommerce-mvp-prototype-69gbyrpne-azadbasis-4964s-projects.vercel.app).
  - Staged: verify-live-release (empty mode) passed 16 checks. / has no "24h", "Dispatch" or "Trusted Shopping" text and shows the empty-state note.
  - Live: after promotion the 16 checks passed on https://kenasathi.com, and a 375px screenshot shows the Bangla h1, the empty note with the hotline, and three trust cards.
- Follow-up: the header logo `<img>` uses `loading="lazy"` although it is above the fold. It should load eagerly (priority) to avoid a blank slot on first paint.
- Rollback target: `dpl_8Tzb5iZJwcuh6Y2NGcmXuVqievoZ`. No database changes.

## 2026-11-03: R2.1/R2.2 Bangla Header Strip, Menu and Footer Deployment

- #29 (R2.1, R2.2) adds:
  - a black strip on every store page with delivery charges, COD, the open-box line, the 72-hour return line and the hotline;
  - a Bangla header with a mobile menu and search;
  - a stock-gated main menu (section and coming-soon links only when real products exist);
  - a Bangla footer.
  The store layout revalidates every 60 s. Re-run in one full pass on the result merged with latest main: unit 36/36, db 45/45, e2e 25/25. On owner request it merged as `e821a76` after green CI.
- Deployed `e821a76` with `--skip-domain` as `dpl_8Tzb5iZJwcuh6Y2NGcmXuVqievoZ` (https://ecommerce-mvp-prototype-5pmn5t1eu-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 16 checks on the staged URL and again on https://kenasathi.com after promotion. /, /return-policy and /checkout show the strip, with no section links (no active products). A 375px screenshot of the live / looks right.
- Noticed: the homepage hero (R3.1) is still English, with a "24h Dispatch" claim and a hero image of the old dummy products. Prioritise R3.1.
- Rollback target: `dpl_DnY8qKCg1RZzCnEyQRMeMysy4MUN`. No database changes.

## 2026-11-03: R2.3/R2.4 Storefront States Deployment

- #27 (R2.3, R2.4) adds the four storefront states (in stock, stock ended, coming soon, hidden):
  - The TS logic mirrors the DB `storefront_state()`.
  - Bangla state and age badges.
  - Coming soon never shows the stored price.
  - Real hidden products get a noindex unavailable page via `get_unavailable_product`; never-stocked ones return 404.
  - JSON-LD is state-aware: no offer for coming soon, OutOfStock for stock ended.
- Verification: re-run on the result merged with latest main (unit 36/36, db 45/45, e2e 23/23). On owner request it merged as `9b719d4` after green CI.
- Deployed `9b719d4` with `--skip-domain` as `dpl_DnY8qKCg1RZzCnEyQRMeMysy4MUN` (https://ecommerce-mvp-prototype-qxvhj7srj-azadbasis-4964s-projects.vercel.app).
  - Staged: verify-live-release (empty mode) passed 16 checks. The dummy product URLs (`apple-watch`, `cold-pressed-coconut-oil-500ml`, `aurora-wireless-earbuds`) return 404, and /products has no "Sold out" text.
  - Live: after promotion the 16 checks passed on https://kenasathi.com.
- No visible storefront change today, because all 10 products are inactive dummies. The guideline §৩.১ → §৩.২ switch stays with R7.3.
- Rollback target: `dpl_DwHgCQcPgg4ZL8h7nJ2YX92yYW6U`. No database changes.

## 2026-11-03: R10.2 Admin Listing Guideline Panel Deployment

- #25 (R10.2) adds a guideline checklist and live warnings beside the admin product form: unproven claims, discount reminders, coming-soon pricing rules and Home problem tags. Warnings never block a save. The checklist text is pinned to the guideline files by a unit test. No server or DB change. Re-run on the result merged with latest main: unit 32/32, db 45/45, e2e 22/22. On owner request it merged as `7f9222c` after green CI.
- Deployed `7f9222c` with `--skip-domain` as `dpl_DwHgCQcPgg4ZL8h7nJ2YX92yYW6U` (https://ecommerce-mvp-prototype-kvw4jv60c-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 16 checks on the staged URL and again on https://kenasathi.com after promotion. /admin/products/new redirects when signed out (307).
- Rollback target: `dpl_8GjWTCUMk7zBbW5gTsrcPPBtZ9tg`. No database changes.

## 2026-11-03: R10.1 Admin Product Fields and Telegram Alert Without Customer Data

- #22 (R10.1) adds admin product form fields for the V11 columns: availability, estimated price, age, problem tags, learning goals and video URL, plus section-grouped categories. The checks mirror the V11 constraints, and stored availability is read from the DB. Main was merged in (`55958cb`) to keep both plan log rows. Re-run on the merged result: unit 24/24, db 45/45, e2e 21/21. On owner request it merged as `ee402a7` after green CI.
- #23 (owner decision): the Telegram order alert now carries only the order number, ৳ total, payment method, item count, district, a yes/no gift flag and an admin link (`/admin/orders/<order_number>`). The customer name, phone, address and note are removed, and the privacy policy wording was updated to match. Main (with #22) was merged in (`0b56820`). Re-run on the merged result: unit 27/27, db 45/45, e2e 21/21. It merged as `d90637f` after green CI.
- Deployed `d90637f` with `--skip-domain` as `dpl_8GjWTCUMk7zBbW5gTsrcPPBtZ9tg` (https://ecommerce-mvp-prototype-j17kfeawy-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 16 checks on the staged URL and again on https://kenasathi.com after promotion. /privacy-policy shows the new Telegram sentence, and /admin/products redirects when signed out (307).
- Not verified live: a real Telegram alert, because no orders were placed. The builder is unit-tested. The owner may delete old alert messages, which still hold customer details, by hand.
- Rollback target: `dpl_4dPcvqWj5F5uReLLDCLwWdfEuDBN`. No database changes.

## 2026-11-03: R8.1 Gift Checkbox Deployment

- #20 (R8.1) adds a free "উপহার হিসেবে পাঠান" checkbox. It writes a fixed first line into `orders.customer_note` (no DB/RPC change), and the admin order page shows a gift warning. It was independently re-run in a clean checkout (lint, typecheck, unit 14/14, db 45/45, e2e 19/19, build, audit). On owner request it merged as `2144384` after green CI.
- Deployed `2144384` with `--skip-domain` as `dpl_4dPcvqWj5F5uReLLDCLwWdfEuDBN` (https://ecommerce-mvp-prototype-at47n2ylo-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 16 checks on the staged URL and again on https://kenasathi.com after promotion. /checkout shows the gift checkbox.
- The Telegram alert currently still includes the customer details and note. The no-PII alert, which keeps a gift flag, is the next PR.
- Rollback target: `dpl_9FgXhmhqJek9xXBaiVG7hpm3kHT7`. No database changes.

## 2026-11-03: R2.7 Bangla Privacy Policy Deployment

- #18 (R2.7) wording was checked against the code: the Telegram order alert, reviews without name or phone, the browser-only cart and recent orders, and analytics only if enabled. Retention follows the owner's decisions (orders 2 y / 6 y; interest list 30 d after contact or 6 months; WhatsApp until opt-out or 12 months). It was independently re-run in a clean checkout (lint, typecheck, unit 12/12, db 45/45, e2e 17/17, build, audit). On owner request it merged as `f99d37d` after green CI.
- Deployed `f99d37d` with `--skip-domain` as `dpl_9FgXhmhqJek9xXBaiVG7hpm3kHT7` (https://ecommerce-mvp-prototype-ek1kixcnz-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 16 checks on the staged URL and again on https://kenasathi.com after promotion. /privacy-policy shows the Bangla text with the 2-year, 6-year and 12-month rules and the Telegram disclosure.
- Open items:
  - Automatic deletion (R9.2) must ship before interest data from R7.1 reaches its limit.
  - The owner must decide on Telegram alerts: recommended to send only the order number, district and total, so customer details are not kept outside the 2-year rule.
- Rollback target: `dpl_AFSFXeyNoZt6saaDeCSfVh49qenr`. No database changes.

## 2026-11-03: R2.5 Bangla Return Policy Deployment

- #16 (R2.5) was reviewed against the owner's decisions: 72 hours for damaged, wrong or missing items; the open-box "পণ্য দেখে টাকা দিন"; no change-of-mind returns; refund within 7 business days. The refused-COD and verified-fault courier-cost promises carry over unchanged from the previous live policy. The remaining "BDT" display text now uses ৳. It was independently re-run in a clean checkout (lint, typecheck, unit 12/12, db 45/45, e2e 16/16, build, audit). On owner request it merged as `2ac6cec` after green CI.
- Deployed `2ac6cec` with `--skip-domain` as `dpl_AFSFXeyNoZt6saaDeCSfVh49qenr` (https://ecommerce-mvp-prototype-n0lcjkd8e-azadbasis-4964s-projects.vercel.app).
  - Staged: verify-live-release (empty mode) passed 16 checks. /return-policy shows the 72-hour line and "পণ্য দেখে টাকা দিন", with no "48 hours" or "whenever possible". /terms has no "BDT 60", and the /products filter shows ৳1,500.
  - Live: after promotion the 16 checks passed on https://kenasathi.com, and a 375px screenshot of /return-policy shows the Bangla layout.
- Rollback target: `dpl_7SatwkMuq63dGArdR4YNE81ygjuc`. No database changes.

## 2026-11-03: R2.9 Checkout Polish Deployment

- #14 covers three things: an empty cart and an unknown district no longer assume ৳60; `formatMoney` shows ৳ with Latin digits, while JSON-LD and payments keep "BDT"; all 64 districts have Bangla labels. It was independently re-run in a clean checkout (lint, typecheck, unit 12/12, db 45/45, e2e 14/14, build, audit), and all 64 labels were reviewed. On owner request it merged as `eb44b38` after green CI.
- Deployed `eb44b38` with `--skip-domain` as `dpl_7SatwkMuq63dGArdR4YNE81ygjuc` (https://ecommerce-mvp-prototype-6yb9abbx7-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 16 checks on the staged URL and again on https://kenasathi.com after promotion. A 375px screenshot of the live /checkout shows the empty-cart summary with "—" for delivery and total.
- Remaining "BDT" text: the product-page delivery note, the /products price filter and the terms page.
- Rollback target: `dpl_4bWNBki94yWjs7KndzmozUrvjBzb`. No database changes.

## 2026-11-03: R2.9 Bangla Checkout Deployment

- #12 (R2.9) was independently re-run in a clean checkout before the PR: lint, typecheck, unit 10/10, db 45/45, e2e 13/13, build and audit all passed. On owner request it merged as `cac7933` after green CI.
- Deployed `cac7933` with `--skip-domain` as `dpl_4bWNBki94yWjs7KndzmozUrvjBzb` (https://ecommerce-mvp-prototype-mr5zyzalf-azadbasis-4964s-projects.vercel.app). verify-live-release (empty mode) passed 16 checks on the staged URL. Staged /cart, /checkout, /track-order and /payment/failed show the Bangla copy and the real support number; the placeholder `01700-000000` is gone. After promotion the same 16 checks passed on https://kenasathi.com, and a 375px screenshot of /checkout showed the Bangla layout.
- Follow-ups noticed: with an empty cart, checkout still shows delivery BDT 60 and total BDT 60; prices render as "BDT" rather than "৳"; district names are still in English.
- Rollback target: `dpl_914a7AG26bhNdwwLVTvKxiEyzu6i`. No database changes.

## 2026-11-03: Request-Time Sitemap Deployment

- Root cause: with `revalidate = 3600`, the production `sitemap.xml` stayed a Vercel cache HIT for about 24 h and kept listing the 9 deactivated dummy products (404). A DB change made outside the admin never triggers the admin's `revalidatePath`.
- Fix: #10 (`export const dynamic = "force-dynamic"` in `src/app/sitemap.ts`). #9 made `scripts/verify-live-release.mjs` pass on an empty catalog (`--require-catalog` restores the strict mode).
- On owner request, #9 merged as `f91bbce` and #10 as `edc9be1`, after green CI. #10 needed a merge of main to keep both plan §৯ log rows.
- Deployed `edc9be1` with `--skip-domain` as `dpl_914a7AG26bhNdwwLVTvKxiEyzu6i` (https://ecommerce-mvp-prototype-mtn01bm82-azadbasis-4964s-projects.vercel.app). The staged run of verify-live-release in empty mode passed 16 checks, and the sitemap returned a MISS with 0 product URLs. After promotion, the same 16 checks passed on https://kenasathi.com (5 categories, 0 products). `/sitemap.xml` returns Age 0 and MISS, and `/`, `/products`, `/checkout` and `/api/health` return 200.
- Rollback target: `dpl_4LTNkAHWpVdR152ErKYhoZNJJsJw`. No database changes.

## 2026-11-02: Next.js 16.4.3 Security Patch Deployment

- Upgraded `next`/`eslint-config-next` 16.3.8 → 16.4.3 and ran `npm audit fix` (`zod` 4.6.7, `source-map-js` 1.2.2, `postcss-selector-parser` 6.1.5) to clear a critical Next.js advisory range (16.0.0-16.4.0) and two high transitive advisories. No application code changed. Local lint/typecheck, 3 unit, 17 database, 9 isolated production-browser tests, build and `npm audit --audit-level=high` passed.
- On owner request, deployed source `67a9b59` (branch `claude/fix-npm-audit`, deployed before merge; PR #3 later merged into main as `516f561` with the same application code) as `dpl_4LTNkAHWpVdR152ErKYhoZNJJsJw` with `--skip-domain`. The staged URL https://ecommerce-mvp-prototype-3hfa9gwu3-azadbasis-4964s-projects.vercel.app passed all 13 release checks and a `/_next/image` Supabase image request (200, image/png) before promotion. After promotion, all 13 checks passed on https://kenasathi.com.
- Live Playwright: 5 passed, 3 intentionally skipped, 1 failed. The failing mobile cart test clicks the first product, which is currently sold out in live data. The same test fails the same way on the previous deployment, so the upgrade did not cause it. A one-off check using the first in-stock product passed the mobile add-to-cart, cart and checkout flow on the live site. The test (and the isolated order helper) now pick the first enabled add-to-cart button; afterwards the isolated run passed 9/9 and the live run 6 passed, 3 skipped, 0 failed.
- Rollback target: `dpl_C2qv3XQa3UhMRHvvfpNU8BftpfRp` (https://ecommerce-mvp-prototype-muq7dv1ir-azadbasis-4964s-projects.vercel.app). No database changes.

## 2026-10-02: Consistent Brand Logo And Browser Icons

- Published and promoted as `dpl_C2qv3XQa3UhMRHvvfpNU8BftpfRp`, source `df1175e`; [PR #2](https://github.com/azharulislamtech/kenasathi-web/pull/2) merged into main as `d044060`. [GitHub CI](https://github.com/azharulislamtech/kenasathi-web/actions/runs/37019691713) passed. All 13 staged/live release checks, six live icon asset checks and the live manifest passed; browser confirmed the live header SVG loaded at 36px. Previous hardening deployment `dpl_6x7VyDCPSkxivzgZBno8FHcVCUNf` remains the immediate application rollback target.
- Preserved the existing emerald/gold KS identity as a font-independent SVG in `src/app/icon.svg`; the shared storefront/footer/admin logo uses the same asset with fixed 36px dimensions, accessible link naming, keyboard focus and a 44px minimum link height.
- Added a multi-resolution 16/32/48px ICO favicon, opaque 180px Apple touch icon, 192/512px PNG icons and a separate padded maskable 512px icon. Next's metadata file conventions register icons and the manifest automatically; the manifest uses browser display and does not imply offline support.
- Home Organization JSON-LD identifies the real Kena Sathi URL and a crawlable 512px logo. No customer/order/database/payment behavior changed.
- Verified desktop and 320px mobile rendering, shared admin logo, icon responses/types/dimensions and metadata. Lint/typecheck and isolated production build plus all 9 existing browser regressions passed.
- The SVG is the master artwork. Regenerate PNG/ICO assets from it when changing branding; keep maskable/Apple artwork on an opaque emerald background with 70% scale/15% padding. Do not introduce platform-specific logo designs or unsupported SEO guarantees.

## 2026-10-02: Vercel Production Deployment And Live Verification

- After explicit owner approval, PR #1 merged into `main` as `04249976e5064deab2bd31b10129910bbabb3a49`. [GitHub CI run 36997183643](https://github.com/azharulislamtech/kenasathi-web/actions/runs/36997183643) completed successfully, including lint/typecheck/unit/database tests, isolated production-browser tests, build and dependency audit. Workspace synchronized to main; deployed application code matches this release (later additions are release documentation/verifier).
- User completed device authentication; confirmed account `azadbasis-4964`, team `azadbasis-4964s-projects`, existing project `prj_MdYl4Mdwj0hPUAJZmHU5zNGB4Qtk`.
- Explicitly configured `NEXT_PUBLIC_SITE_URL=https://kenasathi.com`, `ENABLE_ONLINE_PAYMENTS=false`, `ALLOW_DEMO_CATALOG=false` without exposing credentials.
- Deployed application revision `26e29a1` as `dpl_6x7VyDCPSkxivzgZBno8FHcVCUNf`; cloud build passed. Staged URL https://ecommerce-mvp-prototype-6pij5s22n-azadbasis-4964s-projects.vercel.app passed 13 HTTP/SEO/health checks before promotion.
- Promoted to the production domains. The same 13 checks passed on https://kenasathi.com, including health 200, category/product JSON-LD/canonicals, sitemap, private noindex, missing-product 404 and signed-out admin redirect.
- Non-destructive live Playwright suite: 6 passed, 3 intentionally skipped (no admin credentials and isolated-only mutations). No checkout notifications or lasting test customer/order mutations were sent to production.
- Previous ready deployment retained for rollback: https://ecommerce-mvp-prototype-nn7hdp8eh-azadbasis-4964s-projects.vercel.app. Remote DB remains at V10; do not remove migrations on application rollback.
- Added a reusable non-mutating `scripts/verify-live-release.mjs`. Vercel deployment uploads contained no private backup/credential files; the dry-run's empty private directory entry contained zero bytes and its contents were excluded.
- Remaining limits: real browser admin login/Storage upload, off-site host-loss recovery, account-side alert/analytics activation, physical return reconciliation and owner-confirmed product/policy facts. Online gateway remains disabled pending real certification.


## 2026-10-02: Authorized Supabase Rollout And Recovery Verification

Owner authorized completing the external rollout against the named Supabase project.

- Backed up the complete database archive and all 8 product-image files (947,978 image bytes). Encrypted the recovery ZIP with Windows DPAPI CurrentUser, verified decrypt/hash round-trip and preserved it under ignored `.private-backups/`. Added explicit Git/Vercel exclusions. Removed temporary plaintext copies and stopped scratch clusters after checking the encrypted database hash.
- Restored the actual production public schema/data into a separate password-protected PostgreSQL 18 cluster on loopback. Applied pending Flyway migrations there, preserved business row counts/stock, and passed 3 independent-session duplicate-checkout plus cancellation tests. This proves application-schema recovery, not a full Supabase cloud/platform restore.
- Applied V8/V9 remotely, then added/tested/restored/applied V10 to correct four legacy COD pending-payment inconsistencies using existing admin-paid/cancelled order records. Audit events record the source; unknown collection timestamps stay unknown. No gateway settlement, refunds, physical historical-stock assumptions or outbound test notifications occurred.
- Remote read-only result: schema 10, orders 8, products 9, payments 8, aggregate stock 113, cancelled orders 1, payment mismatches 0. Existing business order counts and stock remained unchanged.
- Real Supabase integration checks used authenticated-admin RLS product insert/update/delete, service-role COD amount/replay/stock, cancellation/reopening, atomic settlement and downgrade rejection inside a fully rolled-back transaction. No lasting test customer/order/product rows were created.
- Database regression suite: 17 passed with V1-V10. Production browser suite: 9 passed with all ten migrations. Existing lint/typecheck/unit/build verification remains required for source release.
- Remaining account boundary: Supabase dashboard and Vercel CLI/browser lack signed-in sessions. Vercel device-login handoff started; no application deployment has been claimed. Browser Auth login, Storage upload, provider monitoring/analytics, off-site backup retention and SSLCommerz remain separate operational gates.
- Published source revision `c3e4515` on `codex/production-hardening` and draft PR [#1](https://github.com/azharulislamtech/kenasathi-web/pull/1). GitHub Actions is enabled, but no cloud workflow run was observed; local passing checks are not a cloud-CI result.
- Post-migration live read-only checks: home/products/tracking/sitemap return 200; new `/api/health` remains 404 and category sitemap entries are absent, confirming the new application revision is not deployed. Do not merge/deploy or describe it as live solely from database migration success.


## 2026-10-02: Tested SEO And Order Integrity Hardening (Local Release)

Changed:

- Migrated Next 14/React 18 to Next 16.3.8/React 19.3 using bundled framework guides: asynchronous request APIs, proxy convention, React action state, flat ESLint configuration and compatible audited dependency updates.
- Added V9 for checkout idempotency, accepted-order phone/IP quotas, duplicate product normalization, transactional stock cancellation/reopening, explicit sellable-return confirmation, atomic admin settlement and verified gateway updates. Previously applied SQL migrations were not changed.
- Preserved COD checkout, delivery pricing, tracking, reviews, admin auth/product management and disabled-by-default online payments. Fixed the cart hydration click race discovered by browser tests.
- Added category canonical routes, Product/Breadcrumb JSON-LD with actual prices/stock/approved ratings, correct sitemap timestamps, noindex utility pages, safe response headers, real catalog facts instead of demo specs, and incomplete-listing warnings.
- Added health/error instrumentation, privacy-filtered optional analytics, retry UX, CI, in-memory migration/integrity tests and real server-action browser tests against disposable local services.
- Typecheck generates Next route definitions first, so verification also works in a fresh checkout before the first build. Production browser checks include health readiness and missing-product 404 responses.
- Added `production-release.md` and updated handoff/setup/testing/roadmap docs with deployment, reconciliation, backup/restore and monitoring gates.

Verification:

- `npm run lint`, `npm run typecheck` and `npm run build`: passed.
- `npm run test:db`: 16 passed; all actual V1-V9 migrations applied to disposable PGlite.
- `npm run test:unit`: 3 passed (checkout retry identity, safe structured data and analytics privacy).
- `npm run test:e2e:isolated`: 9 passed against development Next; `npm run test:e2e:production`: 9 passed against built production Next. Coverage includes COD creation/tracking, simulated admin auth/dashboard/cancellation/return confirmation, SEO, private headers and mobile/cart regressions.
- Registry-backed `npm audit --audit-level=high`: 0 vulnerabilities.
- Read-only remote `flyway info`: schema version 7; V1-V7 successful, V8/V9 pending.

Limits:

- No remote migrations, deployment or production customer writes were performed. Local verification is not a full production-readiness certification.
- Auth/PostgREST platform interfaces are simulated; PGlite lacks pgcrypto and independent concurrent sessions. Real staging Auth/Storage/product CRUD, gateway certification, cloud restore, monitoring activation, owner-confirmed product/policy facts and live performance remain release gates.
- Online checkout remains disabled. Failed gateway sessions keep reserved stock until administrative cancellation; automatic expiry needs a separate settlement policy.


## 2026-07-10: Policy Pages, SEO Metadata, Real Footer Contact

Changed:

- Added public legal pages: `/privacy-policy`, `/terms`, and `/return-policy`, written for the COD-first Bangladesh flow (48-hour return window, refunds within 7 business days via bKash/Nagad/bank).
- Added SEO foundation: `metadataBase` + title template in the root layout, `generateMetadata` on product detail pages (OG title/description/image from real product data), static metadata on the product listing, `src/app/sitemap.ts`, and `src/app/robots.ts` (admin/api/cart/checkout/payment disallowed).
- Added `src/lib/site.ts` `getSiteUrl()` (env-driven with `https://kenasathi.com` fallback, BOM-safe via `cleanEnv`).
- Updated the footer: real phone `01717121839` (tel: link), Facebook page link, and links to all three policy pages. Facebook URL is a stand-in until the real page is provided.

Verification:

- `npm run typecheck` and `npm run build` passed (33 routes including new static pages).
- Live checks on `kenasathi.com`: policy pages return 200, `robots.txt` and `sitemap.xml` serve correct kenasathi.com URLs, product pages emit og:title/og:description/og:image with the uploaded product image, and the footer shows the new contact and policy links.

Notes:

- Remaining market-readiness items that need user accounts: analytics (GA4/Meta Pixel) and error monitoring (Sentry).
- Product names/short descriptions now feed SEO tags directly; catalog copy should be improved from the admin panel.

## 2026-07-10: Verified Reviews, Env BOM Hardening, Telegram Order Notifications

Changed:

- Completed the verified product reviews feature: `V7__verified_product_reviews.sql` (reviews table, RLS, public/summary/submit RPCs), review form and review list on product detail pages, and a new `/admin/reviews` moderation page with approve/reject actions.
- Removed the hardcoded `rating` field from the catalog; product pages now show the real approved-review average and count.
- Fixed the production "Place Order" failure (`Cannot convert argument to a ByteString ... 65279`): an invisible BOM in a Vercel env value broke Supabase request headers. Added `src/lib/env.ts` `cleanEnv` and applied it to every env read that feeds URLs, headers, or credentials (Supabase server/auth/middleware, SSLCommerz, payment base URL).
- Added free Telegram admin notifications (`src/lib/notifications/telegram.ts`) for new orders and new pending reviews. Failures are logged and swallowed so checkout never blocks. `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` set in `.env.local` and Vercel Production.

Verification:

- `npm run typecheck` and `npm run build` passed.
- `flyway migrate` applied schema version `7` successfully.
- `npx playwright test` passed with 3 passed and 1 skipped (admin credentials not set).
- BOM failure reproduced and fix confirmed against the live Supabase endpoint; live place-order path on `kenasathi.com` now reaches the checkout RPC (verified with a non-persisting invalid-product submission).
- End-to-end Telegram check: a marked test order on the live site delivered the notification, then the test order was deleted and stock restored.

Notes:

- The poisoned Vercel env value (likely `SUPABASE_SERVICE_ROLE_KEY`) was not re-pasted; `cleanEnv` neutralizes it at read time. Re-paste it if the variable is ever edited.

## 2026-07-07: Service Role Key Rotated (Exposure Closed)

Changed:

- Rotated the exposed Supabase service role key by migrating to the new Supabase
  API keys system: created a new revocable **secret key** and disabled the legacy
  `service_role` JWT.
- Updated `SUPABASE_SERVICE_ROLE_KEY` in local `.env.local` and in the Vercel
  Production environment, then redeployed production so the new key is live.
- Confirmed the anon key was already migrated to a new **publishable** key, so
  disabling legacy JWT keys did not break the app.

Verification:

- `npm run verify:service-key` returned `OK` for the new key (pre- and post-rotation).
- Live site `https://kenasathi.com` returned HTTP 200 on the homepage and
  `/products` after the redeploy and after the legacy keys were disabled.
- The old legacy `service_role` JWT is dead because the legacy API keys were
  disabled in the Supabase Dashboard (platform-level revocation, immediate).

Notes:

- Service role key rotation is no longer a production blocker.
- The database password used by Flyway (`flyway.conf`) is a separate secret and
  was not part of this rotation.

## 2026-07-07: COD-Only Checkout And District Delivery Charges

Changed:

- Added a shared Bangladesh delivery helper with all 64 districts and canonical district validation.
- Updated checkout to calculate delivery charge live from the selected district: Dhaka is BDT 60; every other Bangladesh district is BDT 120.
- Kept active checkout Cash on Delivery only by default; SSLCommerz remains implemented but is hidden/rejected unless `ENABLE_ONLINE_PAYMENTS=true` is explicitly configured.
- Added Flyway migration `V6__district_delivery_charge.sql` so the trusted `create_checkout_order` RPC validates the district and calculates delivery charge server-side.
- Updated storefront product/home copy and E2E smoke coverage for district delivery pricing.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `flyway -configFiles=".\flyway.conf" migrate` applied schema version `6` successfully.
- `npx playwright test` passed with 3 passed and 1 skipped because authenticated admin E2E credentials were not set.

Notes:

- Online payment can be re-enabled later only after SSLCommerz sandbox/live verification and by setting `ENABLE_ONLINE_PAYMENTS=true` in deployment secrets.
- Service role key rotation was completed later the same day (see the newer rotation entry above).

## 2026-07-05: Kena Sathi Site Branding And Copy

Changed:

- Added a reusable Kena Sathi `KS` logo mark and wordmark for storefront, footer, admin shell, and admin login.
- Updated homepage, metadata, footer, support, payment, and gateway-facing copy from ShopPilot/prototype language to Kena Sathi customer-facing language.
- Updated README, compact handoff, and the SSLCommerz decision note to use Kena Sathi naming.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- Full networked `npm run build` and Vercel deploy were not completed because the required external-network approval hit the current usage limit.

Notes:

- Existing `SP-` order numbers and mock historical order IDs were left unchanged because they are part of the current order/tracking data shape.

## 2026-07-05: Product Detail Image Gallery Navigation

Changed:

- Replaced the static product detail image strip with a client-side product gallery.
- Added thumbnail click support and previous/next image controls for products with multiple uploaded images.
- Kept single-image and no-image products on the existing primary visual/placeholder path.

Verification:

- `npm run typecheck` passed.
- `npm run build` passed.
- Local Playwright smoke check on `/products/pure-glow-serum` confirmed 2 thumbnails, next/previous controls, main image changes on next click, and thumbnail click restores the first image.

Notes:

- Gallery thumbnails now only represent images from the current product, not related product visuals.

## 2026-07-04: Service Role Key Rotation Tooling And Runbook

Changed:

- Added `docs/secret-rotation.md`, a best-practice runbook for rotating the exposed Supabase service role key (and future secrets), including where the key lives, dashboard rotation, updating every stored copy, and confirming the old key is dead.
- Added `scripts/check-service-key.mjs`, a dependency-free probe that verifies whether the currently configured `SUPABASE_SERVICE_ROLE_KEY` is a live service_role key. It never prints the key.
- Added the `verify:service-key` npm script (`node --env-file=.env.local scripts/check-service-key.mjs`).
- Pointed README and AI_HANDOFF at the rotation runbook.

Verification:

- Confirmed no service role key is present in tracked files or Git history; `.env.local` and `flyway.conf` are git-ignored.
- `npm run verify:service-key` returned `OK` against the currently configured key, proving the probe works.
- Audited `src/lib/supabase/server.ts`: the service role key is read only from env and guarded by `import "server-only"`, so it cannot reach the client bundle.

Notes:

- The actual key regeneration is a Supabase Dashboard action and is still pending. Follow `docs/secret-rotation.md` steps 2-6 to complete it, then flip the outstanding "rotation still required" warnings to "rotated, old key confirmed dead".
- Rotation is not complete until step 5 confirms the OLD key returns HTTP 401.

## 2026-07-04: Phase 6 SSLCommerz Payment Integration

Changed:

- Added a provider-neutral payment service facade and an SSLCommerz hosted-checkout adapter.
- Added server-side SSLCommerz session initiation after checkout order creation.
- Added SSLCommerz success, fail, cancel, and IPN route handlers.
- Added server-side SSLCommerz validation before updating `orders.payment_status` or `payments.payment_status`.
- Logged gateway initiation, callbacks, validation responses, and status changes in `payment_events`.
- Added Flyway migration `V5__sslcommerz_payment_method.sql` and applied it; schema is now version `5`.
- Updated checkout UI, payment success/failure UX, `.env.example`, handoff docs, roadmap, decision log, Supabase setup, README, and added `docs/payment-integration.md`.

Verification:

- Reviewed official SSLCommerz docs for hosted checkout session creation, validation API, transaction query API, and IPN/callback behavior.
- `flyway -configFiles=".\flyway.conf" migrate` applied version `5` successfully.
- `npm run typecheck` passed.
- `npm run lint` passed with no warnings.
- Sandboxed `npm run test:e2e` hit Windows `EPERM` unlinking `test-results/.last-run.json`; rerunning outside the sandbox passed the non-destructive suite with 3 passed and 1 skipped because admin E2E credentials were not set in that process.

Notes:

- Real SSLCommerz sandbox transaction verification still requires sandbox credentials and a public HTTPS callback URL.
- Payment status is marked `paid` only when SSLCommerz validation matches local order number, amount, and BDT currency and is not risky.
- Failed/cancelled online payments do not currently auto-restore stock; stock is still decremented when the checkout order is created.
- Service role key rotation is still required before production.

## 2026-07-04: Compact New-Session Handoff

Changed:

- Added `COMPACT_HANDOFF.md` as the shortest safe resume file for future AI/chat sessions.
- Linked the compact handoff from `README.md` and `AI_HANDOFF.md`.
- Updated roadmap and handoff status to reflect the user's manual confirmation of admin product CRUD, public active/inactive behavior, and storefront order-status tracking.

Verification:

- `git diff --check` passed with CRLF warnings only.

Notes:

- The full context still lives in `AI_HANDOFF.md`, roadmap, engineering log, decision log, Supabase setup, and E2E guide.

## 2026-07-04: First Admin User Verified Through Authenticated E2E

Changed:

- First Supabase Auth admin user was created and matched to an active `admin_users` row, closing the long-standing "pending first admin user setup" gap.
- Fixed a stale assertion in `tests/e2e/admin-authenticated.spec.ts`: the admin orders heading is `Order Management`, not `Manage Orders`.

Verification:

- `npm run test:e2e` passed 4/4 with `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` set.
- The authenticated admin smoke test now signs in through real Supabase Auth, lands on `/admin`, and confirms `Store Overview`, `Recent Orders`, `Low Stock Products`, and the `/admin/orders` `Order Management` surface render for an authorized admin.

Notes:

- This verifies Phase 3 admin auth and the read surfaces of the Supabase-backed dashboard/order list for a real admin session.
- Automated destructive write coverage is still intentionally absent, but the user manually confirmed authorized product CRUD writes and admin order status updates in the browser.
- Service role key rotation is still required before production.

## 2026-07-04: Playwright E2E Smoke Foundation

Changed:

- Installed `@playwright/test` as a dev dependency and added Playwright Chromium setup scripts.
- Added `playwright.config.ts` with a reusable local dev-server configuration and Chromium project.
- Added non-destructive E2E smoke tests for storefront product/cart/checkout reachability, public tracking safe states, and logged-out admin route protection.
- Added optional authenticated admin smoke coverage guarded by `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`.
- Added stable test hooks for product cards, cart buttons, cart count, cart lines, and cart checkout link.
- Added `docs/e2e-testing.md` and updated handoff, roadmap, decision log, README, and `.gitignore` context.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed with no warnings.
- `npx playwright test --list` found 4 tests across 3 files.
- `npm run test:e2e` passed with 3 tests passing and the authenticated admin smoke test skipped because admin E2E credentials were not set.

Notes:

- The default E2E suite does not submit checkout orders or mutate Supabase data beyond browser localStorage.
- Playwright Chromium browser binaries were installed locally under the user Playwright cache.
- `npm install` reported 5 dependency audit findings; they were not auto-fixed because force fixes can introduce breaking changes.

## 2026-07-04: Supabase-Backed Admin Dashboard

Changed:

- Added `src/lib/supabase/admin-dashboard.ts` as the admin dashboard data helper.
- Replaced mock admin dashboard stats with Supabase-backed order/product counts, paid revenue, recent orders, and low-stock products.
- Linked recent orders and low-stock products to their admin detail/edit screens.
- Added empty states for dashboards with no orders or no low-stock products.
- Removed the unused mock `dashboardStats` constant from `src/lib/data.ts`.
- Updated handoff, roadmap, and README context.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed with no warnings.
- Runtime smoke check: logged-out `/admin` redirects to `/admin/login?reason=auth-required`.

Notes:

- In-app browser was not signed in during verification, so authorized dashboard visual smoke testing still requires an admin session.
- Payment gateway capture/webhook remains Phase 6.

## 2026-07-04: Real Customer Order Tracking

Changed:

- Replaced hardcoded `/track-order` mock data with a real Supabase-backed order lookup.
- Added server-side tracking helper that verifies order number plus checkout phone before returning order status, payment status, totals, timestamps, and items.
- Added a live customer timeline that reflects admin-updated order statuses including delivered and cancelled states.
- Revalidated `/track-order` and `/payment/success` after admin order status updates.
- Updated handoff, roadmap, and decision docs.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed with no warnings.
- Runtime smoke check: `/track-order?order=SP-20260704-001001&phone=01717121839` returns 200.
- Runtime smoke check confirmed the tracking page contains `Live Status`, contains `Delivered`, and no longer contains the old mock `SP-1028` order.

Notes:

- Public tracking uses the server-only service role client after matching order number and normalized Bangladesh phone number.
- Payment gateway capture/webhook is still future work.

## 2026-07-04: Dev Server Cache Rebuild For Broken Storefront UI

Changed:

- Diagnosed broken storefront rendering where product pages showed plain HTML and oversized images.
- Found stale/corrupt Next.js generated cache: CSS and client chunks under `/_next/static/` returned 500, and dev logs showed `Cannot find module './819.js'`.
- Stopped the stale local dev server, removed generated `.next` cache after path verification, and restarted `next dev` on port 3000.

Verification:

- `/products` returned 200 after restart.
- `/_next/static/css/app/layout.css` returned 200 and included `.product-visual` and `.container-page` styles.
- In-app browser render check confirmed styled product cards, fixed product visual sizing, header rendering, and 7 product cards.

Notes:

- No source code or database change was required; this was a local generated-cache/dev-server issue.
- If this symptom returns, restart dev server and rebuild `.next` before changing UI code.

## 2026-07-04: Phase 5 Real Cart And Checkout Order Creation

Changed:

- Added Flyway migration `V4__create_checkout_order_rpc.sql` and applied it to Supabase; schema is now version 4.
- Added atomic PostgreSQL checkout RPC for order creation, order_items, pending payments, and stock decrement.
- Replaced fake cart behavior with localStorage-backed cart provider, header count, quantity update, remove, add-to-cart, and buy-now behavior.
- Replaced checkout prototype with a client cart summary plus trusted server action that submits only product IDs and quantities.
- Replaced fake payment success data with real order summary lookup and cart clearing after success.
- Replaced admin order list/details mock data with Supabase-backed reads and basic admin status update action.
- Updated handoff, roadmap, Supabase setup, and decision docs.

Verification:

- `flyway migrate` applied schema version `4` successfully.
- `npm run typecheck` passed.
- `npm run lint` passed with no warnings.
- `npm run build` passed.
- Runtime smoke check: `/cart` returns 200.
- Runtime smoke check: `/checkout` returns 200 and contains `Complete Your Order`.
- Runtime smoke check: `/payment/success` returns 200 and contains the success state.
- Runtime smoke check: logged-out `/admin/orders` redirects to `/admin/login?reason=auth-required`.

Notes:

- Payment gateway capture/webhook is not implemented yet; checkout creates pending orders and pending payments.
- Customer track-order is now implemented through order-number plus phone verification.

## 2026-07-04: Storefront Uploaded Product Image Rendering

Changed:

- Extended storefront `Product` data shape with primary image and gallery image metadata.
- Mapped Supabase `product_images` rows into the storefront catalog adapter.
- Updated `ProductVisual` to render uploaded images through `next/image` with placeholder visuals as fallback.
- Wired product cards, product detail hero, and product detail thumbnails to use uploaded images.
- Allowed Supabase Storage image URLs in `next.config.mjs` image remote patterns.
- Updated AI handoff, roadmap, and README context.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed with no warnings.
- `npm run build` passed.
- Runtime smoke check: `/products/tulip-ceiling-fan-36` returns 200 and includes optimized image markup.
- Runtime smoke check: `/products` returns 200 and includes optimized image markup.
- Runtime smoke check: first optimized image endpoint returned 200 with `image/jpeg`.

Notes:

- Supabase Storage bucket must stay public or the image URLs need to move to signed URL handling.

## 2026-07-03: Phase 4 Admin Product CRUD Implementation

Changed:

- Added Supabase-backed admin catalog read helpers for all products/categories.
- Replaced mock admin product list with real Supabase data, search, status filter, and success/error messages.
- Replaced prototype product form with create/edit server actions, server-side validation, draft/active status handling, and featured flag support.
- Added Supabase Storage product image upload and `product_images` row creation.
- Added product image removal from the edit page.
- Added deactivate/restore actions and safe delete behavior; products with order history are deactivated instead of hard deleted.
- Updated Supabase database type shape to include `Relationships` keys expected by Supabase client typings.
- Increased Next server action body limit to 8 MB while keeping per-image validation at 5 MB.
- Updated AI handoff, roadmap, decision log, and README context.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed outside the sandbox after the sandboxed build hung without progress.
- Runtime smoke check: `/products/aurora-wireless-earbuds` returns 200.
- Runtime smoke check: logged-out `/admin/products` redirects to `/admin/login?reason=auth-required`.
- Runtime smoke check: logged-out `/admin/products/new` redirects to `/admin/login?reason=auth-required`.

Notes:

- Authorized admin CRUD browser testing is still pending creation of the first real Supabase Auth admin user and matching active `admin_users` row.
- Service role key rotation is still required before production.

## 2026-07-02: Phase 3 Admin Auth Protection

Changed:

- Installed `@supabase/ssr` for Next.js/Supabase cookie-based auth.
- Added server auth client and `requireAdmin()` guard.
- Added middleware session refresh.
- Replaced prototype admin login redirect with real Supabase Auth login.
- Added admin logout action.
- Protected `/admin` panel routes server-side through the admin layout.
- Updated admin shell to show signed-in admin email and sign-out button.
- Updated handoff, roadmap, decision log, and Supabase setup docs.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed after narrowing the middleware Supabase SSR import.
- Runtime smoke check: `/admin/login` returns 200.
- Runtime smoke check: logged-out `/admin` redirects to `/admin/login?reason=auth-required`.
- Runtime smoke check: public `/products` still returns 200.

Notes:

- Successful authorized admin login still needs a real Supabase Auth user inserted into `admin_users`.
- Service role key rotation is still required before production.

## 2026-07-02: Phase 1 Seed And Phase 2 Public Catalog Supabase Read

Changed:

- Added `db/migration/V3__seed_mvp_catalog.sql` and applied it with Flyway.
- Added `src/lib/catalog.ts` as the storefront catalog adapter.
- Migrated home page categories/featured products to Supabase-backed reads.
- Migrated product listing to Supabase-backed reads with search, category, price, and sort filters.
- Migrated product details and related products to Supabase-backed reads.
- Added empty states for public catalog sections.
- Updated handoff, roadmap, Supabase setup, and decision docs.

Verification:

- `flyway migrate` applied schema version `3` successfully.
- Supabase anon public read probe returned 5 active categories and 6 active products.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and generated Supabase-backed product detail paths.
- Secret scan found only placeholder password lines, no real Supabase keys in docs/source files.
- `git diff --check` passed.
- Local dev server smoke checks passed for `/`, `/products`, and `/products/aurora-wireless-earbuds`.

Notes:

- Public catalog now uses Supabase when env vars are configured.
- Cart, checkout, admin dashboard/orders/products still contain mock/prototype behavior.

## 2026-07-02: Documentation Backbone And Secret Scrub

Changed:

- Added `AI_HANDOFF.md` as the root handoff/context file for future AI tools.
- Added `docs/production-roadmap.md` with phased production hardening plan.
- Added `docs/decision-log.md` for architecture/security decisions.
- Rewrote `docs/supabase-setup.md` to remove secrets and record safe setup details.
- Documented mandatory workflow: future changes must update this log and relevant decision/context docs.

Verification:

- Secret scan found only placeholder password lines, no real Supabase keys in docs/source files.
- `git diff --check` passed.
- Local dev server smoke checks passed for `/`, `/products`, and `/products/aurora-wireless-earbuds`.
- `npm run typecheck` passed.
- `npm run lint` passed.

Notes:

- Supabase service role key was exposed during earlier setup and should be rotated before production.

## 2026-07-02: Supabase Flyway Migration Applied

Changed:

- Ran Flyway against Supabase using Session Pooler.
- Applied `V1__init_ecommerce_core_schema.sql`.
- Applied `V2__supabase_rls_policies.sql`.
- Updated local `flyway.conf` to use working Session Pooler host.

Verification:

- `flyway info` returned schema version `2` with both migrations in `Success` state.

Notes:

- Direct host `db.qguqohukemijphzwqxgs.supabase.co` failed due IPv6/DNS route.
- Working host: `aws-1-ap-southeast-1.pooler.supabase.com`.

## 2026-07-01: Supabase Foundation Files Added

Changed:

- Added Flyway-compatible database migrations.
- Added optional demo catalog seed SQL.
- Added Supabase TypeScript database types and server-only client helpers.
- Added `@supabase/supabase-js` dependency.
- Added `.env.example` and `flyway.conf.example`.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.

Notes:

- App UI still uses mock catalog/order data in most pages.
