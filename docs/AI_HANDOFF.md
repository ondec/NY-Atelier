# NY Atelier — shared implementation and design handoff

Last verified: **23 November 2026**, Africa/Accra. Maintained jointly by the assistant currently working with Benjamin.

This is the current implementation guide for continuing work in Claude, Codex or another coding assistant. It describes an actively developed local application, not a production launch. Read the newest [work log](WORK_LOG.md) entry after this guide. The older [project plan](PROJECT_PLAN.md) preserves business requirements and historical proposals; its early implementation claims are superseded by this guide where they conflict.

## 1. Quick orientation

- Project folder: `/Users/benjaminanane/Documents/Stacks/Ny Atelier`.
- Git/application root in the full workspace: `codebase/` (the root of a standalone GitHub clone). Original source media and the live shared documents remain in the parent project folder. The repository now includes a portable `docs/` snapshot. In the full local project, consult `../docs/` first and refresh the tracked copy before another push; in a standalone clone, maintain `docs/` directly. Selected application media are included under each app, but private uploads and runtime data are excluded.
- Source repository: [ondec/NY-Atelier](https://github.com/ondec/NY-Atelier), branch `main`. Render is now connected: pushes automatically rebuild/deploy the staff preview. Use `[skip render]` in documentation-only commit messages to avoid an unnecessary deployment.
- Three applications: customer Expo app, Next.js staff web app containing NY Studio and NY Office, and one shared Laravel API/PostgreSQL database.
- **NY Studio is a responsive, installable web app. It is not the customer Expo app.** Studio must work across phones, tablets and desktop, not just mobile.
- Staff authentication and the Studio POS are connected local implementations. Customer authentication, customer checkout and payment-provider processing remain unfinished. **Customer passwordless sign-in is paused (2026-11-21), and its file locks are released. The current priority is hosting NY Studio for staff testing. See the latest [work log](WORK_LOG.md) entry.**
- Latest pushed application work (23 November, `48c7e0e`, live per Claude): staff password reset and verified Studio/Office subdomains, following customer-search, fitting UX, duplicate checks and photo compression. User reports successful live password-reset acceptance. Codex's WordPress catalogue import is newer LOCAL work and is not deployed. Read the newest work log entries before continuing.
- Current position: protected free Render staff preview, also at [studio.thenyatelier.com](https://studio.thenyatelier.com) and [office.thenyatelier.com](https://office.thenyatelier.com). Physical-device/team acceptance, publishing the locally imported WordPress catalogue and permanent hosting remain follow-up work; do not execute that backlog without the current user request.
- Domain access is available; Cloudflare manages DNS. The user selected **Render, free testing only**. Claude records both staff CNAMEs verified and live, with shared staff cookies configured in `48c7e0e`. No paid resources are authorized. Do not assume earlier temporary preview tunnels still work.
- WordPress source is **rtw.thenyatelier.com / WooCommerce**. User-signed-in export imported locally: 111 published styles, 751 confirmed variations, 550 full image links. New stock is Not counted/unavailable for sale; existing 110 variants and counts preserved. 26 incomplete variations and 14 clothing classifications need review. See the WordPress import section below. R2 setup/copying is paused at the user's request.
- This project contains shared Codex/Claude implementation. Check the current Git status and preserve any uncommitted work. **Do not reset, clean, reseed or replace it to obtain a clean starting point.**

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
| Public website prototype | `website/` (standalone React 19 + Vite; local only, not in Git yet): `src/App.jsx`, `src/styles.css`, `src/catalog.js`, `public/fonts/` |

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
- Full-screen Studio form/Sales Desk back arrows use a 44px circular button with a 1px neutral border; keyboard focus uses a 2px petrol ring with 2px offset. Do not restore the previous rectangular 3px outline (local-only styling change, 23 November).

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
- New customer has **Save customer** and **Save & add measurement** (local-only addition, 23 November). The latter saves once through the existing customer API and opens the new customer's fitting form using the current/default template, in inches. Back returns to the saved profile, not the completed creation form. No fitting is saved until Save fitting is submitted. Office's shared editor keeps its existing save action.
- Fitting templates include Kaftan, Agbada, Suit, long-sleeve shirt, short-sleeve shirt and fitted trousers. Keep top/jacket measurements separate from trouser measurements in saved history.
- Studio entry/display uses **inches**. The shared fitting backend normalizes length data to canonical centimetres. Convert once; preserve explicit unit semantics. Do not relabel existing cm numbers as inches.
- Preset measurement fields can be removed/restored. Green circular + opens a custom label/value field directly; do not restore an intermediate “select a measurement” flow.
- Inspiration photo/video upload appears after measurements and before fitting notes. Current limits: six files, 20MB each, 60MB total; private attachments require staff access. Preserve mobile inline video/range handling.
- Saved inspiration thumbnails/filenames open `FittingMediaViewer` inside the app, never a raw-file tab. It has a circular Back control, contained images/videos, Previous/Next, count and Embla swipe/drag; Studio browser Back/Escape close it with focus restoration. Mobile is full-screen with safe-area padding; desktop is centred. This addition is local-only, uncommitted (23 November). Physical-device touch acceptance remains outstanding.
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

**Staff self-service password recovery (23 November, local-only/uncommitted):** Forgot password? on staff login leads to an email reset request and new-password page. API `StaffPasswordReset` uses Laravel's `staff` password broker and existing reset-token table: one-use, hashed, 60-minute links, 60-second resend throttle and separate request/reset rate limits. Only active recognized staff qualify; generic anonymous responses never disclose accounts or links. Branded mail goes through the configured delivering mailer (Graph on Render); log/array never expose links. Tokens are held in an email fragment and cleared from the browser address bar after reading. A successful reset preserves access, revokes all staff sessions and requires sign-in; deactivation invalidates outstanding recovery links. No new migrations or provider settings. New portal routes are `/staff/forgot-password` and `/staff/reset-password`. Tests passed locally; deploy plus an authorized real-mailbox test remain outstanding. Read the newest work log for exact checks.

| Capability | Owner | Manager | Receptionist | Customer records |
| --- | --- | --- | --- | --- |
| NY Office | Yes | Yes | Yes | No (redirected to Studio fittings) |
| NY Studio fittings: customers, contacts, measurements, fitting history | Yes | Yes | Yes | Yes |
| Studio Ready-to-Wear catalogue and sales (`sales`) | Yes | Yes | Yes | No |
| Consultations, order read, create alterations | Yes | Yes | Yes | No |
| Production/order management | Yes | Yes | No | No |
| Catalogue management | Yes | Yes | No | No |
| Finances | Yes | Yes, with role limits | No | No |
| Team / invitations / owner-only reporting | Yes | No | No | No |

API role id for customer records is `records` (`['studio','customers']`). Its home is `/showroom?view=fittings`; `officeHref` points there too, so sign-in/activation land correctly. `/api/demo/staff/customers*` is the only staff API group outside `can:staff.office`; Studio catalogue/sales routes require `can:staff.sales`; `/api/staff/auth/me` requires `can:staff.studio`. In Studio the role never fetches the catalogue, sees no Ready-to-Wear/Sales Desk/Sales history, and typed `view=collection` URLs are rewritten to fittings.

**Team invitations (owner only):** NY Office → Team → Invite staff (name, email, role: manager, receptionist or customer records; owners are never created from the web). `App\StaffInvitations` reuses `staff_activation_tokens` (one hashed, one-use token per account, 72 hours, `NY_STAFF_INVITATION_HOURS`) and the existing `/staff/activate` page. Inviting a still-pending email may correct its name/role; active accounts and owner accounts are refused (409) and never changed. Resend replaces the previous link. Setup links use `NY_STAFF_PORTAL_URL`, else Render's `RENDER_EXTERNAL_URL`, else `http://127.0.0.1:3000`. Email goes out only when `MAIL_MAILER` is a delivering mailer; with `log`/`array` nothing is mailed or logged and the owner gets the link on screen to share privately (also shown if sending fails). The `microsoft-graph` mailer (`App\Mail\MicrosoftGraphTransport`) sends MIME over HTTPS with client-credentials using `MICROSOFT_GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET/SENDER`. Microsoft side is configured (23 Nov): Entra app "NY Atelier Staff Mail", Exchange scope "NY noreply only" with Application Mail.Send, verified InScope True. `render.yaml` selects this mailer; tenant/client IDs and secret must be entered in the Render dashboard.

Source of truth: API `app/StaffAccess.php` and gates in `AppServiceProvider.php`; portal visibility in `src/lib/staff-permissions.ts`. Changing a URL or Office role segment must not change the authenticated role. Planned designer/tailor accounts and finer manager-only approvals are not implemented simply because the historical product plan lists them.

The API has local Laravel skills in `.agents/skills/` and `.claude/skills/`, and `.mcp.json` defines the Laravel Boost server as `php artisan boost:mcp`. Tool availability differs by assistant; use the existing app instructions and a documented CLI fallback when a tool is unavailable.

Three temporary staff accounts have been provisioned with user-supplied aliases. Credentials intentionally are not reproduced here. Ask the user/use their secure credential source when needed. Do not reset credentials, print session cookies, or create another owner to bypass a login problem.

Provisioning/activation entry point: API `staff:invite` Artisan command; inspect `--help` and its implementation before use. Team invitations are implemented; self-service password recovery is implemented locally but awaits deployment/mailbox acceptance. Replacement of preview credentials and production onboarding review remain outstanding.

Customer auth is a separate unfinished task. Demo customer routes are not suitable as the production customer security boundary.

### Free Render staff preview

- `render.yaml` manages one **Free** Frankfurt Docker web service and a **Free** PostgreSQL 17 database. The Hobby workspace has no card on file; billing showed $0 on 23 November. Paid resources are not authorized.
- Studio: `https://studio.thenyatelier.com`; Office: `https://office.thenyatelier.com`. Claude verified DNS/HTTPS and deployed the shared cookie/origin settings in `48c7e0e`; the built-in `https://ny-atelier-preview.onrender.com/showroom` URL also remains usable. Root/WordPress records were preserved. Separate browser/PWA sessions still need device acceptance.
- `deploy/render/Dockerfile` builds Next standalone from the monorepo, preserving shared mobile data imports. Shared consultation types are in the runtime-independent `apps/mobile/src/lib/consultation-types.ts`; do not import React Native runtime modules into the portal. Next listens publicly on Render's port; Apache/Laravel listens only on loopback 8080. The database rejects all external IPs. `/healthz` checks both app processes.
- Startup migrates without seeders. `staff:bootstrap-preview` requires the explicit preview flag and platform-supplied emails/password, creates missing configured staff only and never resets existing passwords/roles/active status. The application key is a persistent platform-generated secret, prefixed for Laravel at startup. Local and hosted passwords are separate; keep credentials out of Git and these documents.
- The user authorized copying existing customers/fittings and keeping new uploads enabled temporarily. The private snapshot is outside Git in `~/NY-Atelier-render-private/`. Render mounts `ny-customer-copy.1` and `.2` under `/etc/secrets/`; startup joins them into a mode-0600 temporary file and runs the preview-only restore command. Two parts are necessary because BuildKit limits each secret to 500 KiB even though Render permits 1 MB in total. No private data is built into the image or published in GitHub.
- The copied records are **two customers, one fitting and one original attachment**. The importer runs only into an empty database, repairs ID sequences, uses a persistent import marker to avoid recreating deleted customers, and preserves existing hosted edits. Missing ORIGINAL media is restored only while its original attachment/fitting still exists. This is a one-time test snapshot, not general media storage or a backup system.
- Free web services sleep after 15 idle minutes. **New uploads and published chart files remain ephemeral** and can disappear on restart/deploy/sleep; the user explicitly accepted this for now. The free database expires **23 December 2026**, has no automatic backups and must not be treated as permanent storage. The local originals remain intact.
- Consultation/owner-overview proxy timeouts are 20 seconds to tolerate the free instance. Consultation polling does not overlap an already pending automatic request. This does not turn the free instance into an always-on production service.
- Native Expo releases, public customer API authentication/checkout, durable new uploads/chart storage, physical-device acceptance and salary scanning remain follow-up work. Staff recovery and custom domains were deployed by Claude and reset acceptance was reported by the user. The Mac Swift scanner cannot run in this Linux container; manual payroll remains available.

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

Latest applied local migration: `apps/api/database/migrations/2026_11_24_200059_add_website_contact_to_consultations_table.php`. Earlier migrations include order source, fitting custom fields/media, staff access, consultation links, shared catalogue and POS tables. Check migration status before updating another environment.

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
2. Review/count the locally imported WooCommerce catalogue and held variations/classifications, then authorize a revision-safe hosted catalogue transfer plus code deployment. Preserve source WordPress content and existing local/hosted stock. The Expo customer catalogue is still separate.
3. Free Render staff testing is running. Arrange durable database/private media/chart storage and backups before permanent use; R2 configuration is paused. Studio still depends on the shared backend/database.
4. Both staff subdomains/HTTPS are live per Claude. Validate role-aware switching, individual staff accounts and backups/restore arrangements in the controlled team pilot.

The user now reports Cloudflare domain access. WordPress admin access is also reported. DNS management, website hosting, app hosting and WordPress admin are separate pieces; do not assume a DNS record alone deploys this application.

### WordPress RTW catalogue: local import, hosted pending

- Source `https://rtw.thenyatelier.com` is WooCommerce. The user approved importing now with stock counts later and keeping full WordPress image links. R2 setup/copying is paused. Source WordPress content was not modified.
- Local catalogue revision **2** contains **111 published styles** (9 original app IDs matched, 102 added), **751 new confirmed variations** and the original **110 variants** unchanged. Existing collections, movements and stock counts were preserved. Missing WordPress counts are `stockVerified=false`, displayed as Not counted and blocked by Studio plus API sales validation. Legacy variants without the flag retain their existing behavior. Office stock adjustments verify counts; pending counts are excluded from sold-out notifications.
- **26 published variations** held: 20 unspecified size/colour, 6 missing prices. **14 styles** imported as Other for clothing-type review. No source SKUs: `WP-RTW-{variationId}` is app-generated. Clothing types inferred only from explicit name keywords; fabrics, collection memberships and size charts were not invented.
- CSV-confirmed variation prices are used; the public Store API returned incorrect zero current prices. Only uniform confirmed prices per style are accepted. Drafts/unpublished rows were excluded. Full galleries/descriptions/source IDs are retained; plain text is rendered safely. All **550** linked image URLs returned HTTP 200/image MIME. An inspected original is 600×700 px, not a guarantee of higher-resolution source media.
- `apps/api/app/WordPressCatalogueImport.php` and local/testing-only Artisan `catalogue:import-wordpress` provide dry-run, row lock, expected revision, private backup and repeat-safe import. See the newest work log for command options. Do not bypass its hosted guard. `../imports/wordpress/2026-11-23/` is private/outside Git and contains source exports, the exact pre-apply backup and reports; do not commit the raw admin CSV or overwrite those backups.
- Import code is deployed (`0d30900`). Hosted transfer is built and deployed (`8de30c2`): NY Office → Ready-to-wear → Products → **Import WordPress products** (owner, Office host) previews and adds only new products/sizes as Not counted from the private `../imports/wordpress/2026-11-23/catalogue-transfer.json`, with a `studio_catalogue_backups` copy and Undo. The owner has not run it on the live site yet. The local catalogue still contains 12 duplicate sizes (an existing counted size plus a Not counted WordPress copy) on matched products; the hosted transfer skips them. Expo customer Shop still has its separate static nine-piece catalogue. WordPress links require the source site to remain available; private fitting uploads remain a separate storage concern.

### Public website prototype — UI design handed to Codex (23 November)

- `codebase/website` is the **new public website**, separate from the existing WordPress site and from the staff apps. It came from a zip the user had another AI build; it is incomplete. React 19, Vite 6, React Router 7; pages Home, RTW Store (+ product detail), Services, Our Story, Contact and Consultation (`/consultation`; old `/contact#consultation` redirects). The Home featured RTW cards read the local shared catalogue; the older fallback `/rtw-store` pages still have a sample catalogue in `src/catalog.js`. Bag/wishlist and checkout remain demonstrations. The consultation form sends real requests to the local Office queue; the general contact enquiry form remains a demonstration.
- **Owner of this folder: Codex**, for visual/UI design, which the user will direct **section by section or page by page**. Claude stays on `apps/` (backend/portal) and will not edit `website/` while Codex holds it. Codex should not edit `apps/` for website work without coordinating in the work log.
- **Run locally only** until the user approves the design: start the Laravel API on port 8000, `cd codebase/website && npm install --ignore-scripts && npm run dev` → http://localhost:5173, and `cd codebase/rtw-store && npm install --ignore-scripts && npm run dev` → http://localhost:5174 (`npm run check`, `npm run build`; delete `dist/` after build checks). Both Vite servers proxy `/api` to the local Laravel service; `VITE_API_URL` can override the base. Do not deploy, publish `dist/`, or commit either site to `main`. When the user approves, it goes to GitHub as **its own branch** (README suggests `feature/ny-atelier-website`) with a live preview; the Render free workspace's 2 custom domains are already used by studio./office., so the preview needs another host/address. Further integration must use public-safe APIs (never staff endpoints or credentials in the browser).
- **Local catalogue integration (24 November):** `GET /api/shop/catalogue` in `apps/api` reads the shared catalogue and exposes product, colour, size availability and collection display data without staff-only fields. It is public, revision-cached and rate-limited. The local row is revision 4 with 111 imported WordPress products, 861 variants and one collection. `rtw-store/src/live-catalogue.js` fetches it for the live RTW views, while `src/catalog.js` remains a check fixture; no sample stock or price fallback is shown when the API fails. The website Home featured cards fetch the same endpoint and link to RTW detail pages. Checkout remains a preview without a trusted server quote, order or payment. The shared catalogue currently lacks explicit section/gender, new-arrival, swatch/group, size-guide and promotion fields; staff editing and later store/app use of those fields remain unfinished. Product image URLs still depend on the WordPress media host. No deployment, commit or push was done.
- **Local website consultation integration (24 November):** `POST /api/consultations` in `apps/api` accepts public website requests with validated visitor contact details, an Accra date/time and a client UUID. It is rate-limited and repeat-safe. The local migration adds nullable source/contact columns to the shared `consultations` table. Website records have `source=website` and no customer account link. The protected NY Office consultation queue and detail display the visitor details; Office can confirm the time, then staff must contact the visitor directly. Website visitors cannot use the Expo customer's reply endpoint, and no email/SMS confirmation or alternative-time response channel exists yet. The enquiry form stays a preview. The migration is local only; nothing was deployed or pushed.
- Already done by Claude: fixed a blank-page crash (one-line `useEffect`s returned values; `window.scrollTo` returns a Promise in current Chromium). Fonts now match Office/Studio from local files in `public/fonts` (Josefin Sans text, Alfa Slab One display headings at about two-thirds of the original light-Josefin sizes; small label h3s stay Josefin; Alfa has no italic so emphasised heading words are upright cognac, brass on dark backgrounds). The font block is at the end of `src/styles.css`. Design tokens already in `:root`: petrol `#123c45`, silk `#f6f3ec`, cognac `#a85c32`, brass `#c5a059`, charcoal `#1c2326`, sage `#7a8b7b`. Keep the NY design language in §5.
- Codex's shared UI pass (24 November) uses the supplied NY monogram beside the full **NY ATELIER** name, plus a selected copy of customer-app NY icons in `website/src/NyIcons.jsx`/`ny-icons.json`. Buttons, icon controls, filters and fields take their pill/rounded treatments from Office, Studio and the customer app. Non-Home pages start with a silk header and deep petrol lockup. On Home, the header is transparent over the photo at the top with a white lockup. It stays transparent throughout the hero and becomes solid petrol only after the hero ends. It hides on downward scroll and slides back in on upward scroll; reaching the top shows it again. Top navigation is **Services, RTW Store, Contact**; Home is reached by the logo and Our Story through the footer. The logo's rope ring rotates briefly on click while the central letters remain still; reduced-motion settings disable the animation. The active navigation item uses a cognac underline on silk and a brass underline on petrol, with no filled selection. `website/scripts/check-project.mjs` enforces the new top-nav order. The announcement strip was removed until there is a real promotion. The Home hero fills the viewport and stays sticky while page content rolls over it; the brand strip has 50px top corners and square bottom corners. Public development-preview labels and the footer back-to-top link were removed; the footer now credits “Powered by Work on dec.” Functional notices still explain that catalogue details are unverified and checkout actions are demonstrations. The consultation page now explains that its preferred time awaits staff confirmation. Desktop and 375px browser reviews covered the routes without horizontal overflow; see the latest work log for checks and limits.
- The footer now uses local WebP backgrounds derived from the two supplied files in `Image Assets/Website Images`: `website/public/images/footer-landscape.webp` on larger screens and `footer-portrait.webp` at widths up to 640px. Its text and links sit on the pale wall above the figures. The copyright and “Powered by Work on dec.” credit are also on the wall. The source PNGs were left untouched; see the latest work log for browser checks.
- The Home hero now uses seven local paired editorial WebPs in `website/public/images/editorial/` (`01`–`07`, `-landscape` and `-portrait`), sourced from `Image Assets/Editorial 4x3/`; the portrait variant is used at widths up to 640px. `src/catalog.js` maps each pair and its alt text. Images cycle every six seconds with a 1.2-second dissolve/slide; previous/next, count and pause/play controls remain available. Autoplay stops in hidden tabs and under reduced-motion preference. A neutral black gradient makes the direct white/brass copy readable, replacing the previous green-tinted hero overlay. Hero copy promotes new ready-to-wear pieces and links to `/rtw-store`; the catalogue itself remains a demonstration. The supplied images include embedded watermark/website lettering, and their generated landscapes may differ in detail from the portraits. See the latest work log for desktop/phone review.
- The Services page's Bespoke tailoring feature now uses `website/public/images/services/bespoke-white-tux.webp`, optimized from the user's exact white tuxedo and bride photo in `Image Assets/Website Images`; see the latest work log. Review newly added files in that folder when selecting imagery for later sections.

### Staff subdomains (deployed by Claude, 23 November)

`src/lib/workspace-hosts.ts` supports the following portal server variables **together**, or none for local development:

```dotenv
NY_OFFICE_ORIGIN=https://office.thenyatelier.com
NY_STUDIO_ORIGIN=https://studio.thenyatelier.com
NY_STAFF_COOKIE_DOMAIN=thenyatelier.com
```

Both origins and the cookie domain were configured together in Render by `48c7e0e`, after DNS/HTTPS verification. `NY_STAFF_PORTAL_URL` points to Studio for invitation/reset emails. Keep these values together; local development can leave the workspace-host variables unset.

Role-aware switching and parent-domain secure cookies are deployed; physical-device and per-role acceptance still matter. Protect every subdomain receiving a shared cookie; the proxy must set trustworthy forwarded host/protocol headers. Separate Safari/PWA containers or browser profiles may need an initial sign-in of their own.

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
