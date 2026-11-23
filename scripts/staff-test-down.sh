#!/usr/bin/env bash
# Stops the NY Studio staff-test instance started by staff-test-up.sh. Dev servers (3000/8000/8081) are not touched.
set -uo pipefail
BASE="${NY_STAFF_TEST_HOME:-$HOME/NY-Atelier-staff-test}"
stop() {
  local name="$1" pidfile="$BASE/run/$1.pid"
  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    local pid; pid="$(cat "$pidfile")"
    pkill -TERM -P "$pid" 2>/dev/null; kill -TERM "$pid" 2>/dev/null
    for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
    kill -0 "$pid" 2>/dev/null && { pkill -KILL -P "$pid" 2>/dev/null; kill -KILL "$pid" 2>/dev/null; }
    echo "Stopped $name."
  else
    echo "$name is not running."
  fi
  rm -f "$pidfile"
}
stop portal
stop api
