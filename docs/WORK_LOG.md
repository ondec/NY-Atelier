# NY Atelier — shared work log

Use this file for dated handoffs between Claude, Codex and maintainers. Read the latest entry first, then [AI_HANDOFF.md](AI_HANDOFF.md) for architecture and design. Dates use Africa/Accra. Write facts and results, not hidden reasoning or a chat transcript. Do not include credentials or private fitting values.

## 2026-11-23 — Claude → Codex — Website UI design handed to Codex

**User decision:** Codex takes the visual/UI design of the new public website in `codebase/website`; the user will give design ideas section by section or page by page. Claude continues on the backend (`apps/`) and will not edit `website/` meanwhile. Brief, rules (local only, not in Git, later its own branch + live preview, integration later) and current state are in AI_HANDOFF §10 "Public website prototype". Claude's earlier dev server on port 5173 was stopped so Codex can start its own (`cd codebase/website && npm run dev`). `website/` is untracked: do not `git add -A` from `codebase/` on `main`. Pending, unrelated to the website: the owner's live run of **Import WordPress products** at office.thenyatelier.com; R2 photo storage once the Cloudflare admin grants access.

## 2026-11-23 — Claude — Standalone public website prototype added at `codebase/website` (local only, NOT committed)

**User direction:** the user supplied `ny-atelier-react-website.zip` (built by another AI, incomplete) for the new public website. It is **standalone** from the existing WordPress site and from the staff portal, runs **locally only** until the user approves the design and behaviour, and will later go to GitHub **as its own branch** (not `main`) with a **live preview** for the website; integration with the portal/API happens later only where necessary. Do not deploy it, publish `dist/`, or commit it to `main` without the user's say.

**Done:** the zip (15 files, React 19 + Vite 6 + React Router 7, no `node_modules`) was extracted to a scratch folder and read before use: no network calls besides Google Fonts and product photos linked from NY's own WordPress sites; scripts are plain Vite. Copied to `codebase/website` (untracked). `npm install --ignore-scripts` (70 packages), `npm run check` and `npm run build` pass (`dist/` removed afterwards). The Render Dockerfile copies only `apps/…`, so this folder cannot affect the live deploy. **Fix:** the page was blank because one-line `useEffect` callbacks returned values (`window.scrollTo` returns a Promise in current Chromium) and React threw `destroy is not a function`; `src/App.jsx` lines 52/57/67 now use block bodies. Home, RTW Store, Services, Our Story and Contact render; clicking through all nav links logs no errors. Run it with the session launch config `website` (`npm --prefix codebase/website run dev`, http://localhost:5173), outside `codebase/` in `../.claude/launch.json`. Pages are labelled as a concept preview; bag/wishlist use browser storage only; checkout, consultation form and catalogue are demonstrations.

**Fonts (same day, user request):** the website now uses the NY Office/Studio fonts from the same files (`website/public/fonts/`: `JosefinSans-Variable.ttf`, `AlfaSlabOne-Regular.ttf`, copied from `apps/portal/public/fonts`, with the OFL licences from `apps/mobile/assets/fonts`); Google Fonts (DM Sans unused, Josefin Sans, Playfair Display) removed from `index.html`. Display headings (h1, h2, large h3) use Alfa Slab One at about two-thirds of the original light-Josefin sizes (block at the end of `src/styles.css`); small label h3s stay Josefin. Alfa has no italic, so emphasised heading words are upright cognac (brass on dark backgrounds). Checked desktop and 375 px: no horizontal overflow, only the two local fonts load. The user plans to give design ideas section by section or page by page.

