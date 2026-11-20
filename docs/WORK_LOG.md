# NY Atelier — shared work log

Use this file for dated handoffs between Claude, Codex and maintainers. Read the latest entry first, then [AI_HANDOFF.md](AI_HANDOFF.md) for architecture and design. Dates use Africa/Accra. Write facts and results, not hidden reasoning or a chat transcript. Do not include credentials or private fitting values.

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

## 2026-11-20 — Claude — Customer passwordless sign-in (IN PROGRESS)

**Status:** in progress. Claude is editing the files listed below. Codex: please avoid these paths until this entry is marked complete, and add a note here before touching them.

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
