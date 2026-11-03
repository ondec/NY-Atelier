# NY Atelier codebase

This folder contains the first connected prototype foundation. The customer app, staff portal and API are separate from the project documents and logo in the parent folder. All records in this slice are fictional.

## Selected stack

- Customer app: Expo SDK 57, React Native, TypeScript and Expo Router. SDK 57 was chosen for Expo Go phone previews during the SDK 58 transition.
- Staff portal: React, Next.js and TypeScript.
- API: Laravel 13 with Sanctum installed for the later authentication slice.
- Database: PostgreSQL 17 for local development.

No hosted service account, paid subscription or payment provider is required to run this slice.

## What works now

The Laravel API serves four seeded demo orders: Ready-to-Wear, Alterations, a three-outfit Custom order, and one completed order. The app's Orders area shows Active and History lists and an order detail view. The staff portal reads the same records and shows an order overview. The Custom order correctly shows one of three outfits complete while collection remains unavailable.

The app's Home, Shop, Atelier and Account tabs now use the approved NY Atelier editorial direction. Home has a photographic collection carousel. Shop shows a small static preview of verified public-store products and a product-view overlay; the Women's tab explicitly says its catalogue is pending. Atelier presents the custom clothing journey and lets viewers choose an in-person or virtual consultation before explaining the account requirement. Account is a designed preview of the future customer space. The portal remains read-only. Customer sign-in, staff permissions, approvals, live catalogue sync, booking requests, bag, checkout and messaging are not connected yet. Payment labels in sample data are simulated.

Home and Atelier photography comes from [NY Atelier's main website](https://thenyatelier.com/). The sample product images, names and prices were checked against the [public ready-to-wear store](https://rtw.thenyatelier.com/) on 3 November 2026; they are bundled design-preview content, not live inventory. The provisional display and interface fonts are Alfa Slab One and Josefin Sans, as specified in the design plan; their SIL Open Font licenses are included under `apps/mobile/assets/fonts/`.

Expo SDK 57 is being used for the immediate Expo Go phone demo during the SDK 58 transition. The current SDK 57 dependency audit reports advisories whose available fixes require SDK 58. This prototype uses fictional data only; upgrade and recheck dependencies before any production release or real customer data.

## Local setup on a Mac

Install Node 24, PHP 8.4, Composer and PostgreSQL 17. On this development Mac they are available through Homebrew. Start PostgreSQL and create one local database:

```sh
brew services start postgresql@17
/opt/homebrew/opt/postgresql@17/bin/createdb ny_atelier_dev
```

Use the selected tool versions in each Terminal window:

```sh
export PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/opt/php@8.4/bin:/opt/homebrew/opt/postgresql@17/bin:$PATH"
```

From `codebase/`, install the locked dependencies:

```sh
cd apps/api && composer install
cd ../portal && npm ci
cd ../mobile && npm ci
```

Copy `apps/api/.env.example` to `apps/api/.env`. Set `DB_USERNAME` to your local PostgreSQL username, set `NY_DEMO_API_ENABLED=true` only for the fictional demo database, then run:

```sh
cd apps/api
php artisan key:generate
php artisan migrate --seed
```

The demo route returns 404 when `NY_DEMO_API_ENABLED` is false. It is a read-only preview route and must not be enabled against real customer data.

## Run the demo

Start these in three Terminal windows, each with the tool versions above on `PATH`:

```sh
cd codebase/apps/api
php artisan serve --host=0.0.0.0 --port=8000
```

```sh
cd codebase/apps/portal
npm run dev -- --hostname 127.0.0.1 --port 3000
```

```sh
cd codebase/apps/mobile
npx expo start --lan
```

Open the staff portal at `http://127.0.0.1:3000`. For a phone preview, install the SDK 57 compatible Expo Go version, keep the phone and Mac on the same network, and scan Expo's QR code. In `apps/mobile/.env.local`, set `EXPO_PUBLIC_API_BASE_URL` to the Mac's current LAN address, for example `http://192.168.x.x:8000`. On Wi-Fi, `ipconfig getifaddr en0` often prints that address. Restart Expo after changing the file. Physical iPhones may require Expo CLI and Expo Go to be signed in to the same free Expo account. The API is bound to the local network for this demo and contains fictional data only.

The app and portal can also run in a browser for development. The app's web preview is available from Expo at `http://localhost:8081/orders` when its web mode is started.

## Demo data contract

`GET /api/demo/orders` returns `{ "demo": true, "orders": [...] }`. Each order includes its `reference`, `category`, `status`, expected completion date, fulfilment and simulated payment status, `is_complete`, item counts, garment items and dated timeline. The app and portal fetch this endpoint separately from the same Laravel database. Internal numeric database IDs are not exposed in this demo response. Customer account and staff role boundaries will be added before any real data.

## Reset and verify

To restore the four fictional records in the local development database:

```sh
cd codebase/apps/api
php artisan migrate:fresh --seed
```

This reset deletes records in the configured database. Confirm the API `.env` points to the local demo database first. Run the meaningful checks:

```sh
cd codebase/apps/api && php artisan test --compact
cd codebase/apps/portal && npm run build
cd codebase/apps/mobile && npx expo lint && npx tsc --noEmit && npx expo export --platform all
```

The next connected slice is staff authentication and stage approval: a staff submission should remain private until a manager or owner approves it, then the customer Orders view should show the approved update.
