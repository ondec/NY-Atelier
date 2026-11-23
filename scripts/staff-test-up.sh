#!/usr/bin/env bash
# Starts the isolated NY Studio staff-test instance on this Mac (separate from the dev servers):
#   API    -> http://127.0.0.1:8100  (APP_ENV=stafftest, reads apps/api/.env.stafftest, database ny_atelier_staff_test)
#   Portal -> http://127.0.0.1:3100  (production build in apps/portal/.next-staff-test)
# Cloudflare Tunnel publishes the portal as https://studio.thenyatelier.com and https://office.thenyatelier.com.
# The API is never published; only the portal's server talks to it on 127.0.0.1.
# Usage: scripts/staff-test-up.sh [--build]   (--build rebuilds the portal first; it also builds if no build exists)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${NY_STAFF_TEST_HOME:-$HOME/NY-Atelier-staff-test}"
API="$ROOT/apps/api"; PORTAL="$ROOT/apps/portal"
mkdir -p "$BASE/run" "$BASE/logs" "$BASE/portal-data" "$BASE/api-storage/app/fittings" "$BASE/api-storage/framework/cache/data" "$BASE/api-storage/framework/sessions" "$BASE/api-storage/framework/views" "$BASE/api-storage/logs"

[ -f "$API/.env.stafftest" ] || { echo "Missing apps/api/.env.stafftest (see docs/WORK_LOG.md)."; exit 1; }

running() { [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null; }
port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

export_api_env() { export APP_ENV=stafftest LARAVEL_STORAGE_PATH="$BASE/api-storage"; }
export_portal_env() {
  export NODE_ENV=production NY_NEXT_DIST_DIR=.next-staff-test \
    API_BASE_URL=http://127.0.0.1:8100 \
    NY_STUDIO_ORIGIN=https://studio.thenyatelier.com NY_OFFICE_ORIGIN=https://office.thenyatelier.com NY_STAFF_COOKIE_DOMAIN=thenyatelier.com \
    NY_STUDIO_DATA_DIR="$BASE/portal-data" NY_SIZE_CHART_DATA_DIR="$BASE/portal-data" NEXT_TELEMETRY_DISABLED=1
  unset NY_STAFF_PREVIEW NY_WORKSPACE_LAYOUT NY_LAYOUT_COMPARISON_LINKS
}

# API: apply any new migrations to the staff-test database only, then serve on localhost.
if running "$BASE/run/api.pid"; then echo "API already running (pid $(cat "$BASE/run/api.pid"))."
elif port_busy 8100; then echo "Port 8100 is in use by another program; not starting the API."; exit 1
else
  ( export_api_env; cd "$API"; php artisan migrate --force --no-interaction >> "$BASE/logs/api-migrate.log" 2>&1 )
  # Laravel's router script expects to run from public/ (as `php artisan serve` does).
  ( export_api_env; cd "$API/public"; PHP_CLI_SERVER_WORKERS=4 nohup php -S 127.0.0.1:8100 "$API/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php" >> "$BASE/logs/api.log" 2>&1 & echo $! > "$BASE/run/api.pid" )
  echo "API started on http://127.0.0.1:8100 (pid $(cat "$BASE/run/api.pid"))."
fi

# Portal: production build (separate folder from dev) served on localhost.
if running "$BASE/run/portal.pid"; then echo "Portal already running (pid $(cat "$BASE/run/portal.pid"))."
elif port_busy 3100; then echo "Port 3100 is in use by another program; not starting the portal."; exit 1
else
  if [ "${1:-}" = "--build" ] || [ ! -f "$PORTAL/.next-staff-test/BUILD_ID" ]; then
    echo "Building the portal (this takes a minute)…"
    ( export_portal_env; cd "$PORTAL"; npx next build --webpack > "$BASE/logs/portal-build.log" 2>&1 ) || { echo "Portal build failed; see $BASE/logs/portal-build.log"; exit 1; }
  fi
  ( export_portal_env; cd "$PORTAL"; nohup npx next start --hostname 127.0.0.1 --port 3100 >> "$BASE/logs/portal.log" 2>&1 & echo $! > "$BASE/run/portal.pid" )
  echo "Portal started on http://127.0.0.1:3100 (pid $(cat "$BASE/run/portal.pid"))."
fi
echo "Logs: $BASE/logs"
