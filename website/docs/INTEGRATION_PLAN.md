# Integration plan & development boundaries

## Scope approved by project owner (23 November 2026)

Build a new custom-coded NY Atelier public website alongside the existing client app and staff portal. Leave all current live sites untouched. Do not deploy the new website yet. Keep website code in a separate GitHub branch when working in the actual repository.

Proposed branch (subject to repository inspection): `feature/ny-atelier-website`.

## Current implementation state

The current starter uses React 19, React Router and Vite (JSX), with local mock product data. There is no data synchronization. The repository/architecture of the linked Codex thread `codex://threads/01a1a475-d951-75e2-8cc5-8bced18f3dff` has not been directly inspected here. Do not assume an API, framework, database, schema, or branch already exists.

## Suggested future architecture (not yet committed)

```
                             NY Atelier business data
                       (existing portal's verified backend)
                                    ^
                       Authorized API/data contracts
                      /             |                \
              Public web        Client app        Staff portal
        product browse/RTW   customer journeys  permissions/admin
```

- **Catalog:** only public product data, inventory status, photos, and size options exposed with customer-safe API permissions.
- **Orders:** separate RTW, custom, and alteration tickets in the shared domain model; website must not invent or advance staff-only workflow states.
- **Appointments:** website can initiate requests, but manager/receptionist approval and calendar conflict rules must be enforced on the server.
- **Customers:** guest checkout and optional accounts are part of the approved design direction but identity and linking rules need validation before production.
- **Payments:** GHS base prices and locally appropriate mobile-money/card options are supported at the design level only. Never trust client-side totals.
- **Assets:** migrate to verified NY Atelier photos, accessible alt text, optimized local/CDN assets, authentic final logo.
- **Security:** server-side validation, authentication, authorization and audit logging before connecting any customer or financial records.

## Suggested next technical steps

1. Examine existing GitHub repository's package manager, frontend framework, shared types, auth and API layer.
2. Establish branch from agreed upstream base without disturbing the current staff portal branch.
3. Place storefront under the repo's existing conventions, e.g. `apps/website`, only if compatible.
4. Review the React components against the existing app/portal framework and data model; connect read-only product endpoints first.
5. Validate responsive experience, product detail pages, analytics/privacy, SEO, accessibility and performance.
6. Keep a deploy-blocking guard in CI/CD until a separate explicit authorization to deploy.
7. Create a pull request for review, with a staging/prototype plan separate from any production domain cutover.

## Outstanding verification

- True men/women product inventory and which items belong to which collection.
- Approved images, logo, size chart and product descriptions.
- Actual staff portal repository and APIs.
- Whether the new website replaces both existing sites or consolidates under one domain later.
- Guest checkout versus account linking and appointments.
- Shipping policies, stock reservation, taxes, refunds and complete legal/policy content.

**Never infer that a design interaction is a live integration.**
