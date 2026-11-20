# Clothing size guide

`SizeGuide` is a controlled, reusable Expo / React Native component in
`src/components/size-guide.tsx`. It uses the NY page background, compact region disclosure and segmented unit
control. Gender and garment charts come from the product; there are no unrelated
chart selectors or measuring-instruction section. Product detail screens pass inventory, sizing metadata, a selected variant
ID and `onSelectVariant`. No regional label is used as a purchase identifier.

## Data sources

- `src/data/size-charts.json` preserves the supplied International Clothing Size
  Guide. These are body references, not finished garment dimensions. Women's
  values are reference points, not fit boundaries.
- `src/data/size-chart-overrides.json` is the approved vendor/product chart registry.
  It is intentionally empty until actual product measurements are supplied.
- `src/data/sizing-data.ts` validates both files at the boundary. The pure types,
  runtime validators, conversion, resolution, selection and recommendation logic
  live in `src/lib/sizing.ts`.

Ghana defaults to S, M, L, XL, 2XL, 3XL. UK/US/EU labels are approximate and retain
their original collar/waist meaning. Measurement units do not rewrite regional
labels. Values stay numeric in their declared source units; only display and
comparison values are converted using exactly 2.54 cm per inch.

## Attach a chart

Set `Product.sizing` to `{ gender, category, chartId?, vendorChartId?, fit? }`.
Categories currently supported are `long-sleeve-shirt`, `short-sleeve-shirt` and `trousers`; genders are
`men` and `women`. Explicit product `chartId` takes priority over `vendorChartId`,
then the generic reference is used if neither ID is provided. An unknown explicit
ID or a mismatched gender/category never silently uses a different chart.

An approved chart registry entry has:

- `id`, `gender`, `category`, `source` (`product` or `vendor`), `unit` (`cm`/`in`)
- `measurementType` (`body`/`garment`), `mode` (`range`/`maximum`/`reference-point`)
- `fit` (`regular`/`slim`/`relaxed`), `required` measurement keys and `rows`
- Each row: canonical `size`, `measurements` (numeric value or `[min,max]`) and
  `labels` (optional GH/UK/US/EU strings)
- Garment charts: `fitAllowance` for every body dimension used in matching,
  expressed in the same unit as the chart. Zero must be explicit if approved.

Supported measurement keys: `chest`, `bust`, `waist`, `hip`, `shoulder`,
`sleeveLength`, `shirtLength`, `inseam`, `outseam`.

For body charts, ranges describe the intended body fit and maximum values define
upper capacities. Reference points alone cannot produce recommendations. For
finished garment charts the conservative range minimum minus approved fit
allowance is the capacity. No allowance is inferred from the word “regular”.
All required and all additional supplied body dimensions must be supported and
fit. The smallest stocked alpha size satisfying them is offered. If a requested
inseam is supplied, only declared stocked lengths are considered, choosing the
shortest that accommodates it. Missing data, invalid input, no fit or no stock
produce distinct explanations. Valid input now updates the shared account measurement record automatically on this device. Previously saved measurements prefill the guide, and selected-size references show the customer’s saved measurements alongside them.

## Inventory and inseams

Existing `color.stock` entries adapt to stable canonical IDs
`productId:colorId:alphaSize`, without fabricating inseam data. Products with
independent waist/length stock should instead provide `color.inventory` entries:

```
{ id: actualSku, productId, colorId, size, stock,
  length: { code: actualLengthCode, value: actualInseam, unit: 'cm' | 'in' } }
```

These values must come from product inventory. The reference L30/L32/L34/L36 list
is never turned into product stock. For length-based inventory, selecting a waist
requires a separate inseam choice before a purchasable variant is returned. Cart
entries retain the actual variant ID, alpha size and optional length; regional
label changes cannot alter the purchased variant. The cart rechecks the variant
and stock quantity before accepting it.

Product metadata now declares the applicable top sleeve style and trouser parts
for each two-piece set. `SizingProfile.parts` can contain long-sleeve and/or
short-sleeve tops plus trousers; each part can supply its own chart IDs and fit.
A single shirt or trouser shows only its own chart. The gender always stays tied
to the product. Set recommendations must accommodate every piece together.

The supplied JSON has no dedicated short-sleeve garment measurements. For short
sleeves, only the same-gender shirt reference's body circumferences are reused,
clearly labeled as body reference. Long-sleeve lengths and collar conversions
are excluded. A specific short-sleeve product/vendor chart takes precedence.

## Verification

`node --test src/lib/sizing.test.mjs`

Also run `npx tsc --noEmit` and `npx expo lint` from the mobile app directory.


## Shared account measurements

`AccountMeasurementsProvider` is mounted above the customer tabs. Product guides
and Account use the same AsyncStorage history (`ny-atelier-demo-account-fittings-v1`),
so updates appear immediately across screens and survive reloads on that device.
Backend account synchronization is not connected by this change.

The provider serializes writes, merges product-field updates with unrelated saved
measurements and preserves previous snapshots. Edits from one open product form
are coalesced into one history entry. Invalid or blank inputs do not replace a
saved value; the form explains this. Account’s full measurement editor can still
save a replacement set while preserving the earlier record.

Canonical length values stay in centimetres and are mapped explicitly between the
size-guide keys and the account keys (for example `hip` → `hips`). Chest and bust
are separate fields. Unit switching does not rewrite saved measurements. The
extra “Size guide” heading has been removed; the section keeps its existing
accordion label and product context.


## Staff chart entry and publishing

NY Office now includes **Edit size chart** in a garment’s details and in a
collection’s details. Collections keep separate men’s and women’s defaults.
Each chart includes its garment parts, source units, body ranges or finished
measurements, fit, required dimensions, optional extra dimensions, regional labels
and approved fit allowances. Blank rows are omitted rather than filled with
sample values. A product-specific chart overrides a collection default; an
ambiguous collection default falls back to the reference until explicitly chosen.

`GET /api/size-charts` exposes only validated published sizing data. Staff writes
use a same-origin Office endpoint with the existing local staff access boundary,
a revision check, a file lock and an atomic rename. Data is held in the portal’s
`.studio-data/size-charts.json` alongside its existing shared preview catalogue.
The production deployment will need persistent storage and its real staff login
boundary. `NY_SIZE_CHART_DATA_DIR` isolates chart data for tests.

The customer app reads `EXPO_PUBLIC_SIZE_GUIDE_BASE_URL`, refreshes on resume and
while active, and caches the latest validated publication for offline use. The
current local preview points at the Office server on port 3000. Internet previews
and deployed builds need the Office HTTPS address in that environment variable.
Changing a chart does not require rebuilding the app. Changing this base address
does require reloading the Expo app (or a new deployed app configuration).

Shared chart types and validation live in `src/lib/sizing.ts`; shipped product
part metadata now lives in `src/data/product-sizing.ts`. Stock still comes from
the existing inventory flow. Chart entry does not fabricate independent stock
lengths or change the purchased variant when regional labels change.
