#!/usr/bin/env bash
set -Eeuo pipefail

export APP_KEY="base64:${NY_RENDER_KEY:?Set the persistent Render application key secret}"
export APP_URL="${RENDER_EXTERNAL_URL:-http://127.0.0.1:8080}"
export PORT="${PORT:-10000}"
export HOSTNAME=0.0.0.0

cd /srv/api
# Free instances have no pre-deploy command or shell. Never seed business data.
gosu www-data php artisan config:cache --no-interaction
gosu www-data php artisan migrate --force --no-interaction
if [[ "${NY_HOSTED_PREVIEW:-0}" == "1" ]]; then
    gosu www-data php artisan staff:bootstrap-preview --no-interaction
    if [[ -f /etc/secrets/ny-customer-copy.1 && -f /etc/secrets/ny-customer-copy.2 ]]; then
        # BuildKit caps each secret at 500 KiB, below Render's 1 MB total limit.
        umask 077
        snapshot_file="$(mktemp /tmp/ny-customer-copy.XXXXXX)"
        cat /etc/secrets/ny-customer-copy.1 /etc/secrets/ny-customer-copy.2 > "$snapshot_file"
        php artisan staff:restore-preview-customers "$snapshot_file" --no-interaction
        rm -f "$snapshot_file"
        chown -R www-data:www-data /srv/api/storage
    fi
fi

apache2-foreground &
api_pid=$!
cd /srv/portal/apps/portal
gosu www-data node server.js &
portal_pid=$!

stop_services() {
    kill -TERM "$api_pid" "$portal_pid" 2>/dev/null || true
    wait "$api_pid" "$portal_pid" 2>/dev/null || true
}
trap stop_services EXIT
trap 'exit 0' TERM INT
set +e
wait -n "$api_pid" "$portal_pid"
result=$?
set -e
# A child that exits, even successfully, leaves the combined app unavailable.
if [[ "$result" == "0" ]]; then result=1; fi
exit "$result"