**Later (not done):** branch (README suggests `feature/ny-atelier-website`), a live preview host (the Render free workspace's 2 custom domains are used by studio./office.), and any integration with the shared catalogue/consultations API.

## 2026-11-23 — Claude — Owner import of WordPress products into the hosted catalogue (pushed `8de30c2`, live)

**Deployed:** pushed with the user's approval as `8de30c2`; Render ran migration `create_studio_catalogue_backups_table` (18.74 ms) and the portal route answers 403 to guests on `office.thenyatelier.com`. The owner has not run the import on the live site yet.

**User request:** build the step that copies the 111 imported WordPress styles to the live site.

**How it works:** on this Mac, `php artisan catalogue:export-wordpress-transfer <new path>` (local/testing only, never overwrites, mode 0600) writes a transfer file of the WordPress products (`wordpressId`), their `wp-rtw-variation-*` sizes without quantities, and WordPress-only colour photo sets (the app's own Red Clover photos are excluded). In NY Office → Ready-to-wear → Products, the owner (permission `team` + `catalogue.manage`, on the Office host where catalogue publishing is allowed) sees **Import WordPress products**: choose file → preview (nothing written) → **Add to catalogue** → **Undo import**. API `App\CatalogueTransfer::merge` only adds: products already present by id or `wordpressId` are left unchanged (listed as kept), sizes are skipped when the id, SKU (case-insensitive) or product+colour+fabric+size already exists, every added size is quantity 0 / `stockVerified=false`, photo sets are added only where missing; movements and collections are untouched; all photo links must be `https://rtw.thenyatelier.com/wp-content/uploads/…`. `CatalogueTransferController` applies under a row lock with the previewed revision (409 if it changed), refuses when nothing is new (422), saves the previous payload in new table `studio_catalogue_backups` (migration `2026_11_23_221837`), and `POST …/transfer/{backup}/undo` restores it only while the catalogue revision is still the one the import produced. Portal routes `/api/studio/catalogue/transfer` and `…/[backup]/undo`; UI `src/app/catalogue-import.tsx`; `WordPressCatalogueImport::images()` is now public for reuse.

**Transfer file:** `../imports/wordpress/2026-11-23/catalogue-transfer.json` (private, 0600, outside Git): 111 products, 751 sizes, 0 photo sets. Merge preview against the pre-import local copy (revision-1 payload): adds 102 products and 739 sizes, keeps the 9 matched products, skips the 12 sizes that duplicate existing ones (the local import itself contains these 12 duplicates on Old Money/Milano etc.; flagged, not changed), 366 counted units preserved.

**Checks:** API 193 passed / 1550 (new `CatalogueTransferTest`: export, preview no-write, add-only merge, kept product untouched, counts never copied, stale revision 409, nothing-new 422, undo and undo-after-change 409, owner-only, photo-origin and format validation, guest 401, export command 0600/no-overwrite). Pint, portal TypeScript, scoped ESLint, 87 logic tests, isolated production build (generated tsconfig includes reverted). Guest POSTs to both portal routes → 403, API → 401. **Not clicked through in a browser**: local NY Office needs an owner sign-in. The local catalogue was temporarily swapped to its revision-1 copy for the merge preview and restored with identical content (111 products, 861 variants); its revision is now **4** (was 2), so Office tabs open on the old revision get a 409 and reload.

**Next (user approval needed):** push; then the owner signs in at office.thenyatelier.com, opens Ready-to-wear → Products → Import WordPress products, chooses the transfer file, checks the preview and adds. Counts must then be entered per size before selling.

## 2026-11-23 — Claude — Review of Codex's WordPress RTW import (code pushed `0d30900`, live; catalogue data still local)

**Deploy:** with the user's approval, Codex's import tool and Not counted stock handling were pushed as `0d30900`; Render reports it live (22:11), `studio.` sign-in 200. The hosted catalogue was not changed: the 111 imported styles exist only in the local database until a separate, reviewed hosted transfer is built and approved.

**Verified against data:** local catalogue revision 2 has 111 products (all with `wordpressId`), 861 variants: 751 new `stockVerified=false` and the 110 pre-existing variants with their 366 units unchanged; the private pre-apply backup (`../imports/wordpress/2026-11-23/`, mode 0700/0600, outside Git) shows revision 1 with 9 products, 110 variants, 366 units, 0 movements. 14 styles typed Other; no zero prices. Sample WordPress image returns 200 image/jpeg without referrer. Note: Laravel collection `where('stockVerified', false)` is a loose comparison and also counts variants without the key; use a strict filter when re-checking.

**Code review:** import command is local/testing-only, dry-run by default, needs exact revision plus a new 0600 backup, locks the row; importer validates source/currency/HTTPS `rtw.thenyatelier.com/wp-content/uploads` image URLs, holds unclear/differing-price items, never overwrites existing variants' stock/SKU. Sale quote refuses `stockVerified=false` server-side; Studio disables those sizes; notifications/filters exclude them; an Office stock adjustment marks the size counted. No blocking issues. Minor: (1) re-running the import refreshes name/price/description/photos of styles it already imported (stock is protected), so do not re-run after staff edit those fields; (2) Office **Record movement** dropdown still shows "0 on hand" for uncounted sizes; (3) the Studio **Out of stock** filter no longer lists products with no variants; (4) photos are hot-linked from the WordPress site (originals about 600×700).

**Checks re-run:** API 186 passed / 1511 assertions, Pint, portal TypeScript, 87 logic tests, scoped ESLint. Pushing the code would NOT copy this catalogue to Render; a separate reviewed, revision-safe hosted transfer is still needed.

## 2026-11-23 — Codex — WordPress RTW catalogue imported locally (NOT deployed)

**User direction/status:** import `rtw.thenyatelier.com` now, count stock later, use WordPress image links for now. Cloudflare R2 setup/copying is paused. This catalogue import and its code are local only, uncommitted and NOT on Render. Claude separately deployed staff password reset and both staff subdomains in `48c7e0e`; the older local-only recovery entry below is superseded by that deployment and the user's successful reset acceptance.

**Source/results:** user-signed-in WooCommerce admin CSV export, cross-checked against the public published-product snapshot. Imported **111 published styles**: 9 reviewed matches retain original app IDs; 102 new styles. Added **751 confirmed variations**. Excluded 11 unpublished CSV rows and held **26 published variations** (20 unspecified size/colour, 6 missing prices). **14 styles** use Other pending clothing-type review. Prices come from confirmed CSV variation sale/regular prices, not the Store API's incorrect zero current prices; the source reports all 111 on sale, and each imported style has a single confirmed price. No source stock quantities or SKUs exist: new variations carry `stockVerified=false` and display **Not counted**, quantity zero is only an internal placeholder, and generated `WP-RTW-{id}` SKUs are app identifiers. No fit/size charts, fabric facts or collection assignments were invented. All **110 pre-existing variants**, their quantities, existing collections and movements were preserved exactly. Local catalogue revision 1 → 2; repeat apply at revision 2 reports no changes/new variants and does not increment it. Customers, fittings, orders and receipts were untouched.

**Images:** 550 unique full WordPress upload links, all checked HTTP 200 with image MIME type. Galleries use those links directly; no R2 bucket, bulk asset download or WordPress content update. The inspected original sample is 600×700 px; using originals does not promise every source image is high resolution. Original app variant galleries remain preserved. The Expo customer shop still uses its separate nine-piece static catalogue and has NOT automatically received these products.

**Implementation:** API `app/WordPressCatalogueImport.php` validates source/currency/URLs, decodes plain text, preserves source IDs and existing stock, holds unclear or differing-price variants/styles, and supports repeat imports without duplicating source variants. `app/Console/Commands/ImportWordPressCatalogue.php` adds local/testing-only `catalogue:import-wordpress {csv} {snapshot}`: dry-run by default, `--apply --revision=N --backup=NEW_PRIVATE_PATH --report=PATH` to apply. It locks the catalogue row, requires an exact revision and a complete mode-0600 backup before writing. Do not bypass its local-only guard to change hosted data. Catalogue API validation preserves source metadata and `stockVerified`. Studio/API reject uncounted stock even if a positive quantity is accidentally present. Office/Studio add Not counted filtering/status, counted stock adjustments mark verification, and pending counts do not generate false sold-out notifications. WordPress-linked products no longer get new placeholder stock/galleries injected by the demo helpers.

**Private artifacts (outside Git):** `../imports/wordpress/2026-11-23/` holds `woocommerce-products.csv`, `public-catalogue.json`, `catalogue-before-apply.json`, `import-result.json`, `import-repeat.json`, `image-link-checks.json` and review/sample artifacts. Directory is restricted; CSV/backups are mode 0600. The raw admin CSV contains drafts: do NOT commit it. The result report lists the exact 26 variations/14 classifications to review. Do not overwrite these backups or replay the original revision-1 import over later edits.

**Checks:** 23 targeted API tests / 181 assertions (import, revision/backup/idempotence, source validation, preserved stock and sale denial), Pint, portal TypeScript/scoped ESLint, 9 catalogue/sales logic tests and isolated `NY_NEXT_DIST_DIR=.next-wordpress-import-check NY_STAFF_PREVIEW=1` production build passed. Removed only this build's generated tsconfig includes and regenerated default route types afterward. Local browser: 111 styles, imported Night Mosaic price/photos, original 600×700 image and gallery navigation, Not counted/disabled sale, Office size stock states and count form (closed without saving), and 390×844 without horizontal overflow. Unknown-stock alerts were excluded; existing alerts remained. Screenshots: `/tmp/ny-wordpress-studio-import.jpg`, `/tmp/ny-wordpress-office-import.jpg`. Local development services remain running.

**Next:** review/count source stock and the held variations/classifications; authorize publishing code plus a reviewed, revision-safe catalogue transfer to the hosted database. A GitHub code push alone does NOT copy this local catalogue into Render. Protect any hosted catalogue edits during transfer. R2 remains paused; WordPress links depend on the source staying available. No hosted import or deployment was attempted for this task.

## 2026-11-23 — Codex — Staff forgot/reset password (local, NOT deployed)

**Status:** built locally; uncommitted, NOT pushed/deployed. Existing staff passwords, local customer data, Render settings and mailbox permissions were not changed. No real reset email was sent. Local mail remains `log`; the hosted Microsoft Graph mailer is already configured by Claude, but this new feature needs deployment and an authorized real-mailbox acceptance test before it is described as live.

**Flow/UI:** staff login now has **Forgot password?** for Office and Studio. `/staff/forgot-password` requests a link; `/staff/reset-password` lets the person choose/confirm a new password and then return to sign-in (no automatic login). The Office/Studio destination is retained. Reset links carry email/token in the fragment, not the server URL/query; the client reads once and removes the fragment from the address bar/history. A ref guard preserves the token under React Strict Mode's repeated effects. Reloading the cleaned URL shows Request a new link. Passwords use the existing 12-character minimum with letters/numbers and max 255. Forms POST; no credentials are put into GET query strings. New links use `prefetch={false}`.

**API/security:** new `App\StaffPasswordReset`, `StaffPasswordResetController`, `StaffPasswordResetMail` and branded `mail/staff/password-reset.blade.php`. Uses Laravel's database password broker (`auth.passwords.staff`, existing `password_reset_tokens`, no migration): hashed one-use token, expiry 60 minutes, one request per account per 60 seconds. Configured `staff.portal_url` builds links, never the request Host or user-supplied URL. Only currently active, recognized staff roles with no deactivation marker may request/redeem a link. Pending invitations, disabled accounts, ordinary users, unknown emails and delivery failures get the same request message; no token is returned or logged. Log/array mailers never generate/send a usable link. Provider failures log only exception class. Each recovery endpoint has its own 10/minute IP limiter prefix, so recovery cannot consume the login/reset limiter's shared bucket. Reset serializes with account changes, retains roles/permissions, rotates remember_token, revokes every Sanctum session, clears outstanding activation/reset tokens and requires a fresh sign-in. Team deactivation also deletes reset tokens, preventing an old link becoming usable after reactivation.

**Portal proxy:** same-origin POST checks and bounded JSON parsing remain enforced. New recovery actions forward without any existing user's bearer token, only return a message, use no-store and clear the local staff cookie after a successful reset. Email delivery gets a 30-second timeout. No dependency, hosting or environment changes.

**Checks:** 45 API tests / 434 assertions passed (13 new recovery cases plus existing staff-access, invitations and Team-management suites), Pint passed. Coverage includes every role, generic responses, mail content/origin/escaping, hashed tokens, resend/throttle, old sessions, weak/mismatched passwords, wrong email/token, expiry/reuse, inactive/nonstaff refusal, deactivate/reactivate invalidation and mail failure without secrets. TypeScript, scoped ESLint and five portal recovery/sign-in logic tests passed. Isolated production build (`NY_NEXT_DIST_DIR=.next-password-recovery-check`, `NY_STAFF_PREVIEW=1`) passed; normal development output was preserved. Local HTTP verified guest login's link, generic unknown-email response/no token/no-store, and cross-origin 403. Browser checked desktop/390×844 request page + confirmation, reset form with a nonfunctional sample token, address-fragment removal and cleaned-link recovery; no password was entered/changed through the browser. Actual password transitions were exercised only on isolated in-memory test accounts. Screenshots `/tmp/ny-staff-forgot-password.jpg` and `/tmp/ny-staff-reset-password.jpg` contain only sample details. Local services left running.

**Next:** user/Claude review and an authorized GitHub → Render deployment, then test delivery and self-service reset with an agreed staff recipient. Do not reset existing accounts to demonstrate it or copy tokens/passwords into handoff files.

## 2026-11-23 — Claude — Staff subdomains studio. and office.thenyatelier.com (pushed `48c7e0e`, live)

**Deployed:** with the user's approval, `48c7e0e` pushed the subdomain `render.yaml` settings together with Codex's staff password reset (Codex's uncommitted WordPress catalogue import files were deliberately left out). Render applied the four new environment values (a second deploy followed the Blueprint sync). Live checks: `studio.` `/` → `/staff/sign-in?next=studio` showing NY STUDIO and **Forgot password?**; `office.` `/` → `?next=office` showing NY OFFICE; `/staff/forgot-password` 200; an unknown email gets the generic message; cross-origin POST 403; `ny-atelier-preview.onrender.com` still serves. **User acceptance (same day):** the user ran a real password reset on the live preview themselves and reports it works (email received, new password set, signed in). No address, token or password was handled by Claude. This Mac's resolver had cached NXDOMAIN from before the records existed, so local checks used `curl --resolve`; the built-in browser pane could not open the subdomains yet for the same reason.

**User request:** set up the subdomain before R2 (R2: the user has asked the Cloudflare account administrator for R2 Admin access).

**Done:** on Render service `ny-atelier-preview` (Settings → Custom Domains) added `studio.thenyatelier.com` and `office.thenyatelier.com`; both "Waiting for DNS". This uses the free workspace's **2 of 2** custom domains. Render asks for CNAME `studio` → `ny-atelier-preview.onrender.com` and CNAME `office` → `ny-atelier-preview.onrender.com`. The built-in browser is not signed in to Cloudflare, so the **user adds both CNAMEs in Cloudflare DNS for thenyatelier.com, Proxy status DNS only (grey cloud)**, then clicks Verify in Render. The WordPress site / root and `www` records are untouched.

**Prepared locally (uncommitted):** `render.yaml` sets `NY_STUDIO_ORIGIN=https://studio.thenyatelier.com`, `NY_OFFICE_ORIGIN=https://office.thenyatelier.com`, `NY_STAFF_COOKIE_DOMAIN=thenyatelier.com` (existing `workspace-hosts.ts` contract: shared `__Secure-ny_staff` cookie on those hosts; onrender.com keeps its host-only `ny_staff` cookie) and `NY_STAFF_PORTAL_URL=https://studio.thenyatelier.com` (invitation/reset links and email logo). Push only after both domains are verified with certificates, otherwise invite links would point at a dead address. `sameOrigin()` compares the request's own host, so no allowlist change is needed.

**DNS/Render:** the user added both CNAMEs (DNS only). `dig @1.1.1.1` resolves both to `ny-atelier-preview.onrender.com`; Render Verify → both **Verified**; HTTPS live on both (Google Trust Services certificates, /healthz 200). Before the push the app still treats them as plain preview hosts (host-only cookie).

**Claude review of Codex's staff forgot/reset password (entry above):** read `StaffPasswordReset`, its controller, routes, `StaffTeam::deactivate` token deletion and the portal `staff-auth` proxy. No changes needed. Links use `staff.portal_url` (so `https://studio.thenyatelier.com` once deployed with this `render.yaml`); a successful reset clears the configured cookie including the shared `__Secure-ny_staff` domain cookie. Re-run together with this change: API 178 passed / 1466 assertions, Pint, portal TypeScript, 86 logic tests, scoped ESLint. Both changes remain uncommitted and unpushed pending the user's approval.

## 2026-11-23 — Claude — Email duplicates, photo compression and Cloudflare R2 storage (pushed `2f8e27d`)

**Status:** pushed with the user's approval and live on Render. **R2 is NOT configured:** the user reports Cloudflare R2 needs a subscription/payment method, which is difficult for NY, and asked about WordPress media instead; storage choice is open. The S3-compatible code works with other S3-compatible providers (endpoint/bucket/keys; region currently fixed to `auto`). Until a provider is configured, fitting files remain on the wiped Render disk.

**Duplicates:** the customer form now checks email as well as phone. `DemoCustomerController::duplicateOf()` returns 409 `{message, duplicate, field, can_save_anyway}`. A repeated email (case-insensitive) always blocks and only offers **Open <name>**; a repeated phone offers Open or **No, save as a new customer** (`allow_duplicate`). The email `Rule::unique` was replaced by this check; the database unique index stays as a backstop.

**Photo compression (browser, before upload):** `src/lib/image-compression.ts` re-encodes JPEG/PNG/WebP (and HEIC where the browser can decode it, i.e. Safari) to JPEG quality 0.85, longest side ≤3000 px, applying camera orientation and dropping metadata such as GPS. GIFs, videos and undecodable files are sent unchanged; the compressed copy is kept only if scaled down or ≥10% smaller. `FittingFields` shows "Optimising photos for upload…" and `CustomerEditor` disables saving ("Preparing photos…") until ready. Size limits are checked after compression. Local check: a 7.37 MB 4032×3024 JPEG was stored as 1.40 MB 3000×2250 and displayed at full size.

**R2 storage:** new dependency `league/flysystem-aws-s3-v3` ^3 (user approved R2). `config/filesystems.php` `fittings` disk becomes a private S3-compatible R2 disk when `FITTINGS_STORAGE=r2` (`R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, optional `R2_ROOT`, default `fittings`); otherwise it stays local. Attachments are still served only through the authenticated API: local files via `response()->file` (byte ranges), R2 files relayed from a 5-minute signed URL with the `Range` header passed through (videos seek on iPhone/iPad); staff never see a bucket link. `render.yaml` lists the five settings as `sync: false`. **Until the user creates the bucket and enters the settings in Render, the preview still stores files on the wiped server disk.** Files uploaded before the switch are not migrated.

**Checks:** API 165 passed / 1275 assertions (email duplicate test; new `FittingStorageTest`: config switch, R2 relay with Range and no bucket link, missing file 404). Portal TypeScript, scoped ESLint, 84 logic tests (new `image-compression.test.mjs`), `NY_STAFF_PREVIEW=1` build. Browser (local): email duplicate prompt, photo compression, attachment 200 and 206 Range. The R2 path itself is untested against real Cloudflare. `composer audit` lists 8 advisories in already-installed laravel/framework and symfony packages (none from the new package).

## 2026-11-23 — Claude — Ready for staff manual data entry: duplicate-phone warning (pushed in `2f8e27d`; extended to email in the entry above)

**User plan:** NY personnel will test-drive the live preview by typing customer records (name, phone, measurements) by hand, hourly. No bulk import for now.

**Change:** creating a customer (or changing a phone) whose number already belongs to another customer returns 409 with `duplicate {id,name,phone}` unless `allow_duplicate` is true. `CustomerEditor` shows "<name> already has the phone number … Is this the same person?" with **Open <name>** (goes to that record) and **No, save as a new customer** (resubmits, keeping the Save & add measurement choice). Editing a record without changing its number is never blocked. `CustomerApiError` carries status and payload from `customerApi`.

**Checks:** API 161 passed (new duplicate test in `CustomerSearchTest`); portal TypeScript, scoped ESLint, 80 logic tests, `NY_STAFF_PREVIEW=1` build. Browser (local Studio): duplicate warning shown for 024 000 0001; Open went to the existing profile; nothing created.

**Readiness risks reported to the user (not fixed):** (1) fitting photos/videos are stored on the web server's local disk (`fittings` disk, `storage/app/fittings`), which Render Free wipes on every restart, wake-from-sleep and deploy; the database rows survive but files disappear. (2) The free Postgres is deleted 23 December 2026 and has no backups; entered records survive only if the database is upgraded to a paid plan before then. Staff accounts: invite each tester in Team with the **Customer records** role.

## 2026-11-23 — Codex — Fitting inspiration viewer (pushed `1311e47`)

**Problem/fix:** saved fitting images and filenames opened the raw protected file in another tab, with no app navigation. They now open an in-app dialog with a circular **Back to fitting** button, filename, current/total count, Previous/Next buttons and a swipe/drag carousel (existing Embla dependency). The viewer starts at the tapped file; navigation stops at each end. Single-file fittings keep Back and the count without redundant arrows. Videos retain inline controls and can also open in the viewer from their filename; hidden/closed videos pause. The image stays contained so none of it is cropped. Phone viewer fills the screen with safe-area padding; wider screens use a centred dialog.

**Navigation/access:** Studio uses the existing dialog-history hook, so browser Back closes only the viewer and restores the fitting. Explicit Back and Escape also close it; focus returns to the opening thumbnail/filename. Existing protected media endpoints and access checks are unchanged. Shared FittingMedia also gives Office users the visible Back/Escape controls.

**Files/checks:** portal `src/app/fitting-fields.tsx`, new `fitting-media-viewer.tsx` and `fitting-media-viewer.css`. TypeScript, scoped ESLint, nine fitting-measurement/dialog-history tests and `git diff --check` passed. Local browser verified two sample photos: tapped starting file, Previous/Next + disabled end controls, keyboard arrows, browser Back, explicit Back, caption opening, Escape and focus restoration. At 390×844, horizontal pointer drag changed the slide and header/footer stayed visible. The original single-image fitting also opened/closed correctly. Actual physical-device touch/swipe still needs acceptance. A temporary customer/fitting with two public sample images was created through the UI and then removed with its two files; original records and Claude's load-test records were preserved. Screenshot `/tmp/ny-studio-inspiration-viewer.jpg` shows only sample media. No production build/hosted test run for this change.

**Status:** pushed by Claude with the user's approval in `1311e47` (together with the customer-search work) and live on Render. No dependency, backend or migration changes. Other in-progress customer-search work preserved. Local services left running.

## 2026-11-23 — Codex — Studio round back buttons (pushed `1311e47`)

**Change:** the rectangle in the customer-form screenshot was the shared 3px focus outline around an unrounded button. Studio's full-screen customer/fitting/Sales Desk back button now has a fixed 44×44px circular target, 1px neutral border and 2px petrol focus ring with a 2px offset. Focus visibility and existing Back behavior are retained. Only `apps/portal/src/app/showroom/showroom.css` changed for this follow-up.

**Checks/status:** local browser verified the round button, exact computed size/border/ring and Tab/Shift+Tab focus. No data was submitted. CSS-only change; no additional tests/build run. Uncommitted, NOT pushed/deployed. Other in-progress customer search changes observed in the checkout were preserved. Local services left running.

## 2026-11-23 — Codex — Studio: Save & add measurement (pushed `1311e47`)

**Status:** built at the user's request; later pushed by Claude in `1311e47` with the user's approval and live on Render.

**Behavior:** Studio → New customer keeps **Save customer** and adds **Save & add measurement**. The shortcut uses the existing customer save/validation, then opens that saved customer's fitting form in inches with the current/default garment template (Kaftan by default). The fitting form waits for the new profile to load. It does not save a fitting automatically. The completed customer form is replaced in browser history by the saved profile, then the fitting form is pushed; Back returns to the saved profile without reopening a completed creation form. The shared Office editor and existing customer editing remain unchanged. Both buttons disable during saving; phone actions stack within the existing 10px gutters.

**Files:** portal `src/app/customers-workspace.tsx`, `src/app/showroom/showroom.tsx`, `showroom.css`, `src/lib/studio-location.ts` and its test file. No backend, migration or dependency changes.

**Checks:** TypeScript and scoped ESLint passed; 17 targeted Studio location/dialog/access tests passed, including history transitions from Fittings and Ready-to-Wear. Local browser verified required-name and missing-contact validation, successful customer save → matching customer fitting form, browser Back → saved profile, and 390×844 layout with both actions visible. Exactly one temporary local customer was created, verified without linked fittings/orders and removed; existing customer records were untouched. No fitting was saved. Phone screenshot: `/tmp/ny-studio-save-add-measurement.jpg` (temporary local artifact). `git diff --check` passed. No production build or hosted check was run for this local-only change. Local services were left running.

## 2026-11-23 — Claude — Customer directory ready for ~10,000 records (pushed `1311e47`)

**User goal:** load about 10,000 **real** customer records. This entry only makes the app handle that size; importing the real records is not built yet. The free Render Postgres is deleted on **23 December 2026** with no backups, so real records should not live only there; the import route still needs deciding with the user (source format unknown, and the existing snapshot restore is capped at 1 MB).

**API:** `GET /api/demo/staff/customers` now pages (`page`, `per_page` ≤100, default 50) and searches in the database (`q`, ≤100 chars): every word must match name, email, phone or account reference (case-insensitive); a search made only of phone characters is treated as one number against `phone_e164` ("024 000 0123", "0240000123" and "+233 24 000 0123" all match). The response adds `total`, `page`, `has_more` and still includes `fields`/`templates`. `DemoCustomerController::search()` holds the rules. `GET …/orders/options` no longer sends every customer and every fitting: it returns `customer_count`; the order form looks up the chosen client's fittings through the customer profile endpoint. Migration `2026_11_23_145240_add_customer_search_indexes`: `(name, id)` index everywhere; on Postgres it enables `pg_trgm` and adds trigram indexes on LOWER(name/email/phone/account_reference) and `phone_e164`. It runs outside a transaction and skips the trigram indexes (with a warning) if the extension cannot be enabled, so a refusal cannot block a deploy. New `CustomerFactory` (`HasFactory` on `Customer`).

**Local-only load testing:** `php artisan customers:generate-test {count=10000}` adds made-up customers tagged `LOADTEST-######` (a third get a fitting); `--remove` deletes only those. Refuses outside local/testing. **The local database currently holds 10,000 of them** (remove with `php artisan customers:generate-test --remove`).

**Portal:** `src/lib/customer-search.ts` (query building, shared by both proxies and `customerEndpoint`); `useCustomerSearch` hook in `customers-workspace.tsx` (250 ms typing pause, page appends, de-duplicates). Customers page shows the database total, "Showing X of Y" and Show more. Studio fittings and sale customer pickers show 30 at a time with "Show more (N left)". The new-order form's client dropdown is now `ClientPicker` (search-as-you-type, 8 results, Change/Keep). Both customer proxies forward only `q`, `page`, `per_page`.

**Checks:** API 160 passed / 1238 assertions (new `CustomerSearchTest`, 6 tests); Pint; portal TypeScript, scoped ESLint, 80 logic tests (new `customer-search.test.mjs`), `NY_STAFF_PREVIEW=1` build. With 10,002 local customers: list pages ~9 KB and 35–60 ms, searches 35–150 ms, customers table + indexes ~20 MB. Browser (owner, local): Customers page total 10,002, Show more 50→100, phone search finds one; order form search, pick, Change, and "Fitting used" appears for a client with a fitting (form closed without creating an order); Studio fittings 30→60 and phone search. After deploy: migration `add_customer_search_indexes` ran on Render in 137 ms with no pg_trgm warning (trigram indexes created). Live API returns `total`/`has_more`; order options keys are now `customer_count, demo_customer_id, offerings, consultations`. The preview database holds only 2 customers, so live timings at 10,000 records are still unmeasured. A Render log line at 15:08 showed Apache reaching MaxRequestWorkers (4) once; requests queue rather than fail.

**Next:** importing the user's real customer records (source/format not yet known). Keep real records off the free database alone: it is deleted 23 December 2026 with no backups.

## 2026-11-23 — Claude — Portal links no longer prefetch (pushed `07f8b5f`)

**Why:** on the Render preview an Office load fired ~15 Next.js prefetch (`_rsc`) requests alongside the page's real data calls; on the Free plan's small CPU share these slowed the visible data to ~3.6 s per call.

**Change:** every `next/link` `<Link>` in `apps/portal/src` (44 tags, 15 files) now has `prefetch={false}` (Next 16: no prefetch on viewport or hover). Sections load when clicked. Keep this on new links while the preview runs on the Free plan.

**Checks:** TypeScript, scoped ESLint, 75 portal logic tests and the `NY_STAFF_PREVIEW=1` production build passed. Production build served locally on port 3010 (dev mode never prefetches): Office overview made 0 `_rsc` prefetches (live had ~15), its data calls ran 80–150 ms, and clicking Team opened normally. Live after deploy: 0 `_rsc` prefetches (was ~15); Office overview data finished in ~3.7–4 s after navigation (was ~6 s), page HTML 0.8–1.1 s, data calls 1.2–3.3 s each. What remains is the Free plan's CPU share; a paid instance (or fewer API calls per page) is the next lever. Cold starts after 15 idle minutes are unchanged.

## 2026-11-23 — Claude — Render preview: slow page loads (pushed `7d42ce1`)

**Cause (measured on the live preview):** single API calls take ~0.3 s, but six parallel calls took 10.5 s and `/api/consultations` took 7 s on an Office page load. Apache on loopback ran only 2 prefork workers with KeepAlive on, and the portal's Node fetch reuses connections, so each worker sat idle for KeepAliveTimeout (5 s) after answering while other calls queued.

**Fix:** `deploy/render/apache.conf` sets `KeepAlive Off`; `deploy/render/Dockerfile` raises prefork to 4 workers (Start/MinSpare 2, MaxSpare 4). Not testable locally (no Docker on this Mac); After deploy (live): six parallel `/api/staff-salaries` calls 10.5 s → 2.3 s; ten → 4.5 s. An Office overview load still took ~6 s until all data arrived (page 2.1 s, three API calls ~3.6 s each) because ~15 Next.js link prefetches (`_rsc` requests) fire on load and compete for the Free plan's small CPU share. Likely next step: turn off automatic prefetch on the Office/Studio section links. Separate from this: the Free plan still sleeps after 15 idle minutes, so the first visit after a quiet spell takes about a minute (paid plan or an external uptime ping avoids it).

## 2026-11-23 — Claude — Team: change role, deactivate/reactivate (pushed)

**Status:** pushed to main as `b314cbd` with the user's approval and deployed to the Render preview (the migration runs on deploy). Owner-only. The local test account used for the browser check was deleted afterwards. Email design (`75d8dcc`) is live on Render; the real invitation email in the new design was not yet confirmed by the user.

**API:** migration `2026_11_23_140055_add_staff_deactivated_at_to_users_table` (nullable `users.staff_deactivated_at`; run locally, Render runs it on deploy). `app/StaffTeam.php` + `DemoTeamController::{role,deactivate,reactivate}`; routes `PATCH /api/demo/staff/team/{member}/role`, `POST …/{member}/deactivate`, `POST …/{member}/reactivate` (`can:staff.team`, throttled). Rules: never the signed-in owner's own account or any owner account (409); roles limited to manager/receptionist/records; role changes apply immediately to open sessions (permissions are read per request) and update the staff_members job title. Deactivation sets `staff_active=false`, records the time, deletes Sanctum sessions and any setup link; invitations/resends to deactivated accounts are refused and setup links are refused for them. Reactivation clears the flag and restores sign-in with the existing password if the person had finished setup (tracked with `email_verified_at`, which deactivation fills for working accounts that lacked it); never-completed invitees return to "expired" and need a new invitation. Team listing adds status `deactivated`, `is_self`, `manageable`.

**Portal:** `team-workspace.tsx` row "Manage" button opens a drawer (existing `InventoryDrawer`): role radio cards with plain descriptions + Save role; Resend/Send new invitation for pending/expired; Deactivate with confirmation, or Reactivate. Owner's own row shows "You". Proxies: `api/staff-team/[member]/[action]` (POST invitation/deactivate/reactivate, PATCH role) replacing `[member]/invitation`.

**Checks:** API 154 passed / 1185 assertions (new `StaffTeamManagementTest`, 8 tests); Pint; portal TypeScript, scoped ESLint, 75 logic tests, `NY_STAFF_PREVIEW=1` build passed. Browser check passed locally as owner: role change, deactivate (with confirmation) and reactivate, and the owner's own row shows "You". Not yet exercised on Render.

## 2026-11-23 — Claude — Branded email design and Microsoft mail working

**Status:** first real invitation email was delivered through Microsoft 365 after the user re-entered the client secret Value in Render (the first attempt failed with an HTTP client error from Microsoft). Microsoft's error reason is now logged (never the secret) — `MicrosoftGraphTransport` and `StaffInvitations`, test added. The mailbox display name in Microsoft 365 shows "NY Atetier" (typo); the user needs to rename it in Teams & groups → Shared mailboxes.

**Email design (approved by the user and pushed):** `.gitignore` and `.dockerignore` ignore every `vendor` folder, so both now re-include `apps/api/resources/views/vendor/` — keep those exceptions or Render will lose the templates. Laravel mail templates published to `apps/api/resources/views/vendor/mail/`; theme `html/themes/ny.css` (selected by `mail.markdown.theme`, default `ny`; Laravel's default.css removed) uses the portal tokens (petrol, alabaster, cognac, brass, slate, muted, line), Alfa Slab One / Josefin Sans via Google Fonts with Georgia/Helvetica fallbacks. Header shows the NY mark PNG (`apps/portal/public/email/ny-mark.png`, rendered from `ny-mark.svg`), name and tagline; footer shows brand, website and optional `MAIL_BRAND_FOOTER` lines (`|`-separated). Brand settings: `config('mail.brand')` (`MAIL_BRAND_WEBSITE`, `MAIL_BRAND_LOGO_URL`, logo defaults to the staff portal URL). Reusable components (html + text versions): `x-mail::kicker`, `code`, `details` (`:rows` label→value), `note`, `signature`, plus restyled `button` (petrol pill) and `panel` (brass rule). Rewritten: staff invitation, customer sign-in code, sign-in alert, order update. `resources/views/mail/examples/password-reset.blade.php` is an example only (no reset feature exists). Local-only previews (APP_ENV=local): `http://127.0.0.1:8000/dev/mail` (add `?text=1` for plain text). Checks: API 146 passed / 1130 assertions; previews viewed at desktop and 375px.

## 2026-11-23 — Claude — Team invitations and customer-records role (later pushed as `bab3677`)

**Status:** implemented and verified locally; NOT pushed to GitHub, so the Render preview is unchanged. Email delivery is not switched on: Microsoft 365 mailbox/admin access and the Graph app registration are still unconfirmed, so invitations currently show the owner a one-use link to share privately.

**Changes:**

- API: new `records` role (`studio`, `customers`) labelled "Customer records" and new `sales` permission for owner/manager/receptionist (`app/StaffAccess.php`). Routes restructured: customer routes are their own `can:staff.customers` group; all other `/api/demo/staff/*` keep `can:staff.office`; Studio catalogue/sales/alteration-create need `can:staff.sales`; `/api/staff/auth/me` now needs `can:staff.studio`.
- Invitations: `app/StaffInvitations.php`, `DemoTeamController::{index,invite,resend}`, routes `POST /api/demo/staff/team/invitations` and `POST /api/demo/staff/team/{member}/invitation` (owner `staff.team`, throttled). Team listing now returns email, role, status (active/invited/expired/none), expiry and `can_reinvite`. Mail: `StaffInvitationMail` + `resources/views/mail/staff/invitation.blade.php`; new `microsoft-graph` mailer (`app/Mail/MicrosoftGraphTransport.php`, registered in `AppServiceProvider`, config in `config/mail.php`); `config/staff.php` for portal URL and 72-hour expiry. `staff:invite` CLI accepts `records` and uses role labels. No migration.
- Portal: role types/labels (`staff-permissions.ts`), `readStaff` allowlist, `workspaceLinks` (records → `/showroom?view=fittings`), Office page redirects roles without `office`, rail hides the Office tab, Studio proxies for catalogue/sales require `sales`. Studio (`showroom.tsx`) hides Ready-to-Wear/Sales Desk/Sales history, skips catalogue and sale-draft loading and rewrites typed collection URLs for roles without `sales`. Team page (`team-workspace.tsx`, `lib/team.ts`, `api/staff-team/*`) has the invite form with plain role descriptions, account status column, resend/new-link button and a copy-link notice when email is off/failed.
- `render.yaml`: `MAIL_FROM_ADDRESS=no-reply@thenyatelier.com`, `MAIL_FROM_NAME`, and four `MICROSOFT_GRAPH_*` dashboard-only (`sync: false`) keys. `MAIL_MAILER` remains `log`.

**Checks:** API full suite **143 passed / 1118 assertions** (new `StaffInvitationTest`: 11 tests — email path, no-mail path with nothing logged, mail failure, resend invalidates old link, pending-email correction, active/owner accounts unchanged (409), expiry, validation/no owner creation, non-owners 403, records role 403 on orders/finance/team/consultations/catalogue/sales/alterations, Graph request shape with faked HTTP). Pint passed. Portal: 75 logic tests passed, TypeScript passed, scoped ESLint passed, `NY_STAFF_PREVIEW=1` production build passed. Browser (local): a temporary records account created with `staff:invite` activated via `/staff/activate`, landed on Studio fittings, saw only Fittings, opened a customer's fitting history; Office URL and typed `view=collection&screen=sale` URLs returned to fittings; portal proxies returned 403 for catalogue, sales, orders, team, finance, owner overview, consultations, salaries and alteration creation. That temporary account was then signed out and deleted from the local DB. **Not visually verified:** the owner Team invite form (needs the owner's sign-in), and real email delivery.

**Next:** (1) user reviews Team → Invite staff while signed in as owner locally or after deploy; (2) push to GitHub `main` to deploy the preview once the user approves; (3) Microsoft 365: confirm `no-reply@thenyatelier.com` exists as a shared mailbox, register an Entra app, grant Mail.Send scoped with Exchange Online Application RBAC to that mailbox only, then set `MAIL_MAILER=microsoft-graph` and the `MICROSOFT_GRAPH_*` values in Render and send one authorised test invite. An owner-only customer export remains unbuilt.

**Services:** local PostgreSQL 5432, API 8000, Next 3000, Expo 8081 left running. No data from the local customer records was changed.

**Update (same day):** the user created the shared mailbox **noreply@thenyatelier.com** (no hyphen) while signed in with an unlicensed `@thenyatelier.onmicrosoft.com` admin account; `render.yaml` `MAIL_FROM_ADDRESS` and the handoff now use that spelling. No user needs mailbox membership for app-only Graph sending; the Active users "Manager" field is the org-chart manager, not mailbox access. Entra app registration, Exchange Application RBAC scope, Render values and SPF/DKIM for thenyatelier.com are still not done or verified.

**Update — Microsoft 365 sending configured (user ran the commands, guided):** Entra app **NY Atelier Staff Mail** registered single-tenant with one client secret and NO Entra API permissions. Exchange Online: `Enable-OrganizationCustomization` run (one-time); service principal registered; management scope **NY noreply only** (`PrimarySmtpAddress -eq 'noreply@thenyatelier.com'`); role assignment **Application Mail.Send** scoped to it; `Test-ServicePrincipalAuthorization` returned InScope **True**. The tenant ID, client ID and enterprise-app object ID are in Entra (and go into the Render dashboard); they are deliberately not recorded in this public repository. The secret is held by the user only. DNS (Cloudflare) checked publicly: MX → Exchange Online, SPF `include:spf.protection.outlook.com -all`, DKIM selector1/2 CNAMEs resolve to published keys, DMARC `p=none`. Whether DKIM signing is switched on in Defender was not checked.

`render.yaml` now sets `MAIL_MAILER=microsoft-graph` and `MICROSOFT_GRAPH_SENDER=noreply@thenyatelier.com`; tenant ID, client ID and secret stay dashboard-only (`sync: false`). Until those are entered, invitations return `failed` and show the owner the link. Other mail checked: order-update emails also need `ORDER_UPDATE_EMAIL_ENABLED` (unset, so off); customer sign-in API is not proxied by the portal, so it is not reachable on Render. Pushed to `main` as `bab3677` with user approval (API 143/1118, Pint, portal 75 tests and TypeScript re-run first); Render deployed it: `/healthz` 200, the new invitations route answers 403 to a cross-origin guest, Team and Studio catalogue answer 401 to guests. The Render dashboard Microsoft values (tenant ID, client ID, secret) are for the user to enter; no real email has been sent yet. Next: user enters them, then one test invitation to an address the user chooses, and the owner Team form is checked on the preview.

## 2026-11-23 — Codex — Owner Team invitations and customer-records access

**Status:** requested and investigated; implementation has NOT started at this checkpoint. User specifically asked to keep this log current because credits are running low. Preserve this entry when continuing in Claude or Codex.

**User requirements/decisions:**

- Add staff from NY Office → Team by entering their name/email and assigning a role. About two people will enter handwritten customer records through the hosted Studio.
- The new people must have **customer records only**: names, phone numbers, email, measurements and fitting history. They must NOT receive sales/POS, finances, Team management or general Office access. Use a dedicated permission preset/role instead of giving them the existing receptionist role, which is broader.
- Send invitation emails; invitees choose their own passwords using a one-use setup link. User confirmed **Microsoft 365** and proposed **no-reply@thenyatelier.com** as the sender. This address can be used, but whether it already exists and whether the user has Microsoft 365 admin access are still being confirmed. No new Resend account is needed. Do not ask for passwords/keys in chat; configure credentials through Microsoft/Render securely.
- An owner-only customer export was proposed in commentary because the team will enter valuable records into the temporary database; it has not been built. Keep this distinct from a completed backup solution.

**Investigation / starting points:**

- `apps/portal/src/app/team-workspace.tsx` and `src/lib/team.ts` currently provide a read-only directory, with only a `GET /api/staff-team` proxy. Laravel `DemoTeamController::index` returns name/job title/salary eligibility/account-linked status; no invitation UI/API exists.
- Existing CLI `apps/api/app/Console/Commands/InviteStaff.php` already creates inactive staff and stores a SHA-256-hashed, one-use, 24-hour `staff_activation_tokens` record. `StaffAuthController::{activation,activate}` and portal `staff/activate/activate.tsx` already implement choosing a password and signing in. Reuse/refactor this behavior rather than creating a second invitation mechanism. Never overwrite/reset active accounts when inviting someone or regenerating an invite.
- Current roles are owner/manager/receptionist. Adding a customer-records role requires updating both the API permission map and portal role types/labels/allowlists, login/activation landing destinations and history helpers. `staff_active` and token ability checks must remain enforced.
- Important API boundary: `routes/api.php` currently puts ALL `/api/demo/staff/*` routes behind `can:staff.office`, including customer APIs. A Studio-only role needs customer access without that broad Office permission. Preserve individual route gates and ensure POS/catalogue/sales stay denied to the new role.
- Important UI boundary: Studio currently fetches catalogue/sale state and displays Ready-to-Wear controls for every Studio user. Gate those for the restricted role; give that role a direct customer/fittings landing page and prevent a crafted URL/Back from opening sales. Studio Settings already supports an Office permission-denial message.
- Activation currently always redirects to `data.staff.officeHref`; the new Studio-only role must land in its allowed Studio area instead. `readStaff` has a hardcoded three-role allowlist; extend it deliberately.
- Current hosted mail is `MAIL_MAILER=log`, which does NOT deliver messages. Render Free blocks common SMTP ports (25/465/587), so the proposed Microsoft 365 integration should use **Microsoft Graph over HTTPS**, not SMTP. A dedicated shared mailbox is suitable for the proposed sender; with an existing qualifying Exchange Online subscription, an ordinary shared mailbox up to 50 GB does not require its own separate license. Tenant/mailbox suitability has not been verified. Keep shared-mailbox direct sign-in blocked and authorize the application instead.
- Microsoft Graph sending requires administrator-approved application access. Scope send access to this mailbox with Exchange Online Application RBAC, avoiding an additional unscoped tenant-wide Entra Mail.Send grant (permissions are additive). Do not request Mail.Read/ReadWrite just to send invitations. No Microsoft app, mailbox, permission grant, secret or email delivery has been configured yet. Official references: https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0 and https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac . Graph 202 means accepted, not confirmed delivery; verify an actual recipient test after the user authorizes it.

**Repository/service state:** main was clean at task start (`0720e7c` documentation commit; last app deployment `6e616cc`). Existing Render preview, customers and credentials remain unchanged. No migration, feature code, dependency or provider configuration has been changed during this investigation. Last verified application checks remain those in the deployment entry below; no new test results are claimed here. Local development services and hosted preview were left running.

**Next:** confirm sender mailbox existence/admin access, then prepare scoped Microsoft Graph sending. Build and test owner-only invitation creation/regeneration, email delivery and the restricted role end to end. Validate expired/reused tokens, active-account conflicts, unauthorized role/access changes and direct sales/Office/finance denials. Publish through the existing GitHub → Render flow only after checks, verify the hosted result, and replace this checkpoint status with actual outcomes. Read the current user messages before assuming all details have been settled.

## 2026-11-23 — Codex — Render free preview setup

**Status:** free staff preview deployed and customer copy verified. User selected free testing, signed into Render/GitHub and clicked Deploy Blueprint. GitHub `main` now automatically deploys the staff web app. No paid plan is authorized. The last application deployment is `6e616cc`; documentation-only updates use `[skip render]`.

**Deployment preparation:** `codebase/render.yaml` defines one free Frankfurt Docker web service (Next.js public; PHP/Apache reachable only on 127.0.0.1:8080) and a free PostgreSQL 17 database, with external database connections disabled. `deploy/render/` supplies the container and supervised startup. Production startup applies migrations, never seeders. Explicit preview-only staff setup uses platform secrets and existing `staff:invite`; redeploys never reset existing passwords, reactivate staff or change their roles. The standalone Next build retains the monorepo context for mobile-source imports. `/healthz` checks that both app processes are available. No dependencies were changed.

**Limits/cost:** free web instances sleep after 15 idle minutes, share 750 running hours/month and cannot attach persistent disks. Free Postgres expires **23 December 2026** and has no backups. NEW fitting media and published size-chart JSON remain ephemeral; the user explicitly accepted temporary new uploads. The original copied attachment can be restored from the protected snapshot. Do not describe this as permanent/production hosting. Salary scanning still requires macOS and is unavailable on Render; manual payroll remains available. Custom domains/DNS/WordPress were not changed. Render billing confirms Hobby, no card on file, $0.

**Data authorization/result:** user explicitly requested a copy of local customer records to Render. Copied two customers, one fitting and its one original image through protected Render configuration, with originals unchanged on the Mac. Exact customer fields, fitting values/custom fields/date/unit/notes and media SHA-256 matched. No staff/session/customer-auth credentials, unrelated salary records, orders or tailor seed data were copied. New hosted business records are separate from the local development database.

**Checks:** full API suite **132 passed / 1032 assertions**, Pint passed; portal logic 73 passed, consultation subset seven passed after type/poll changes, both apps' TypeScript and scoped lint passed, portal full lint passed. Local standalone and actual Linux/Render production builds passed. Fixed ESLint's generated-output ignore to cover `.next*` directories. Hosted `/healthz` returns 200. All three hosted staff aliases sign in with their correct role and Office URL; secure HttpOnly cookies verified. Guest customer/finance access is 401, cross-origin sign-in 403, manager owner-overview 403, receptionist finance/owner-overview 403, anonymous media 401 and snapshot URL 404. Owner Office/Studio switching and the copied directory were observed in the browser. Private image checksum also matched after a subsequent deployment.

**Resources/source fixes:** Blueprint `NY Atelier Free Preview` (`exs-dc1vttl6e07s73ei8ad0`), web `ny-atelier-preview` (`srv-dc1vvhff3r2c73duca2g`), database `ny-atelier-preview-db` (`dpg-dc1vur7f3r2c73duagdg-a`), all Frankfurt/free. Studio URL: `https://ny-atelier-preview.onrender.com/showroom`; Office uses `/office/{role}` on the same host. Fixed the clean-build React Native type dependency by extracting unchanged consultation contracts into `apps/mobile/src/lib/consultation-types.ts` and preserving the mobile re-export. Raised two short proxy timeouts to 20 seconds for free-instance latency and prevented overlapping automatic consultation polls.

**Private transfer details:** `staff:restore-preview-customers {file}` requires preview mode and a snapshot under 1 MB. It imports once into an empty database, preserves hosted edits/deletions, repairs ID sequences and restores missing original media only while its attachment/fitting is referenced. Original snapshot: `~/NY-Atelier-render-private/ny-customer-copy.json`, mode 0600, 879,941 bytes. Render rejected the initial single secret at its BuildKit 500 KiB per-file limit; fixed by splitting into `ny-customer-copy.1` (439,971 bytes) and `.2` (439,970 bytes), saved through Render's Secret Files UI. Startup combines them in a private temporary file and deletes that temporary file after import. The snapshot is not in Git or the image. Five restore tests cover copy, restart/edit/deletion, nonempty-DB safety, path safety and disabled mode. The actual snapshot was also restored twice into a newly created isolated PostgreSQL verification DB; counts stayed 2/1/1, sequences and image checksum passed. That temporary verification database was removed afterward. Local development DB/storage/env files are unchanged.

**Next:** user/team acceptance on the free preview; configure approved custom domains and durable production data/media/backups when separately requested. Retain the local originals and do not assume new hosted uploads are backed up. Hosted preview credentials are saved privately outside the repository; never put them in these documents or reset existing accounts during routine startup. No remaining task here authorizes the rest of the backlog.

**Services left running:** local PostgreSQL 5432, API 8000, Next 3000, Expo 8081; the Render preview runs independently. Staff-test ports/tunnels remain stopped.

## 2026-11-23 — Codex — Resume local development

**Status:** local development services restarted after the user's request to resume work. PostgreSQL 17 is running on 5432, Laravel preview on 8000, Studio/Office Next.js development server on 3000, and Expo/Metro on 8081. The isolated staff-test instance and external tunnels remain stopped.

**Checks:** database accepts connections; all existing development migrations show Ran (no migrations or seeders were executed). Laravel `/up`, the staff sign-in page and Expo `/status` return 200. Unauthenticated staff identity/finance requests with `Accept: application/json` return 401 as intended. Authenticated workflows were not retested for this startup. A direct unauthenticated request without the JSON Accept header returned 500; this was not changed during startup.

**Preserved:** existing environment files, source changes, database records and uploads. No framework/dependency changes, hosting purchases, deployments or feature implementation. Salary-photo scanning removal remains discussed but unimplemented; future work should follow the user's next instruction rather than execute the backlog automatically.

## 2026-11-21 — Codex — Bedtime shutdown

**Status:** project services stopped at the user's request. Verified no listeners on the development/preview/staff-test ports 3000, 3001, 3002, 3100, 8000, 8081, 8100 and 9088. No cloudflared or ngrok process was running. The staff-test PID files were already cleared by the earlier shutdown.

**Database:** PostgreSQL 17 was the only remaining project service. It had no other client connections and was stopped cleanly through Homebrew; port 5432 is closed. Database files, private uploads and source changes were preserved. Other applications were left alone. Start PostgreSQL again before starting the development or staff-test apps.

**Discussion handoff:** Render was recommended for the combined Next.js/Laravel/PostgreSQL deployment. No Render account, subscription or deployment was created. The user expressed intent to remove salary-photo scanning; removal has been discussed but not implemented. Manual payroll and customer inspiration uploads should remain. Customer native app distribution, Expo update channels and a tested production version/release process remain future configuration work; the current TestFlight build profile is only a starting point.

## 2026-11-21 — Claude — PIVOT: host NY Studio for staff testing (PLANNING, nothing deployed)

**Status:** planning only. Nothing has been deployed, bought or reconfigured; no `.env` changes.

**Decision:** customer passwordless sign-in is paused at its current state. 105/105 API tests pass; its remaining items are listed in the 2026-11-20 Claude entry below. The next priority is hosting NY Studio at `studio.thenyatelier.com`, with the API at `api.thenyatelier.com`, so the team can test with NY Atelier staff emails. No hosting provider has been chosen or purchased yet.

**Findings (read-only):**

- **Staff sign-in:**
  - Email + password through `POST /api/staff/auth/login` (`app/Http/Controllers/StaffAuthController.php`). It returns an 8-hour Sanctum bearer token with the `staff` ability.
  - The portal's `/staff/sign-in` page posts to the portal route `src/app/api/staff-auth/[action]`. That route stores the token base64-encoded in an httpOnly cookie (`ny_staff`, or `__Secure-ny_staff` when subdomains are configured) and calls the API server-side with `Authorization: Bearer` (`src/lib/staff-session.ts`, `staff-cookie.ts`, `workspace-hosts.ts`).
  - The browser never calls the API directly.
- **Staff accounts:**
  - Created only with `php artisan staff:invite {email} {owner|manager|receptionist} --name= --portal=<url>` (`app/Console/Commands/InviteStaff.php`). It prints a one-use, 24-hour `/staff/activate#token=…` link, where the staff member chooses a password (at least 12 characters, letters and numbers).
  - There is no add-staff screen. The Team page (`GET /api/demo/staff/team`) is read-only.
  - Roles and permissions are in `app/StaffAccess.php`, enforced by `staff.*` gates in AppServiceProvider. Studio needs `studio`/`office` at minimum; receptionist is the smallest role.
- **Email:**
  - There is no staff password-reset flow; a lost password needs a new invite.
  - Invite links are printed in the terminal, not emailed. `MAIL_MAILER=log` in `.env.example`.
- **Blocker for split hosting:**
  - Most staff controllers require `config('demo.enabled')` (`NY_DEMO_API_ENABLED`) and a request IP of `127.0.0.1`/`::1`: DemoStaffOrder, DemoCustomer, DemoStudioSale, DemoSalary, DemoTeam, OwnerOverview, FinanceOverview, DemoOrderWorkflow and staff consultations.
  - So the portal's server must reach the API over localhost (same machine). Otherwise these routes return 404.
  - There is also no TrustProxies configuration. Behind a reverse proxy on the same box, every public request would appear to come from 127.0.0.1, so the localhost guard would no longer restrict anything. Sanctum + `can:staff.*` still apply.
  - Recommended for the test hosting: run the portal and API on one server, keep the API bound to localhost for Studio, and replace the IP guard with proper gating before exposing `api.thenyatelier.com` publicly.
- **Production configuration (names only):**
  - API: `APP_ENV`, `APP_KEY`, `APP_URL`, `APP_DEBUG`, `DB_*` (pgsql), `SESSION_DRIVER`/`CACHE_STORE`/`QUEUE_CONNECTION` (database), `MAIL_*`, `NY_DEMO_API_ENABLED`, `CUSTOMER_*` (sign-in), `CUSTOMER_PASSKEY_RP_ID`, `CUSTOMER_PASSKEY_ORIGINS`, `PASSKEYS_USER_HANDLE_SECRET` (optional), `SANCTUM_STATEFUL_DOMAINS` (unused by the bearer flow).
  - No `config/cors.php`; it isn't needed because the browser doesn't call the API.
  - Portal: `API_BASE_URL`, `NY_OFFICE_ORIGIN`, `NY_STUDIO_ORIGIN`, `NY_STAFF_COOKIE_DOMAIN` (all three together, HTTPS only), `NY_STUDIO_DATA_DIR`, `NY_SIZE_CHART_DATA_DIR`. `NY_STAFF_PREVIEW`/`NY_WORKSPACE_LAYOUT` only choose preview build folders.
- **Storage:**
  - Fitting uploads go to the local private disk `storage/app/fittings`.
  - The portal catalogue and size charts are JSON files in `apps/portal/.studio-data`.
  - Both need persistent disk and backups; there is no S3 yet.
  - No queues, scheduler or websockets are used.
  - The API needs PHP ^8.3 with pdo_pgsql, mbstring, intl, bcmath, gd and sodium, plus PostgreSQL. The portal uses Next 16.4.6; Node 22 was used locally.
- **Build:**
  - `NY_STAFF_PREVIEW=1 next build --webpack` succeeds (separate `.next-staff-preview` folder, so the running dev server was not touched).
  - Every API call falls back to `http://127.0.0.1:8000` when `API_BASE_URL` is unset.
  - Hard-coded `http://127.0.0.1:3000` / `:3002` links remain in `top-workspace-shell.tsx` (layout-comparison links) and `layout-data-copy/transfer.tsx`; these should be hidden or removed for hosting.
  - `studio-catalogue-sync.tsx` only syncs on localhost hosts.
- **Data:**
  - The local DB has 3 preview staff users (personal email domains), 2 customers (one demo, one apparently real, with a stored fitting), 4 orders, 6 consultations and 17 staff_members (tailor names from `TailorTeamSeeder`).
  - Do not copy the local database to a hosted server. Start it fresh with migrations, then invite real staff with work emails.
  - The `DatabaseSeeder` demo customer/orders and `DemoConsultationSeeder` are optional demo data. Tailor names are real people, so seed them only if wanted.

**Locks:** the 2026-11-20 customer sign-in locks are released (entry marked PAUSED). Codex may edit those files.

**Progress, 21 Nov 2026, about 01:00 (Claude): staff-test instance built on the Mac. The Cloudflare Tunnel is not connected yet.**

- **Lock list (Claude is editing; Codex please avoid):**
  - API: `app/StaffAccess.php`, `app/Http/Controllers/{DemoSalary,DemoCustomer,DemoConsultation,DemoOrderWorkflow,DemoStaffOrder,OwnerOverview,DemoTeam,FinanceOverview,DemoStudioSale}Controller.php`, `routes/api.php`, `config/trustedproxy.php` (new), `tests/Feature/HostedStaffAccessTest.php` (new), and the updated assertions in `tests/Feature/{DemoCustomers,DemoOrderWorkflow,DemoSalary,DemoStaffOrder,DemoStudioSale,DemoTeam,FinanceOverview,OwnerOverview}Test.php`.
  - Portal: `next.config.ts`, `src/lib/dev-links.ts` (+ test), `src/lib/workspace-hosts.ts` (+ test), `src/app/layout.tsx`, `src/app/studio-catalogue-sync.tsx`, `src/app/top-workspace-shell.tsx`, `src/app/layout-data-copy/{page,transfer}.tsx`.
  - New: `scripts/staff-test-up.sh`, `scripts/staff-test-down.sh`.
  - Codex: FinanceOverviewController/FinanceOverviewTest overlap your Finance overview entry. Only the access check and the two old 404 assertions changed; please merge rather than revert.
- **Staff gating:**
  - The `NY_DEMO_API_ENABLED && IP 127.0.0.1` check on all staff endpoints is replaced by `StaffAccess::requireStaffToken()`: an active staff user, a `staff`-ability Sanctum token and a known role. This is in addition to the existing `auth:sanctum` and `can:staff.*` route gates.
  - Public demo routes (`/api/demo/orders`, the public consultation endpoints) still need `NY_DEMO_API_ENABLED`.
  - `config/trustedproxy.php` reads `TRUSTED_PROXIES` (comma list) and trusts no proxy by default.
  - The old "non-local/disabled → 404" test assertions now assert hosted staff access.
  - New `HostedStaffAccessTest`: guests get 401 and customer tokens 403 on 9 staff endpoints; non-staff-ability or inactive staff are refused; an owner works from a non-local IP with demo mode off; a receptionist is limited by role gates; X-Forwarded-For is ignored; public demo routes 404 without demo mode.
  - Full API suite: 118 passed, 970 assertions. Pint was run.
- **Portal:**
  - The 127.0.0.1:3000/:3002 layout-comparison links now show only with the server-only flag `NY_LAYOUT_COMPARISON_LINKS=1`. Set it locally if you still want them.
  - The Office catalogue sync previously ran only on localhost. It now runs on localhost or the configured HTTPS Office host (`catalogueSyncAllowed`), and still never on LAN addresses or the Studio host.
  - `NY_NEXT_DIST_DIR` selects a separate build folder.
  - Node tests 73/73 pass; tsc and eslint pass; `next build --webpack` passes (separate folders; dev `.next` untouched).
- **Staff-test instance (isolated from dev):**
  - Postgres database `ny_atelier_staff_test` was created with createdb. Migrations only; it is empty, with no seeders, no tailor list and no customer data.
  - API env file: `apps/api/.env.stafftest`, gitignored, chmod 600. It has its own APP_KEY, APP_DEBUG=false, MAIL_MAILER=log and NY_DEMO_API_ENABLED=false. It is loaded through `APP_ENV=stafftest`.
  - Storage: `LARAVEL_STORAGE_PATH=~/NY-Atelier-staff-test/api-storage`, covering fittings, logs and cache.
  - Portal data: `~/NY-Atelier-staff-test/portal-data` holds a copy of `catalogue.json` only.
  - Ports: the API serves 127.0.0.1:8100 (PHP built-in server, 4 workers). The portal is a production build in `apps/portal/.next-staff-test`, served on 127.0.0.1:3100 with `NY_STUDIO_ORIGIN=https://studio.thenyatelier.com`, `NY_OFFICE_ORIGIN=https://office.thenyatelier.com` and `NY_STAFF_COOKIE_DOMAIN=thenyatelier.com`.
- **Start/stop:**
  - Start with `codebase/scripts/staff-test-up.sh`; add `--build` to rebuild the portal. It also applies any new migrations, to the staff-test database only.
  - Stop with `codebase/scripts/staff-test-down.sh`.
  - Logs and pids are in `~/NY-Atelier-staff-test/{logs,run}`. The dev servers on 3000/8000/8081 are not touched.
- **Verified locally:**
  - `/up` returns 200; staff endpoints without a token return 401; the public demo route returns 404; `/staff/sign-in` returns 200.
  - A throwaway receptionist invite was activated through the portal, then signed out, signed in and opened `/showroom` (200) and staff orders (200). A wrong password gets 401.
  - The probe user, tokens and staff_members row were then deleted, so the test DB has 0 users.
  - The shared catalogue is initialised on first read by an owner or manager. A receptionist gets 403 until then, so an owner should open Office first.
- **Tunnel:**
  - `cloudflared` 2026.10.7 is already installed through Homebrew. No tunnel or service has been configured.
  - Star creates the tunnel in Cloudflare Zero Trust and runs the `cloudflared service install <token>` command.
  - Public hostnames needed: `studio.thenyatelier.com` and `office.thenyatelier.com`, both pointing to `http://127.0.0.1:3100`. Do not publish 8100.
  - The Mac must stay on and awake while staff test.
- **Staff invites (not yet sent):** `cd codebase/apps/api && APP_ENV=stafftest LARAVEL_STORAGE_PATH=~/NY-Atelier-staff-test/api-storage php artisan staff:invite <work email> <owner|manager|receptionist> --name="<name>" --portal=https://studio.thenyatelier.com`. This prints a one-use 24-hour link to send by hand.
- **Stopped 21 Nov 2026, 01:50, at Star's request (bedtime):** the staff-test instance (3100/8100) was stopped with `codebase/scripts/staff-test-down.sh`. Restart it with `codebase/scripts/staff-test-up.sh`. On Star's instruction to shut down anything running, the dev servers Codex had started (portal 3000 `npm run dev`, API 8000 `composer run preview`, Expo 8081) were also stopped; restart them as usual. Postgres (5432) was left running.

## 2026-11-21 — Codex — Finance overview

**Status:** implemented and checked locally.

**Scope:** replaced the finance landing links with compact money-received, recorded-spending and net-movement totals; cumulative cash flow; income/spending bars; service and expense category doughnuts; payment-method totals; recent activity; and an exact-value table. One period filter controls this year, this month and the last 30 days. Refresh reloads the selected period. Existing finance workspaces remain accessible.

**Data and boundaries:** new read-only `GET /api/demo/staff/finances/overview`, protected by staff Office/finance permissions, is forwarded through the authenticated, no-store portal `/api/finance-overview`. It sums all confirmed Studio receipts and actual salary payments, uses integer minor units, groups by Accra calendar dates, excludes future dates and keeps negative cash movement. Unconnected bespoke/alteration/other income is null, distinct from a connected zero. Local recurring-bill drafts, unpaid order labels and salary approvals are excluded. No opening cash/bank balance, complete expenses or profit is claimed. No migrations, seeds, business-record changes or dependencies.

**Coordination update:** Claude aligned the new finance endpoint with hosting access while this task was being checked: `StaffAccess::requireStaffToken` plus the existing finance route permission replaces the old local-only/demo check. The matching test now allows authorized remote staff with demo mode disabled. These overlapping edits are preserved; the access guard and financial aggregation are checked together.

**Paths:** API `FinanceOverviewController.php`, `FinanceOverviewTest.php` and one staff-only route added outside the customer-auth group. Portal `finance-overview.tsx/.css`, `finance-charts.tsx`, `src/lib/finance-overview.ts` and tests, API proxy, finance workspace wrapper and owner-only Reports link visibility. Claude's customer-auth/passkey files remain untouched.

**Checks:** finance/owner API suites **16 tests, 120 assertions passed** after Pint. After the shared hosting-access update, finance/owner/hosted-access suites passed together: **23 tests, 160 assertions**. Finance chart/navigation logic **6 tests passed**. Scoped ESLint, portal TypeScript and isolated production build passed. Additional server renders covered populated/negative charts and zero/populated category rings without React warnings. Browser verified all period filters, refresh, the exact-value table, unauthenticated proxy rejection and layouts at 390, 768 and default 1481px. Current local financial records have no confirmed receipts or salary payouts, so the live charts correctly show zero/empty states; test figures were not inserted into the development database.

**Responsive limit:** the new panels fit the checked viewports without page overflow, but the existing shared Office mobile/tablet navigation expands vertically when a section is open. That shell layout is a separate follow-up; this task does not certify all Office screens for phones. Physical-device/chart touch acceptance remains pending.

**Handoff:** to cover the whole business next, connect bespoke/alteration collections and shared expense/payment records. Recurring bills are still browser-local drafts and reports/refunds/reconciliation remain incomplete. Source changes are local, not automatically committed or pushed. A self-contained opening-view comparison and screenshots are in the ignored parent `.local-previews/finance/` directory. Existing app services were left running; the temporary comparison viewer is stopped after capture.

## 2026-11-20 — Codex — GitHub source checkpoint

**Status:** published to [ondec/NY-Atelier](https://github.com/ondec/NY-Atelier), branch `main`. The first application checkpoint is `33a57fb`; its complete commit ID was verified against the GitHub API after the push. The original 31 local commits were preserved. This follow-up documentation records that verified result.

**Changes:** preserved the existing local commit history and current implementation across the API, customer app, Studio and Office. Included portable documentation under `codebase/docs/`, with clone-safe entry links. Broadened environment-file, preview/build-directory and log ignores. Local credentials, private customer/fitting uploads, database contents, dependencies and runtime state are excluded. The GitHub repository was public at preparation time.

**Checks:** source and historical high-confidence credential scans found no embedded keys/tokens; candidate runtime/private-file review passed. Full API suite: **105 tests, 862 assertions passed**. Portal logic suite: **68 tests passed**. Portal and mobile TypeScript checks passed. No application build or physical-device acceptance was performed for this source-publication task.

**Repository note:** GitHub accepted the 53.54 MiB Atelier reel with a large-file advisory. No file exceeded its upload limit; consider Git LFS if future media makes the repository unwieldy. The repository remains public, as created by the user.

**Handoff:** customer passwordless sign-in/passkey work below remains in progress, with its lock list and limitations preserved. This checkpoint is source versioning, not a production release. In the full project, keep `../docs/` live and refresh the tracked `docs/` snapshot before subsequent pushes. Services and user records were left in place.

## 2026-11-20 — Codex — Lower customer app navigation

**Status:** completed; narrowly scoped layout adjustment.

**User request:** lower the customer mobile app's floating bottom navigation slightly.

**Coordination:** Claude's customer-auth work and lock list below remain active. This task changes only `apps/mobile/src/components/customer-tab-bar.tsx` and the shared documentation; it does not edit Claude's locked app layout, account, bag, orders or backend files.

**Change:** reduce the shared tab bar bottom offset from `max(bottomInset, 12) + 6` to `max(bottomInset - 6, 10)`. On an iPhone with a 34pt bottom inset, this lowers the bar by 12pt (40pt to 28pt from the bottom), while retaining a minimum 10pt gap on devices without a bottom inset.

**Verification:** `npx eslint src/components/customer-tab-bar.tsx` and `npx tsc --noEmit` passed. The actual home-indicator spacing still needs the user's Expo phone preview check. No new dependencies, API changes or data changes; running services were left alone.

## 2026-11-20 — Claude — Customer passwordless sign-in (PAUSED, locks released)

**Status:** PAUSED on 2026-11-21 for the NY Studio hosting pivot. The file locks below are released, and Codex may edit these files. When resuming, add a note here first. The state at pause: 105/105 API tests pass, and the remaining items are in the latest progress section below.

**User request:** passwordless customer sign-in for the Expo app. Customers browse freely; sign-in is asked at checkout, booking, Orders and Account. First sign-in by email (magic link plus 6-digit code) or phone (SMS code); codes expire after 15 minutes and are single use. A passkey is offered after the first order and required on the first app open 30 days after first sign-in, with a "this device can't" fallback. The email/phone code then becomes the backup. A phone code alone cannot change email/phone or remove a passkey. A verified email/phone links to an existing Studio customer record. Lost email access goes through logged staff recovery. WordPress and payments are out of scope. The user approved adding a Laravel WebAuthn/passkey package.

**Delivery:** no live email/SMS provider yet. Codes/links are written to the Laravel log only. The user will provide a sending address on their domain; an SMS provider (Hubtel, Arkesel or mNotify) is still to be chosen.

**Paths Claude is changing (lock list):**

- API new: `database/migrations/*_add_customer_sign_in*.php`, `app/CustomerSignIn.php`, `app/CustomerSms.php`, `app/Mail/CustomerSignInCodeMail.php` and its view, `app/Http/Controllers/CustomerAuthController.php`, `config/customer_auth.php`, `tests/Feature/CustomerAuthTest.php`.
- API modified: `routes/api.php` (new `customer/auth` group only), `app/Models/Customer.php`, `app/Providers/AppServiceProvider.php` (staff gates reject non-staff tokens), `composer.json`/`composer.lock` when the passkey package is added.
- API passkeys (new): `config/passkeys.php`, `database/migrations/2026_11_20_223342_create_passkeys_table.php`, `app/Http/Controllers/CustomerPasskeyController.php`, `app/Mail/CustomerSignInAlertMail.php`, `resources/views/mail/customer/sign-in-alert.blade.php`, `tests/Feature/CustomerPasskeyTest.php`.
- Mobile new: `src/lib/customer-auth.tsx`, `src/components/sign-in-sheet.tsx`, `src/lib/passkeys.ts`, `src/components/passkey-prompt.tsx`.
- Mobile modified: `src/app/_layout.tsx`, `src/components/shopping-bag.tsx`, `src/app/account.tsx`, `src/app/orders/index.tsx`, `package.json`/`package-lock.json`, `app.json` (passkey/associated-domain config, later).

**Order of work:** Laravel endpoints and tests, then app sign-in sheet and secure session, then passkeys (needs a development build and checks on the Mac).

**Progress, 20 Nov 2026, about 22:10 (Claude):**

- Done and verified: the Laravel email/phone code endpoints, the mobile sign-in sheet and the secure session. `expo-secure-store` ~58.0.3 is installed, and the install added its config plugin to the app config. Mobile `tsc --noEmit` and `eslint` on the changed files pass. `CustomerAuthTest` passes (11 tests). The existing Order/Staff/Customer/Consultation/Studio suites still pass (44 tests). Pint reformatted `app/CustomerSignIn.php`.
- The additive migration `2026_11_20_220000_add_customer_sign_in_tables` has been applied to the local dev database. There was no reset and no seed.
- Next: passkeys. Planned packages are `laravel/passkeys` (v0.3.0, supports Laravel 13; `laragear/webauthn` is abandoned) and `react-native-passkey` (3.6.2). Passkeys need an Expo development build; Expo Go cannot run them. Neither package is installed yet.
- 22:32: the user ran `composer require laravel/passkeys` (v0.3.0, plus web-auth/webauthn-lib 5.3.15 and 15 other new dependencies). composer.json/lock are updated. The package's 7 default web/session routes (`/passkeys/*`, `/user/passkeys*`) are now registered and will be switched off with `Passkeys::ignoreRoutes()`. Its migration is not published or run yet. All 55 API tests in the 8 sign-in/order/staff/customer suites still pass. `composer audit` shows 8 advisories, all in laravel/framework (<13.40) and symfony packages (<8.1.11) that were already installed, none in the new packages. A separate dependency update is advisable.
- Passkey package research (source read before install). `laravel/passkeys` works on `App\Models\Customer` via `Passkeys::useUserModel()`. Its built-in routes are session/web-guard based, so we plan to call `Passkeys::ignoreRoutes()` and use its Actions from our own Sanctum routes, with the challenge held server-side. The webauthn-lib origin check rejects `android:apk-key-hash:` origins as written, so native Android will need a custom origin check.
- Still open: a real email sender address and an SMS provider. Codes go to the Laravel log only for now.

**Progress, 20 Nov 2026, about 23:00 (Claude): customer passkeys added.**

- API: published `config/passkeys.php`. The RP ID comes from `CUSTOMER_PASSKEY_RP_ID` (default `thenyatelier.com`). Allowed origins come from the comma list in `CUSTOMER_PASSKEY_ORIGINS` (default `https://thenyatelier.com`). `.env` was not edited.
- Migration `2026_11_20_223342_create_passkeys_table` adds the `passkeys` table (owner column `user_id`, foreign key to `customers`). It has been applied to the local dev database; there was no reset and no seed.
- `AppServiceProvider` calls `Passkeys::ignoreRoutes()`, so the package's 7 web routes are gone, and `Passkeys::useUserModel(Customer::class)`. Staff stay on passwords.
- `Customer` implements `PasskeyUser` and uses `PasskeyAuthenticatable`. It overrides `passkeys()` with foreign key `user_id`, because the trait otherwise guessed `customer_id`. It also overrides the display name and username.
- New `CustomerPasskeyController`, under `/api/customer/auth`:
  - `POST passkey/login/options` and `POST passkey/login` (guest).
  - `GET passkeys`, `POST passkeys/options`, `POST passkeys` and `DELETE passkeys/{id}` (customer Sanctum token).
  - WebAuthn options are cached for 5 minutes under a single-use `ceremonyId`.
  - Removing a passkey needs a `channel:email` or `channel:passkey` token; a phone-code session gets 403.
  - Events recorded: `signed_in`/passkey, `passkey_added`, `passkey_removed`.
- `CustomerSignIn`: `enrolled` is now real. A code sign-in by a customer who has a passkey records `fallback_sign_in` and emails `CustomerSignInAlertMail`; it never blocks the sign-in. Token issuing moved into `session()`.
- Tests: `CustomerPasskeyTest` passes (10 tests, 49 assertions). With CustomerAuthTest and the 7 earlier suites, 65 tests and 494 assertions pass. The full API suite passes (105 tests, 862 assertions). Pint was run.
- Mobile: `react-native-passkey` ^3.6.2 installed with `npx expo install`. `app.json` now has `ios.associatedDomains: ["webcredentials:thenyatelier.com"]`. No prebuild was run.
  - `src/lib/passkeys.ts`: `passkeysSupported()` is false on web, in Expo Go and when the native module is missing.
  - `customer-auth.tsx`: `signInWithPasskey` and `addPasskey`. The sign-in sheet shows an outlined "Sign in with passkey" pill when passkeys are supported.
  - `passkey-prompt.tsx`: the 'offer' prompt can be snoozed for 3 days; the 'required' prompt has a "My phone can't do this" link that dismisses it for the current app session.
  - The account Security panel shows "Passkey: set up" or a "Set up a passkey" action.
  - `tsc --noEmit` and eslint on all changed mobile files pass.
- Remaining:
  - (1) Android native origins (`android:apk-key-hash:…`) are rejected by webauthn-lib 5.3's CheckAllowedOrigins. A custom origin step is needed by subclassing StorePasskey/VerifyPasskey.
  - (2) Serve `/.well-known/apple-app-site-association` (webcredentials, Team ID + `com.thenyatelier.app`) and `/.well-known/assetlinks.json` on thenyatelier.com over HTTPS.
  - (3) A development build for testing on a real device; Expo Go cannot run passkeys.
  - (4) An email sender address and an SMS provider.
  - (5) A separate `composer update` for the laravel/framework and symfony security advisories.
  - No real authenticator has been tested end to end yet.
- Codex: the lock list above still applies. Free areas include WordPress catalogue discovery, Studio/Office work outside the listed files, and docs.

## 2026-11-20 — Codex — Shared assistant handoff

**Status:** documentation handoff completed; no application feature work is authorized by this entry alone.

**User request:** let Claude continue in the same project folder when Codex credits run out, and let Codex later resume with an accurate view of changes.

**Changes:**

- Created the canonical `AI_HANDOFF.md` covering current stack, architecture, actual module status, design/layout decisions, authentication, storage, local operation, checks and launch gaps.
- Created this work log and entry instructions in root/codebase `AGENTS.md` and `CLAUDE.md` so either folder entry point leads to the same guide.
- Corrected obsolete README implementation claims and added current-document pointers to historical plans. Updated the gaps checklist for the user's regained domain access, Studio-first release sequence and latest implemented work.
- Preserved the nested Laravel/Expo instructions and existing application/data files. No passwords, tokens, private fitting values or WordPress credentials were placed in the handoff.

**Validation:** 11 Markdown files passed local-link and code-fence checks; the 12-area JSON checklist parsed, had unique IDs/boolean states, and supplied evidence for completed items. Credential-pattern checks and `git diff --check` passed. Prior feature test results are listed below; no application tests were rerun for this documentation-only task. No services, credentials or business records were changed.

**Next:** the user reports WordPress admin access. No WordPress admin session/import has occurred. Read-only catalogue discovery/import preparation and physical-device Studio acceptance are the next discussed work. Hosting/DNS still need decisions and execution. Ask for the relevant admin URL/access approach when that task starts; do not publish or modify the live WordPress site from this log alone.

**Services:** PostgreSQL 5432, API 8000, portal 3000 and Expo 8081 were observed running during the handoff. Leave them alone unless the current user task calls for a change; recheck before starting anything.

## 2026-11-20 — Codex — Sales history and order source

**Status:** implemented and checked locally.

**Behavior:** Sales history moved from the Studio Ready-to-Wear header into Settings. All orders has source labels, source filtering, source-aware search and board labels; details show Order source. New Studio sales/alterations save `studio`; Office-created orders save `office`. `customer_app` is supported in the shared record/UI for the future customer checkout connection. Legacy unknown origins remain null/“Not recorded.”

**Key files:**

- Portal `src/app/showroom/{studio-tools,showroom}.tsx`, `src/app/api/studio/records/[...path]/route.ts`.
- Portal `src/lib/{order-source,orders,order-desk}.ts`, `src/app/{service-order-desk,order-table,order-details-content}.tsx`, `globals.css`.
- API `app/Models/Order.php`, `app/OrderWorkflow.php`, `app/StudioSales.php`, `DemoStaffOrderController.php`, `routes/api.php`.
- Migration `2026_11_20_194826_add_source_to_orders_table.php`, applied to the local development DB. Backfill uses only a saved Studio sale relation as proof of origin.

**Checks:**

- API `OrderSourceTest`, `DemoStaffOrderTest`, `DemoStudioSaleTest`, `DemoOrdersTest`: **24 passed, 190 assertions** after formatting.
- Portal `order-desk.test.mjs` and `studio-dialog-history.test.mjs`: **8 passed**.
- TypeScript, scoped ESLint, Pint and isolated production build passed.
- Browser confirmed the moved Settings action, history Back, source column/options, empty filtered state and source details. Existing four demo orders show “Not recorded,” as expected.

**Limit:** customer-app order creation/payment checkout remains pending. No new paid order was created for UI verification.

## 2026-11-20 — Codex — Cross-screen Studio readiness pass

**Status:** local responsive/browser checks complete; actual iPhone/iPad acceptance still pending.

**Changes:**

- Added garment detail URL/history restoration and Back/Forward handling.
- Added shared Studio dialog history for Settings, photos, customer picker, sales history, checkout and related panels; nested Back closes the appropriate panel.
- Kept pending checkout confirmation protected from dismissal and improved storage-failure handling. Fitting saves guard against navigation while busy.
- Added staff-scoped, validated sessionStorage sale drafts with an eight-hour maximum age; refresh recovers variants/quantities/customer selection without trusting stored prices.
- Server initializes Studio from its URL to avoid flashing the welcome screen on detail reload.
- Enlarged touch targets, kept input text at 16px, made phone drawers full screen, and adjusted short-window welcome flow to avoid overlap.
- Added direct Studio-page permission enforcement. Preserved desktop/tablet side-by-side sale layout and mobile bag dock.

**Checks at that time:** 19 portal logic tests, 34 API tests/300 assertions, scoped lint/types and production build passed. Browser widths 320, 390, 768, 844, 1024 and 1440 were checked, including landscape and nested Back paths. Sale draft recovered after refresh. No payment submitted during UI testing.

**Limit:** responsive browser checks do not certify actual iOS status-bar behavior, edge-swipe animation, virtual keyboard or installed PWA behavior. Studio must support phone, tablet and desktop before release.

## Entry template for the next assistant

Copy this structure to a new dated entry at the top of the log; replace every placeholder with actual results. Keep the latest entries short and update the canonical guide rather than repeatedly copying it.

```text
## YYYY-MM-DD — Assistant name — Task
Status: completed / in progress / waiting for a specific input
User request:
Changes and affected paths:
Data/migrations/environment changes:
Checks run and actual results:
Known limitations or unfinished work:
Next concrete step / required user input:
Services left running or stopped:
```

Do not mark an implementation complete just because the previous assistant planned it. Verify the code and relevant behavior, then update this log.
