# NY Atelier — technical stack decision and options

> **Historical stack decision and options, dated 3 November 2026.** For the implemented stack, installed versions, current module status and run commands, use [AI_HANDOFF.md](AI_HANDOFF.md). The provider options and prices below are dated research, not a current hosting recommendation or a claim that any provider is connected. Reverify them before a hosting decision. The codebase now exists and staff authentication is implemented.

Status: **Expo/React Native/TypeScript app, React/Next.js staff portal, Laravel API and PostgreSQL selected for the prototype; production hosting remains open**  
Updated: 3 November 2026

## What the stack must support

- One client app for iPhone and Android, plus a responsive staff portal.
- The same customers, appointments, orders and garment updates in both interfaces.
- Three order categories: Ready-to-Wear, Alterations and Custom/Bespoke.
- Multiple garments and wearers per custom order, versioned measurements and staff approvals.
- Specific permissions for owner, manager, receptionist, designer and tailor.
- A connected prototype using fictional records, with real payments and messaging deferred.

## Front end direction

The user selected **Expo + React Native + TypeScript for the iPhone/Android customer app** and **React with Next.js for the web portal**. The current project plan includes a responsive staff portal; a future customer website can use the same web framework when that work begins. Expo supports phone demonstrations during development, subject to Expo Go's supported native libraries and device/network setup.

TypeScript is an agreed application-code choice, not an Android requirement. React Native supports JavaScript too. TypeScript can check the shapes of orders, measurement versions, approval events and role permissions. The same React Native application targets Android and iPhone; TypeScript is transformed during bundling. Native device modules can still be written in platform languages when needed.

Share business types, validation and design tokens where useful. The backend decision can be made separately from these front end choices.

## API and live updates

GraphQL and WebSockets can be used with any of the PostgreSQL hosting options below. They answer different questions: **GraphQL describes how clients request and change data**, while **WebSockets keep a two-way connection open for live events**. Neither replaces the database, authentication, permissions or backend business rules. GraphQL subscriptions may use a long-lived connection, but add their own server complexity.

For the first connected prototype, propose a small authenticated HTTP API with clear operations for orders, appointments, measurements and approvals. GraphQL becomes attractive if the app and staff portal repeatedly need different, deeply nested views of an order that are awkward to serve through that API. Add WebSocket updates where immediacy matters, such as a staff approval queue or an open order tracking screen. Persist and authorize every change through the API and database; a socket event only tells a client to refresh or displays a confirmed update. This keeps live updates optional and avoids treating a dropped connection as the source of truth.

## Backend options

Costs below are provider prices as published on 3 November 2026, before any taxes, payment processing, messaging, extra hosting, usage overages or engineering time. They are **not comparable all-in quotes**.

| Option | Published starting cost | Fit and ongoing responsibility |
| --- | --- | --- |
| Laravel API + PostgreSQL | **US$0 software license**; local development can cost US$0. Hosting, database, file storage, backups, email and payment processing may cost money. | Strong fit for explicit order and approval workflows. Laravel provides migrations, authorization policies, API/mobile authentication through Sanctum, file storage options and a first-party WebSocket server (Reverb) if needed later. The backend is PHP while the mobile app is TypeScript, so the team maintains two languages. |
| TypeScript API framework, e.g. NestJS, + PostgreSQL | **US$0 software license**; infrastructure costs are similar to Laravel for the same hosting pattern. | One language across app, portal and API if the portal also uses TypeScript. Authentication, data access and file storage need to be assembled from selected packages and maintained. A good choice if the team is strongest in TypeScript. |
| Managed Supabase: Postgres, Auth, Storage, functions | Free tier for a prototype; Pro starts at **US$25/month** for production, with usage limits and possible extras | Fastest route to a connected app and portal. Relational data fits the order and approval model. Access rules, backups and platform-specific code still need care; hosted service creates a dependency. Free projects pause after inactivity. |
| Firebase Auth + Firestore + Storage/Functions | Free quotas; then usage-based charges, including document reads, writes, storage and network usage | Strong mobile tooling, but Firestore's document model and read-based billing are a less natural fit for linked orders, garments, measurement history and approvals. Moving the data model to Postgres later would require a larger migration. |

PocketBase is another compact self-hosted option, but it is a single-server SQLite system maintained as a volunteer project without a support commitment. For this order and staff workflow, it is less suitable as the default long-term foundation than standard Postgres.

**Database hosting is a separate choice from API framework.** Laravel or NestJS can use local PostgreSQL for a free prototype, a free managed tier such as Neon within its limits, a paid managed database, or PostgreSQL on a server NY Atelier operates. Neon currently lists 1 GB of storage and 100 compute-unit hours per month on Free; its usage-based Launch plan shows US$15/month as a typical example, not a guaranteed bill. Add API, web, storage, backup and operations costs before comparing hosting paths.

