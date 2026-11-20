# NY Studio and NY Office staff web app

This Next.js application contains both staff workspaces. **NY Studio is not the Expo customer app.** Studio and Office share Laravel/Sanctum authentication, PostgreSQL records, the NY design system and protected Next.js route handlers.

Read the [shared implementation/design handoff](../../docs/AI_HANDOFF.md) and [latest work log](../../docs/WORK_LOG.md) for the current system, exact design/layout rules, feature map and release boundaries. Follow the local `AGENTS.md` before changing Next.js code.

## Current workspace behavior

- `/showroom`: responsive phone/tablet/desktop Studio with a photographic welcome, Fittings and Ready-to-Wear.
- `/office/{role}`: role-correct Office. Owner, manager and receptionist retain their assigned permissions; changing a URL cannot change a role.
- `/staff/sign-in`: shared Laravel-backed staff login; eight-hour sessions. Install app and Sign out are inside account/Settings menus.
- Studio Settings contains Install app, Sales history, Open NY Office and Sign out. Its profile identity sits directly on the light background with rope-framed initials.
- On phones, the compact bottom module dock gains a separate circular cart button only when the sale has items. It opens a full-screen Sales Desk; the sale is not stacked below the catalogue. Wider screens retain the side-by-side sale panel.
- Fittings support inch entry/display, optional/removable preset fields, direct custom label/value entry, private image/video inspiration uploads and dated/grouped history.
- Office has connected orders, consultations, customers, catalogue/stock/collections, salary records and team directory. Production/material inventory and parts of accounting remain unfinished.
- All orders and order details show saved source: Studio, Office, Customer app, or Not recorded for unknown older origins. Customer-app checkout is still pending.

## Shared storage boundaries

The catalogue is persisted by Laravel in PostgreSQL (`studio_catalogues`), with revision conflict handling. The ignored `.studio-data/catalogue.json` can initialize an uninitialized catalogue; it is not the ongoing shared authority.

Published size charts still use `.studio-data/size-charts.json`, or `NY_SIZE_CHART_DATA_DIR`. This needs durable/shared storage when hosted. Customers, fittings, completed POS sales, receipts and orders use the API; protected fitting media is served through authenticated handlers. Some bill/account drafts remain browser-local. Never infer financial profit from recorded sales alone.

## Local run and checks

With the API/database already running, from this directory:

```sh
npm run dev -- --webpack --hostname 0.0.0.0 --port 3000
```

Use existing environment configuration. `API_BASE_URL` defaults to Laravel on loopback port 8000. Inspect running listeners before starting a second server.

```sh
npx tsc --noEmit
npx eslint <changed-files>
node --experimental-strip-types --test src/lib/order-desk.test.mjs src/lib/studio-dialog-history.test.mjs
NY_STAFF_PREVIEW=1 npm run build
```

The alternate build directory is ignored and separate from active development output. Use matching environment configuration if serving that build.

## Design, installation and release

Reuse `globals.css`, `showroom/showroom.css`, shared icons, `StatusBadge`, Alfa Slab One and Josefin Sans. Main Studio gutters are 10px plus safe areas; Settings internal padding is 20px and welcome has its own wider spacing. Respect reduced motion and browser Back.

The shared service worker caches a generic offline notice only, never private records. Staff actions need network access. Install manifests do not establish production hosting, offline record sync or shared login across separate browser containers.

The user now reports Cloudflare domain access, but hosting and public subdomains remain unconnected. `workspace-hosts.ts` requires `NY_OFFICE_ORIGIN`, `NY_STUDIO_ORIGIN` and `NY_STAFF_COOKIE_DOMAIN` together for HTTPS subdomain switching. Read the handoff before configuring a Studio-first rollout. Do not assume a local preview gateway is a live tunnel or deployment.

Actual iPhone/iPad Safari gesture, keyboard and installed-PWA acceptance remains a release step. Customer electronic payment processing and live external message delivery are not connected. Preserve the current records and do not reseed to repair a UI.
