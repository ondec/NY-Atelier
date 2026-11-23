# NY Atelier — shared implementation and design handoff

Last verified: **23 November 2026**, Africa/Accra. Maintained jointly by the assistant currently working with Benjamin.

This is the current implementation guide for continuing work in Claude, Codex or another coding assistant. It describes an actively developed local application, not a production launch. Read the newest [work log](WORK_LOG.md) entry after this guide. The older [project plan](PROJECT_PLAN.md) preserves business requirements and historical proposals; its early implementation claims are superseded by this guide where they conflict.

## 1. Quick orientation

- Project folder: `/Users/benjaminanane/Documents/Stacks/Ny Atelier`.
- Git/application root in the full workspace: `codebase/` (the root of a standalone GitHub clone). Original source media and the live shared documents remain in the parent project folder. The repository now includes a portable `docs/` snapshot. In the full local project, consult `../docs/` first and refresh the tracked copy before another push; in a standalone clone, maintain `docs/` directly. Selected application media are included under each app, but private uploads and runtime data are excluded.
- Source repository: [ondec/NY-Atelier](https://github.com/ondec/NY-Atelier), branch `main`. Publishing the source does not deploy the applications.
- Three applications: customer Expo app, Next.js staff web app containing NY Studio and NY Office, and one shared Laravel API/PostgreSQL database.
- **NY Studio is a responsive, installable web app. It is not the customer Expo app.** Studio must work across phones, tablets and desktop, not just mobile.
- Staff authentication and the Studio POS are connected local implementations. Customer authentication, customer checkout and payment-provider processing remain unfinished. **Customer passwordless sign-in is paused (2026-11-21), and its file locks are released. The current priority is hosting NY Studio for staff testing. See the latest [work log](WORK_LOG.md) entry.**
- Latest completed feature: the cash-based Finance overview, with received/spent/net totals, cash flow, income/spending and category charts, period filters and recent activity. Studio Sales history and order-source tracking are also implemented. See the work log for exact data coverage and remaining gaps.
- Current priority: finish physical-device acceptance, bring in approved WordPress catalogue content, then host Studio and its API/database. Office can be released later using the same backend.
- Domain access is available; Cloudflare manages DNS. The user selected **Render, free testing only**, created an account and connected GitHub on 23 November. Render preview deployment is being prepared; consult the latest work log before assuming it is live. Do not assume earlier temporary preview tunnels still work.
- The user reports WordPress admin access, but no admin session or catalogue import has been completed here. Verify which site and catalogue/plugin are involved before integration.
- This checkout has many existing modified and untracked files. **Do not reset, clean, reseed or replace it to obtain a clean starting point.**

## 2. Shared working protocol

The shared files are the handoff mechanism. This document does not automatically transfer either assistant's chat transcript.

At the start of a session:

1. Read the root instructions, this guide's quick orientation and the latest `WORK_LOG.md` entry. Read deeper sections relevant to the task rather than rereading the entire repository.
2. Inspect `git status` inside `codebase/`; preserve work left by the other assistant and the user.
3. Read affected app instructions. Laravel has additional local skills; Expo and Next.js require version-specific documentation before framework changes.
4. Confirm which services are already running before starting duplicates. Treat the service snapshot below as dated information.
5. Continue the user's currently authorized task. A backlog entry is not a request to execute it.

Before handing over:

1. Update implementation facts in this guide when they change.
2. Add a dated work-log entry with changes, important paths, migrations, checks and results, unfinished work, and service state. Name the working assistant.
3. Update the JSON gaps checklist only for verified status changes. Record limitations, not just successful UI rendering.
4. Explain incomplete work and the next concrete step. Never mark unrun tests as passed.
5. Keep passwords, tokens, keys, session cookies and private customer measurements out of all handoff files.

Use one editing assistant at a time on this checkout. Stop the first session's editing before the other starts. If work overlaps, inspect the diff and coordinate through the work log before changing shared files.

The current user task and applicable instructions take precedence over historical plans. Code and tests establish what is implemented; a mismatch with an approved business requirement is a gap to address, not permission to silently change the requirement.

## 3. Architecture and installed stack

Versions below were inspected from installed packages/lockfiles, not inferred from old proposals. Recheck the lockfiles before an upgrade.

| Part | Current stack | Location |
| --- | --- | --- |
| Customer app | Expo SDK 58, installed Expo 58.0.23; React Native 0.88.1; React 19.3.0; TypeScript 6.0.3; Expo Router 58.0.30 | `codebase/apps/mobile/` |
| Customer interactions | React Native Reanimated 4.7.1, Gesture Handler, Safe Area Context, SVG, Expo Blur/Glass Effect, Expo Video, AsyncStorage | Mobile dependencies and components |
| Studio and Office | Next.js App Router 16.4.6; React/React DOM 19.3.0; TypeScript 5.9.3 | `codebase/apps/portal/` |
| Staff UI | Plain application CSS, local fonts, shared NY icon components; Embla 8.6.0 for galleries; vis-timeline 8.5.6 for consultation scheduling | Portal app/components |
| API | Laravel 13.39.0; Sanctum 4.3.3; PHP | `codebase/apps/api/` |
| Database | PostgreSQL 17; local CLI reported 17.11; development database `ny_atelier_dev` | Laravel migrations/configuration |
| Backend tests | PHPUnit 12.5.43, Laravel feature tests using isolated SQLite in memory | `apps/api/tests/`, `phpunit.xml` |
| Frontend checks | TypeScript, ESLint; Node built-in tests for business/navigation logic | Each app and `src/lib/*.test.mjs` |
| Staff installation/offline | Web manifests, standalone display, shared service worker caching only a generic offline notice | Portal `public/`, `web-app.tsx` |
| Salary OCR | Local Swift/Apple Vision helper; requires a suitable Mac environment | Portal `src/lib/salary-ocr.swift` |

The current shell reported Node 22.23.4 and PHP 8.5.9. Earlier setup instructions targeted Homebrew Node 24/PHP 8.4. The Laravel package requirement is PHP `^8.3`; inspect the actual environment and app instructions instead of changing the global toolchain just to match an old README.

Data flow:

```text
Customer Expo app -> Laravel demo order/consultation APIs
Customer Expo app -> Next.js public published-size-chart endpoint
NY Studio + NY Office -> Next.js protected route handlers -> Laravel -> PostgreSQL
Fitting uploads -> protected Laravel storage, served through authenticated Next.js proxy
Staff size-chart publishing -> validated JSON in the portal's persistent data directory
```

The portal currently imports some catalogue/sizing code directly from `apps/mobile/src/`. There is no completed standalone shared-package layer. Preserve or deliberately migrate those cross-app imports when moving files or changing builds. Updates use polling/refresh; GraphQL, WebSockets and Reverb are not implemented integrations.

## 4. Directory map and first files to inspect

Paths in the following sections are relative to `codebase/` unless stated otherwise.

| Area | Primary implementation |
| --- | --- |
| Customer tabs | `apps/mobile/src/app/{index,shop,atelier,account}.tsx`, `orders/`, `_layout.tsx` |
| Customer theme and icons | `apps/mobile/src/atelier-theme.ts`, `components/ny-mark.tsx`, `components/ny-icon.tsx`, `data/ny-icons.json` |
| Customer navigation/motion | `components/customer-tab-bar.tsx`, `tab-swipe.tsx`, `edge-swipe-back.ts`, `home-destination-card.tsx` |
| Customer bag/sizing | `components/shopping-bag.tsx`, `components/size-guide.tsx`, `src/lib/sizing.ts`, `data/size-charts*` |
| Customer account persistence | `src/lib/demo-customer.tsx`, `account-measurements.tsx`, `measurement-history.ts`, `account-settings.ts` |
| Staff shell and styles | `apps/portal/src/app/layout.tsx`, `globals.css`, `workspace-rail.tsx`, `office-workspace.tsx` |
| Studio | `apps/portal/src/app/showroom/` — `showroom.tsx`, `showroom.css`, `studio-tools.tsx`, `sale-basket.tsx`, `checkout.tsx`, `garment-gallery.tsx` |
| Studio history/draft logic | Portal `src/lib/studio-location.ts`, `studio-dialog-history.ts`, `studio-sale-draft.ts`; `showroom/use-studio-dialog-history.ts` |
| Staff login/roles | Portal `src/lib/staff-{session,cookie,permissions}.ts`, `workspace-hosts.ts`, `src/app/staff/`, `api/staff-auth/` |
| Customers and fittings | Portal `customers-workspace.tsx`, `fitting-fields.tsx`, `fitting-readings.tsx`; API `DemoCustomerController.php`, `config/fittings.php` |
| Shared catalogue/stock | Portal `rtw-inventory.tsx`, `catalogue-editor.tsx`, `collections-workspace.tsx`, `studio-catalogue-sync.tsx`, `src/lib/studio-catalogue-store.ts` |
| Published charts | Portal `size-chart-editor.tsx`, `src/lib/size-chart-store.ts`, `api/size-charts/route.ts`; mobile `src/lib/published-sizing.tsx` |
| Orders | Portal `service-order-desk.tsx`, `order-table.tsx`, `order-details-content.tsx`, `src/lib/{orders,order-desk,order-source}.ts` |
| Order workflow | API `app/OrderWorkflow.php`, `app/OrderCustomerNotice.php`, `config/order_workflows.php`, `DemoOrderWorkflowController.php` |
| POS persistence | API `app/StudioSales.php`, `DemoStudioSaleController.php`; portal `studio-sales-register.tsx`, `studio-receipt.tsx` |
| Consultations | Portal `consultations.tsx`, `consultation-gantt.tsx`; API `DemoConsultationController.php`; mobile `src/lib/consultations.ts` |
| Finances/team | Portal `finance-workspace.tsx`, `finance-register.tsx`, `recurring-bills.tsx`, `salary-*.tsx`, `team-workspace.tsx`; API salary/team controllers |
| Original media | Parent project `Image Assets/`, `Logo/`, `Video Assets /` (the last directory name includes a trailing space) |

## 5. Design language to preserve

The approved direction combines clean editorial fashion shopping with restrained heritage details. Match existing cards and controls before introducing another visual system. Do not redesign unrelated screens during functional changes.

| Token | Value | Use |
| --- | --- | --- |
| Deep Petrol | `#123C45` | Brand text, primary actions, selected controls |
| Warm Alabaster | `#F6F3EC` | Main canvas |
| Saddle Cognac | `#A85C32` | Small section labels and restrained accents |
| Brushed Brass | `#C5A059` | Rope/wreath and selective decorative accents |
| Dark Slate | `#1C2326` | Text |
| Muted Sage | `#7A8B7B` | Supporting accents; current portal muted text uses its CSS token |
| Line | `#E7E1D6` | Current portal borders/dividers |

- Headings: **Alfa Slab One**, local `Alfa` font in the portal. UI/body: **Josefin Sans**, local `Josefin`. These are provisional brand-compatible fonts; do not claim the original wordmark font has been identified.
- Base portal body text is 16px and labels 14px. Inputs in Studio are 16px; touch controls generally have at least a 44px target. Some dense table/metadata styles remain smaller.
- Primary actions and selection controls are pills. Cards have soft rounded corners, fine warm borders and restrained shadows. Large photographs retain premium portrait proportions.
- Reuse supplied NY vector artwork. `apps/portal/public/ny-mark.svg` is the monogram; `ny-wreath.svg` contains the extracted rope ring. Customer account initials use the same rope motif. Profile photo upload is not needed for this product direction.
- Use the existing shared icons; preserve the NY mark for the Atelier tab. Avoid arbitrary emoji in product UI.
- Status tones: blue=new/info; purple=in progress; teal=ready; green=completed/paid; amber=waiting/attention; red=urgent/error; grey=cancelled/draft/unknown. Reuse `StatusBadge` and `src/lib/status.ts`; always retain text, not colour alone.
- A deposit is not full payment. Ready is not collected/delivered. Completed/cancelled orders must not receive overdue warnings.
- Motion should be gentle and respect reduced-motion preferences. Do not add a custom edge gesture that fights browser Back or gallery scrolling.
- Keep implementation terminology, placeholder warnings and duplicated headings out of customer flows unless they explain a real limitation to the person using the screen.

### Studio-specific layout decisions

- Studio works across all screen sizes. Phone breakpoint is currently `max-width:760px`; tablet/desktop retain the wider layout. Important audit sizes: 320×568, 390×844, 844×390, 768×1024, 1024×768 and 1440×900.
- General Studio outer gutter is **10px plus safe-area insets**. Settings has **20px internal padding**. Preserve this deliberate exception.
- Welcome/landing has its own spacious padding: phone horizontal 5vw and top 32px plus safe area; wider screens use the established 5–6vw treatment. Short windows use normal flow to avoid branding/progress overlapping content. Do not force the welcome back into the 10px content gutter.
- Welcome uses the five currently configured local photos, six-second holds and a 1.2-second dissolve. Progress dashes only; no next/previous controls. The backdrop extends to the top. Preserve the lightly translucent frosted Fittings and Ready-to-Wear cards.
- Do not reintroduce a plain coloured top cover, artificial status-bar gradient or app-level blur over the welcome text. Some phone-only status-area fading appeared OS-generated; actual iPhone/iPad verification remains necessary.
- No settings or Office-return button on the welcome page. In the main header, use the circular Settings icon; the redundant header customer chooser and separate sign-out icon were removed.
- Settings shows rope-framed initials and identity **directly on the Alabaster background**, not on a dark profile card. Grouped rows: Install app, Sales history, Open NY Office; Account group: Sign out.
- Open NY Office uses the signed-in role's Office URL. Without permission, show the administrator-contact message and enforce the restriction on the destination page.
- Phones: Fittings/Ready-to-Wear sit in a compact bottom floating pill, about 14px above the viewport bottom. Do not add the safe-area inset twice. When a sale contains items, the pill shifts to make room for a separate **58px circular bag button**, with a small centred count badge. No bag button when empty.
- On phones the Sales Desk is not below the catalogue. The bag opens its own full-screen, history-backed Sales Desk. Tablet/desktop retain the side-by-side catalogue and sale panel.
- Fittings on tablet/desktop: customer directory fills the available height; the profile/history panel scrolls independently. Phones switch between directory and profile pages.
- Fitting/customer forms are full-screen history-backed pages. Other Studio drawers fill the phone screen; tablet/desktop keep appropriate wider panels. Keep dedicated dismissal controls and browser Back working.

## 6. Module status and business rules

### Customer app

- Five tabs: Home, Shop, Atelier, Orders, Account. Home includes the editorial carousel, Ready-to-Wear/Atelier destination cards and service promotions.
- Customer floating tab bar positioning lives in `components/customer-tab-bar.tsx`: bottom offset `max(bottomInset - 6, 10)`, lowered slightly on 20 November at the user's request. This is separate from the Studio dock; preserve the home-indicator clearance and existing bar size/style.
- Shop has a nine-piece preview catalogue, filters, galleries, colour/fabric choices, variant size selection, wishlist/bag interactions and the dynamic Size Guide. Women’s authentic catalogue content still needs confirmation/import.
- Atelier offers the custom/bespoke journey and consultation requests. Requests are now sent to Laravel and staff can review/confirm/propose alternatives. The original README statement that all requests remain local is obsolete.
- Orders reads shared sample orders and workflow timelines. Customer identity is still the demo-customer foundation, not a completed authenticated customer-account system.
- Account has grouped profile details, measurement history, delivery addresses, notification preferences, security/sign-in information and help/privacy UI. Some fields/preferences are device-local AsyncStorage; account UI is not proof that real sign-in, password changes, biometrics or cross-device sync are connected.
- Optional measurements entered in the Size Guide save into the customer's **local app measurement history** and can be reused across items. This is not yet the same authenticated backend history as staff-created fittings.
- Customer bag-to-paid-checkout and customer order creation through a payment provider are not connected. No App Store/Google Play production release is complete.

### NY Studio

- Protected staff web app for customer lookup/creation, fittings and Ready-to-Wear sales. Alterations are created in context after a try-on/garment selection, not a separate welcome module.
- Fitting templates include Kaftan, Agbada, Suit, long-sleeve shirt, short-sleeve shirt and fitted trousers. Keep top/jacket measurements separate from trouser measurements in saved history.
- Studio entry/display uses **inches**. The shared fitting backend normalizes length data to canonical centimetres. Convert once; preserve explicit unit semantics. Do not relabel existing cm numbers as inches.
- Preset measurement fields can be removed/restored. Green circular + opens a custom label/value field directly; do not restore an intermediate “select a measurement” flow.
- Inspiration photo/video upload appears after measurements and before fitting notes. Current limits: six files, 20MB each, 60MB total; private attachments require staff access. Preserve mobile inline video/range handling.
- An existing manually transcribed suit fitting is a test record. Ambiguous slash-separated handwritten values were retained as separate readings with uncertainty notes and source photo. Never reinterpret them as fitted/loose or inseam/outseam without tailor confirmation.
- POS lines use the **selected variant's** colour/fabric photograph. Quantity controls, stock checks, customer selection, alteration creation, payment review and receipts are implemented.
- POS methods record manually confirmed cash, mobile money, terminal card or bank transfer. The app does not initiate, settle or independently verify those external payments.
- The server rechecks prices, revision and stock; idempotent checkout protects against duplicate sales/stock deductions. Pending checkout confirmation survives retry. Do not collect a payment twice after an uncertain result.
- Unfinished sale drafts are staff-scoped in sessionStorage, with an eight-hour maximum age. They contain variant IDs/quantities, not trusted prices. Pending checkout recovery uses a separate staff-scoped localStorage record.
- Sales history is **inside Settings**, not in the Ready-to-Wear heading. It opens recorded sale receipts and supports searching. Native Back was checked for its opening/closing path.

### NY Office

- Shared role-aware Office at `/office/{role}`, with grouped sidebar/workspace rail and role account menu. Account initials contain Install app/Sign out actions rather than cluttering the header.
- Owner overview shows compact operational context, expanded order desk, actionable consultation queues, due-order context and recorded sales/payroll/workload metrics. Do not invent profit from incomplete expense/settlement data.
- All orders supports list/board views, service, status, stage, fulfilment, search and **source** filtering. Details include order source, customer, handover, payment, dated workflow, garments and linked fitting where available.
- Three order categories remain distinct: Ready-to-Wear, `Custom` (Bespoke/Atelier) and Alterations. Category and source are different dimensions.
- Source values are `studio`, `office`, `customer_app`, or null for older unrecorded origins. Studio RTW sales and Studio alteration creation save `studio`; Office creation saves `office`. The Customer app source is supported for its future checkout connection.
- Source is selected by the server creation path, not an arbitrary browser payload. Retries preserve the original source. The latest migration backfilled Studio only where a saved `studio_sales` relation proves it; never infer source from order prefix/category alone.
- Catalogue administration covers products, actual variants, price, quantity/reorder information, movements, variant photos/galleries and collections. Shared catalogue persistence is now in Laravel/PostgreSQL, with revision conflict protection.
- Staff can publish size charts at product or gender-specific collection scope. Published sizing JSON is still a separate portal file-backed store.
- Consultations include staff review, confirmation, alternative-slot handling, customer responses and a scheduling view. Meeting-provider automation/live calendar integration is not established merely by these screens.
- Finances now has a cash-based overview with period-filtered totals, cumulative cash flow, income/spending bars, service/expense doughnuts, payment methods, recent activity and chart data. The new read-only staff-finance endpoint aggregates confirmed Studio receipts and salary payout dates in integer minor units; it excludes unpaid orders and browser-local bill drafts. Unconnected income sources stay null. Net movement is not profit or a bank/cash balance. Recurring bills, other income/expenses, refunds, reconciliation, daily closing and complete business accounting remain unfinished. The new panels have responsive browser checks, but the shared Office mobile navigation still needs a separate layout pass.
- Salary scanning uses a local Mac Swift/Apple Vision helper with human review. It is not a portable hosted OCR service yet.
- Team directory records do not automatically grant login. The salary-sheet explanatory banner and Salary approvals shortcut were removed from Team at the user's request.
- Production/material inventory and some Atelier offering destinations remain planned views. A working navigation item is not a completed module.

### Sizing rules shared with the customer app

- Typed/validated JSON; keep source measurements numeric. Initial reference data: mobile `data/size-charts.json`; product overrides and published staff assignments supplement it.
- International sizes S–3XL; Ghana defaults to international alpha labels. UK/US/EU conversions are approximate. Men and women are separate; do not equate their sizes.
- cm/in toggle uses exactly **1 inch = 2.54 cm**. Do not invent exact garment dimensions or inseam lengths.
- Derive gender and garment parts from the product context. A two-piece can show relevant shirt/top and trouser parts; trouser-only products show trouser data. Product-specific chart/ID overrides take precedence over generic reference data.
- Show only available purchasable variants/lengths. Keep independent trouser waist and inseam choices when inventory supports them.
- Recommendations need sufficient chart/measurement/fit-allowance information and must accommodate all supplied required dimensions. Explain insufficient data or no fit rather than inventing a recommendation.
- The Size Guide sits on the existing page background, with no white outer card, no redundant “Size guide” heading and no duplicate divider with Description. The user explicitly removed “How to measure”; do not add it back from the original requirement list.

## 7. Authentication and actual permissions

Staff sign-in is Laravel Sanctum backed. The Next.js server keeps the opaque token in an HttpOnly cookie; no auth token is stored in JavaScript storage. Current session/cookie lifetime is **eight hours**. Same-origin checks protect staff mutations and API gates enforce actions.

| Capability | Owner | Manager | Receptionist |
| --- | --- | --- | --- |
| Office and Studio | Yes | Yes | Yes |
| Customers/fittings, consultations, order read | Yes | Yes | Yes |
| Create alterations | Yes | Yes | Yes |
| Production/order management | Yes | Yes | No |
| Catalogue management | Yes | Yes | No |
| Finances | Yes | Yes, with role limits | No |
| Team / owner-only reporting | Yes | No | No |

Source of truth: API `app/StaffAccess.php` and gates in `AppServiceProvider.php`; portal visibility in `src/lib/staff-permissions.ts`. Changing a URL or Office role segment must not change the authenticated role. Planned designer/tailor accounts and finer manager-only approvals are not implemented simply because the historical product plan lists them.

The API has local Laravel skills in `.agents/skills/` and `.claude/skills/`, and `.mcp.json` defines the Laravel Boost server as `php artisan boost:mcp`. Tool availability differs by assistant; use the existing app instructions and a documented CLI fallback when a tool is unavailable.

Three temporary staff accounts have been provisioned with user-supplied aliases. Credentials intentionally are not reproduced here. Ask the user/use their secure credential source when needed. Do not reset credentials, print session cookies, or create another owner to bypass a login problem.

Provisioning/activation entry point: API `staff:invite` Artisan command; inspect `--help` and its implementation before use. Production staff onboarding, recovery and replacement of preview credentials still need completion/review.

Customer auth is a separate unfinished task. Demo customer routes are not suitable as the production customer security boundary.

## 8. Persistence, API boundaries and data safety

| Data | Current authority / limitation |
| --- | --- |
| Staff accounts/tokens | PostgreSQL via Laravel/Sanctum |
| Customers, dated fittings, attachments metadata | Laravel/PostgreSQL; files in protected storage |
| Orders/items/events and source | Laravel/PostgreSQL |
| Consultations | Shared Laravel records; customer side still demo identity |
| Studio catalogue | `studio_catalogues` database table; revision protected |
| Studio completed sales | `studio_sales` plus linked order, receipt, stock movements |
| Staff-published sizing | Portal `.studio-data/size-charts.json` or configured `NY_SIZE_CHART_DATA_DIR`; needs durable shared storage when hosted |
| Legacy catalogue file | `.studio-data/catalogue.json` may seed initial DB catalogue if uninitialized; it is not the ongoing shared authority |
| Customer app profile/preferences/measurements | AsyncStorage/device-local foundation |
| Unfinished Studio sale | Staff-scoped sessionStorage; recoverable in the same browser tab session |
| Pending checkout | Staff-scoped localStorage; prices/stock/payment record remain server-authoritative |
| Recurring-bill drafts | Browser localStorage; not complete shared accounting |

Important routes:

- Portal `/staff/sign-in`, `/showroom`, `/office/{role}`.
- Next.js `/api/staff-auth/*`, `/api/staff-customers`, `/api/staff-orders`, `/api/consultations`, `/api/staff-salaries`, `/api/staff-team`, `/api/owner-overview`.
- Studio browser requests use `/api/studio/catalogue`, `/api/studio/sales/*`, `/api/studio/records/*`; route handlers forward to protected Laravel endpoints.
- Staff order creation: Laravel `/api/demo/staff/orders` means Office; `/api/demo/staff/studio/orders` means Studio alterations. The Studio proxy explicitly selects the latter for creation.
- Demo customer orders `/api/demo/orders`; consultations `/api/demo/consultations`; public sizing from Next.js `/api/size-charts`.

Several route names retain `demo`. Do not rename or expose them as production APIs without reviewing authentication, customer scoping and compatibility.

Preserve existing records. The dataset started with four fictional sample orders, but staff/customer test records and private fitting media have since been added. Do not describe every stored record as fictional without review. Do not run `migrate:fresh`, database resets or seeders against the current database to fix a UI issue.

Latest applied migration: `apps/api/database/migrations/2026_11_20_194826_add_source_to_orders_table.php`. Earlier migrations include fitting custom fields/media, staff access, consultation links, shared catalogue and POS tables. Check migration status before updating another environment.

## 9. Running and checking the project

### Dated service snapshot

On 20 November 2026 the local Mac had PostgreSQL on 5432, Laravel on 8000, the portal on 3000 and Expo on 8081. These processes were left running. Process IDs and LAN IPs are not a durable contract; inspect listeners again before restarting anything. No public tunnel was verified active at handoff.

### Existing-machine startup

Use installed dependencies and the existing environment files. Do not regenerate an existing Laravel app key or overwrite `.env` as a routine startup step.

```sh
# Terminal 1: Laravel; preview script includes fitting-upload PHP limits.
cd "/Users/benjaminanane/Documents/Stacks/Ny Atelier/codebase/apps/api"
composer run preview
```

```sh
# Terminal 2: staff web app; LAN binding also permits same-Wi-Fi device review.
cd "/Users/benjaminanane/Documents/Stacks/Ny Atelier/codebase/apps/portal"
npm run dev -- --webpack --hostname 0.0.0.0 --port 3000
```

```sh
# Terminal 3: customer app, only when needed.
cd "/Users/benjaminanane/Documents/Stacks/Ny Atelier/codebase/apps/mobile"
npx expo start --lan --port 8081
```

PostgreSQL is a Homebrew service on this Mac. Start it only if stopped. `apps/api/start-preview.sh` sets upload limits; starting the API with different PHP defaults can make previously working inspiration uploads fail.

Environment variables to understand, without recording their secrets:

- API: database connection, `APP_KEY`, `NY_DEMO_API_ENABLED`, mail/notification configuration.
- Portal: `API_BASE_URL`; optional `NY_SIZE_CHART_DATA_DIR`, `NY_STUDIO_DATA_DIR`; host variables described below.
- Mobile: `EXPO_PUBLIC_API_BASE_URL` for Laravel and `EXPO_PUBLIC_SIZE_GUIDE_BASE_URL` for published sizing. Verify references before changing; public Expo variables must not contain secrets.

For a phone, use the current Mac LAN address on the same Wi-Fi. `127.0.0.1` on the phone refers to the phone. Restart Expo after changing its environment configuration. Expo Go previews require compatible SDK/native modules; follow the mobile app instructions.

### Checks

Choose tests for the changed behavior; passing these historical commands is not a claim that a later change was verified.

```sh
# Portal, from apps/portal:
npx tsc --noEmit
npx eslint <changed-files>
node --experimental-strip-types --test src/lib/order-desk.test.mjs src/lib/studio-dialog-history.test.mjs
NY_STAFF_PREVIEW=1 npm run build
```

`NY_STAFF_PREVIEW=1` builds into ignored `.next-staff-preview/`, so it does not overwrite the active development server's `.next/` output. Use matching environment settings if serving that build. Read `next.config.ts` before changing output locations or preview modes.

```sh
# API, from apps/api; tests use the isolated test database:
php artisan test --compact tests/Feature/OrderSourceTest.php tests/Feature/DemoStaffOrderTest.php tests/Feature/DemoStudioSaleTest.php tests/Feature/DemoOrdersTest.php
vendor/bin/pint --dirty --format agent
```

```sh
# Customer app, from apps/mobile, when mobile code changes:
npx expo lint
npx tsc --noEmit
```

Use app-specific instructions for Expo/version documentation, additional checks and release builds. No new dependencies are required for the current handoff.

### Latest verification evidence

- Order-source / Settings work: **24 API tests, 190 assertions; 8 portal business/history tests; TypeScript and ESLint; production build passed**. New migration applied locally. Browser confirmed Sales history menu, Back behavior, source column/filter and source details.
- Earlier Studio readiness pass: **19 portal tests plus 34 API tests** and production build passed at that point. Do not add these to the latest count as if they were one fresh complete-suite run.
- Browser audit covered the six screen sizes listed above, product Back/Forward, fitting/custom fields, Settings, photo-preview Back, nested Sales Desk/customer/checkout Back, draft recovery and phone/desktop layout differences.
- No actual payment was recorded during UI verification. API sale tests ran in isolation.
- Actual iPhone/iPad Safari edge-swipe feel, software keyboard, safe areas and Add to Home Screen behavior still need physical-device acceptance. Responsive browser screenshots do not certify those OS behaviors.
- Preview screenshots are local ignored evidence in `apps/portal/.local-previews/`, including `studio-settings-sales-history.jpg`, `office-order-sources.jpg`, `studio-audit-tablet.jpg`, `studio-audit-desktop.jpg` and `studio-audit-phone-checkout.jpg`. They are not authoritative design source files or production assets.

## 10. Release boundaries and next work

Maintain [IMPLEMENTATION_GAPS_CHECKLIST.json](IMPLEMENTATION_GAPS_CHECKLIST.json) as the detailed backlog. Do not silently mark it all complete because the UI works.

### Agreed near-term sequence

1. Finish physical-device acceptance of Studio across phone/tablet and normal desktop review.
2. Inspect the authorized WordPress site and import approved catalogue content. Confirm whether WooCommerce or another plugin holds products; do not assume an integration already exists. Map original IDs/SKUs, gender, garment type, prices, variant colours/fabrics/sizes, stock and photographs carefully. Confirm actual stock/measurements rather than importing visual placeholders as facts. Preserve the existing live website while preparing the development import.
3. Select hosting for the Next.js app, Laravel API, PostgreSQL and durable private media/chart storage. Studio can launch before the Office UI, but it still needs its shared backend and database.
4. Connect `studio.thenyatelier.com`, HTTPS, staff accounts and backups/restore arrangements; validate a controlled team pilot. Office rollout follows on the shared system.

The user now reports Cloudflare domain access. WordPress admin access is also reported. DNS management, website hosting, app hosting and WordPress admin are separate pieces; do not assume a DNS record alone deploys this application.

### Subdomain implementation already present, not live

`src/lib/workspace-hosts.ts` supports the following portal server variables **together**, or none for local development:

```dotenv
NY_OFFICE_ORIGIN=https://office.thenyatelier.com
NY_STUDIO_ORIGIN=https://studio.thenyatelier.com
NY_STAFF_COOKIE_DOMAIN=thenyatelier.com
```

These are intended public origins, not evidence that DNS/hosting is configured. The code requires both valid HTTPS workspace origins and the cookie domain. Do not turn on only one variable. A Studio-first deployment must deliberately accommodate the Office link/host and user permissions rather than partially configuring this contract.

Role-aware switching and parent-domain secure cookies are implemented, but must be tested on the eventual hosting/proxy configuration. Protect every subdomain receiving a shared cookie; the production proxy must set trustworthy forwarded host/protocol headers. Separate Safari/PWA containers or browser profiles may need an initial sign-in of their own.

### Other important unfinished areas

- Production customer identity, authorization/isolation, recovery and cross-device profile/measurement sync.
- Customer checkout, server-calculated charges, outsourced payment provider, verified callbacks, reservations, refunds/exchanges, reconciliation and Studio daily closing. No Stripe/Paystack/provider is selected or connected merely because discussed.
- Real email/SMS/push delivery, worker operations and delivery auditing. Existing configured/logged notification behavior is not live delivery. The agreed direction is in-app plus email, with SMS when the customer has no email; do not invent an automatic email-failure fallback rule.
- Production staff onboarding/recovery and unique credentials; review preview/demo routes and sample financial labels before live use.
- Durable shared hosting for chart JSON and private uploads, backups with a restore test, monitoring and operational ownership.
- Portable hosted salary scanning, complete shared bills/expenses, financial reconciliation and fuller production/material management.
- Business-rule gaps such as formal measurement approval, designer/tailor workspaces and broader staff account administration must be checked against the plan and current gates before being claimed complete.

## 11. User collaboration preferences

- Prefer action and concrete reviewable results once a change is authorized. Avoid repeatedly asking permission for the same agreed work.
- When the user explicitly asks “tell me you understand before implementing,” first restate the behavior and wait for their go-ahead. Do not treat that message itself as implementation permission.
- Reuse the existing design, cards, icon system and fonts. Keep explanations clear and nontechnical unless details help.
- Preserve earlier steering when a new message adds a constraint. The most recent correction is that Studio must be ready for **all** screen sizes before release.
- Keep progress updates concise during sustained work. At completion, report what changed, how it was verified and any meaningful limitation.
- Do not deploy, send external messages, charge payments, reset data or alter live WordPress content merely because a future-work document mentions those tasks.

## 12. Keeping this guide trustworthy

Update only the facts changed by the current task and add evidence to the work log. If a statement cannot be verified, label it as a proposal, user report or pending check. Keep this guide focused enough to read without consuming an entire coding session; put task-specific detail in the work log or existing feature docs. Never replace implementation evidence with optimistic completion claims.
