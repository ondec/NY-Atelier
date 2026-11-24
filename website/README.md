# NY Atelier — React JavaScript Website

A **React 19 + Vite + React Router** JavaScript/JSX starter for the new NY Atelier public-facing website. This is a development-only prototype, **not the live site**.

## Approved navigation

- **Services** `/services` — bespoke, styling, wardrobe and related offerings
- **RTW Store** `/rtw-store` — All, Men, Women and **Collections** live inside the store
- **Contact** `/contact` — includes **Consultations** at `#consultation`

The NY Atelier logo links to **Home** `/`. **Discover Us** `/discover-us` is available from the Home feature and footer; the former `/our-story` path redirects there.

## Requirements

- Node.js 20.19+ or 22.12+ recommended
- npm

## Setup on your Mac

Place the contents of this folder at:

`/Users/benjaminanane/Documents/Stacks/Ny Atelier/codebase/website`

Then run:

```bash
cd "/Users/benjaminanane/Documents/Stacks/Ny Atelier/codebase/website"
npm install
npm run dev
```

Open **http://localhost:5173**. Nothing is deployed when you run this command.

To verify and build for a private local preview:

```bash
npm run check
npm run build
npm run preview
```

The build output will be in `dist/`. Do **not** publish that folder until deployment is approved.

## Architecture

```text
website/
├── index.html              Vite entry HTML
├── package.json            npm scripts and React dependencies
├── vite.config.js          Development server configuration
├── public/images/          Local brand-agnostic fallback illustration
├── scripts/check-project.mjs
├── docs/                   Source/integration guidance
└── src/
    ├── main.jsx            React root and Router
    ├── App.jsx             Routes, components and local demo interactions
    ├── catalog.js          Sample catalogue (not live)
    └── styles.css          Responsive NY Atelier design system
```

## Current capabilities

- Responsive editorial homepage, three-slide hero and brand storytelling
- Client-side routing with React Router
- RTW category filters, search and price sorting
- Product detail route with size selection, quantity and add-to-bag confirmation
- Wishlist and bag persisted **only in local browser storage**
- Non-transactional, four-step demonstration checkout
- Contact page with a non-submitting consultation form
- Responsive desktop/tablet/mobile navigation, semantic buttons and basic accessibility labels

## Not integrated / not deployed

The site currently has **no connection** to the staff portal, mobile app, backend, CMS, customer accounts, live inventory, orders, payment gateways, or appointment system. Sample product images are linked temporarily to NY Atelier-owned websites; image URLs may go stale. Names/prices/categories need final business confirmation. No actual purchase, payment, order or booking occurs. No automated Git operations or deployment.

For implementation later, first inspect the actual staff portal repository, API contracts and permissions. Only then connect it to shared services using secure production APIs. Do not expose staff-only tables or application credentials to the public browser.

## Git workflow (not executed)

Once your real repo has been inspected and the working tree is clean, create a separate branch, suggested `feature/ny-atelier-website`. No branch creation, push, merge, or remote deployment has been done here.

Brand: Deep Petrol `#123C45`, Raw Silk `#F6F3EC`, Saddle Cognac `#A85C32`, Brushed Brass `#C5A059`, Charcoal `#1C2326`, Sage `#7A8B7B`. Josefin Sans with a provisional editorial serif. See `docs/` for source references and integration considerations.