## Selected backend and cost path

Use **Laravel as a dedicated API with PostgreSQL** for orders, garments, measurements, appointments, customer accounts and staff approvals. Use Laravel policies to enforce role and record access, and Sanctum for web-session and mobile-token authentication. Keep payment callbacks and approval transitions on the server. Laravel is open source and can run on different hosts; PostgreSQL can move between local, managed and self-hosted environments. The app and web portal communicate through documented API contracts rather than direct database access.

For the first prototype, run Laravel, PostgreSQL and Next.js locally and preview the app through Expo Go. That has no required software or cloud subscription fees. Expo Go can open a development project on a phone by QR code; a device normally needs network access to the development computer. For a remote demonstration using fictional data, a free hosted API and free managed Postgres are possible within provider limits: Render offers free web services, and Neon offers a free Postgres tier. Render free services sleep after 15 minutes of inactivity, take roughly a minute to wake, and lose local files on restart; its free Postgres databases expire after 30 days. Keep demo records in the external database and use bundled images; uploaded files would require external storage. Verify limits before relying on a hosted demo. Expo's free service tier also has build/update quotas.

For production, prepare a complete monthly estimate for API/Next.js hosting, database, file storage, backups, email, payment fees and monitoring. A single modest server may be cheaper in provider fees as usage grows, but it requires patching, backups, restore tests and an operator. Managed services reduce that work but can charge more. **There is no responsible promise of US$0 operation at unlimited scale.** Laravel Cloud itself is optional and currently starts at US$5/month plus usage after its first-month offer; Laravel does not require it. Avoid assuming a free web host is valid for business production: for example, Vercel Hobby is restricted to personal, non-commercial use.

This recommendation adds PHP to the TypeScript front ends and requires us to build and maintain an API. It avoids tying the business rules to a backend vendor and gives us a clear route from a free local prototype to paid hosting only when needed. Supabase remains an alternative if faster backend setup later outweighs the service dependency and price.

Before any real customer data is used, enforce permissions on the server, define backup frequency and recovery targets, and test restores. The prototype should use fictional customers and simulated payment states.

## Folder boundary

All app, portal and backend code belongs under the approved separate `codebase/` folder, outside `docs/` and `Logo/`. If the portable API direction is selected, a possible layout is:

```text
codebase/
  apps/
    mobile/
    portal/
    api/
  packages/
    shared/
  database/
    migrations/
    seed/
```

This is a layout proposal, not a created codebase.

## Remaining implementation choices

1. Reassess GraphQL and WebSockets against the first working order and approval flows; Laravel Reverb is an option for live updates.
2. For a hosted pilot, estimate complete costs at expected usage and decide who owns service accounts and maintenance. Production hosting can be selected after the local prototype if it does not change the chosen data contracts.

## Official references

- [Expo app setup](https://docs.expo.dev/tutorial/create-your-first-app/)
- [Expo Go development preview](https://docs.expo.dev/get-started/start-developing/) and [Expo free-plan limits](https://docs.expo.dev/billing/plans/)
- [Next.js setup](https://nextjs.org/docs/app/getting-started/installation)
- [React Native TypeScript and JavaScript support](https://reactnative.dev/docs/typescript)
- [Laravel MIT license](https://github.com/laravel/framework), [database support](https://laravel.com/framework/docs/13.x/database), [Sanctum authentication](https://laravel.com/framework/docs/13.x/sanctum), [authorization policies](https://laravel.com/framework/docs/13.x/authorization), [file storage](https://laravel.com/framework/docs/13.x/filesystem), and [Reverb WebSockets](https://laravel.com/framework/docs/13.x/reverb)
- [NestJS license and TypeScript support](https://github.com/nestjs/nest)
- [Render free-service limits](https://render.com/docs/free), [Laravel Cloud pricing](https://laravel.com/cloud/pricing), and [Vercel Hobby restrictions](https://vercel.com/docs/plans/hobby)
- [GraphQL queries](https://graphql.org/learn/queries/) and [subscriptions](https://graphql.org/learn/subscriptions/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Supabase pricing](https://supabase.com/pricing)
- [Supabase self-hosting responsibilities](https://supabase.com/docs/guides/self-hosting)
- [Neon pricing](https://neon.com/pricing)
- [Firebase pricing](https://firebase.google.com/pricing) and [Firestore billing details](https://firebase.google.com/docs/firestore/pricing)
- [PocketBase FAQ](https://pocketbase.io/faq/)
