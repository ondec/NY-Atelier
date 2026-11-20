# NY Atelier codebase

NY Atelier has three connected applications: a customer Expo app, one Next.js staff web app containing NY Studio and NY Office, and a shared Laravel API/PostgreSQL database.

**Start with the [current implementation/design handoff](docs/AI_HANDOFF.md) and [latest work log](docs/WORK_LOG.md).** They replace the outdated initial-prototype descriptions and provide the complete module map, design decisions, permissions and limitations. Root `AGENTS.md` and `CLAUDE.md` point both coding assistants to the same guide.

## Stack

| Application | Stack |
| --- | --- |
| Customer app — `apps/mobile` | Expo SDK 58, React Native 0.88.1, React 19.3, Expo Router, TypeScript |
| Staff web app — `apps/portal` | Next.js 16.4.6 App Router, React 19.3, TypeScript, application CSS |
| API — `apps/api` | Laravel 13.39, Sanctum staff authentication, PHP |
| Database | PostgreSQL 17 for local development; isolated SQLite for backend tests |

Use lockfiles and the handoff for exact installed versions. Studio is a responsive installable web app for phone, tablet and desktop, separate from the customer Expo app.

## Connected now

- Staff login, eight-hour sessions, role-correct Office/Studio switching and server-side permissions for owner, manager and receptionist.
- Shared customer records, dated garment fittings, additional/removable measurements, protected inspiration photos/videos and grouped fitting history.
- Shared consultations and order workflows, service-specific order desks, source tracking and an informative owner overview.
- Shared catalogue, variants, stock movements, collections and manually confirmed Studio POS sales/receipts.
- Product/collection size-chart publishing and a reusable context-aware customer Size Guide.
- Salary approvals/payout records and a team directory, with some finance and production work still incomplete.
- Customer Home/Shop/Atelier/Orders/Account interfaces. Customer identity and parts of account persistence remain a demo/device-local foundation.

The current database contains seeded examples and subsequently added development records. Preserve it. Customer registration/checkout, electronic payment processing, live external notifications, production hosting and store releases are not complete. Recording a Studio payment does not move or independently verify money.

## Local operation

Inspect existing listeners before starting duplicates. PostgreSQL, API 8000, portal 3000 and Expo 8081 were running at the 20 November 2026 handoff.

Run in separate terminals, from this directory:

```sh
cd apps/api
composer run preview
```

```sh
cd apps/portal
npm run dev -- --webpack --hostname 0.0.0.0 --port 3000
```

```sh
cd apps/mobile
npx expo start --lan --port 8081
```

The staff app's local entry points are `/staff/sign-in`, `/showroom` and `/office/{role}` on port 3000. The customer web preview uses Expo's port 8081. Same-Wi-Fi device testing uses the development Mac's current LAN address, not the phone's `127.0.0.1`.

Existing `.env` files are local and must not be overwritten or committed. Portal `API_BASE_URL` points to Laravel. Mobile `EXPO_PUBLIC_API_BASE_URL` points to Laravel and `EXPO_PUBLIC_SIZE_GUIDE_BASE_URL` points to the portal sizing endpoint. Never put secrets in public Expo variables.

For a fresh machine, install locked dependencies using `composer install` in the API and `npm ci` in each front end, configure the appropriate PHP/Node/PostgreSQL versions and local environment, then inspect migration status. On this existing project, apply new migrations deliberately; do not regenerate `APP_KEY`, run database reset commands or seed over the user's records as routine setup.

## Verification

Use the narrow tests appropriate to a change; see the handoff for tested commands and dated results.

```sh
# apps/portal
npx tsc --noEmit
npx eslint <changed-files>
node --experimental-strip-types --test src/lib/order-desk.test.mjs src/lib/studio-dialog-history.test.mjs
NY_STAFF_PREVIEW=1 npm run build
```

The alternate production-build directory avoids overwriting the active development server output.

```sh
# apps/api
php artisan test --compact tests/Feature/OrderSourceTest.php tests/Feature/DemoStaffOrderTest.php tests/Feature/DemoStudioSaleTest.php tests/Feature/DemoOrdersTest.php
vendor/bin/pint --dirty --format agent
```

```sh
# apps/mobile, after customer-app changes
npx expo lint
npx tsc --noEmit
```

## Continue and hand over

Read the app-specific instructions before changing framework code. Update [WORK_LOG.md](docs/WORK_LOG.md) before handing to the other assistant and update changed facts in [AI_HANDOFF.md](docs/AI_HANDOFF.md). The repository includes a portable `docs/` snapshot. In the full local project, `../docs/` remains the live shared handoff; consult it first and refresh the tracked snapshot before publishing another checkpoint. Standalone clones maintain `docs/` directly.

Studio is the first planned release, across all screen sizes. WordPress catalogue import, physical iPhone/iPad Safari acceptance, hosting/HTTPS, durable storage/backups and domain setup remain ahead. Office can launch later while using the same API/database. No domain or temporary tunnel should be assumed live from a previous session.
