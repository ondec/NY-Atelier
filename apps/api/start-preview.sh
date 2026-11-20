#!/bin/sh
set -eu
api_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$api_directory/public"
exec php -d upload_max_filesize=20M -d post_max_size=64M -d max_file_uploads=10 \
  -d memory_limit=256M -d max_execution_time=120 \
  -S "${NY_API_HOST:-0.0.0.0}:${NY_API_PORT:-8000}" \
  "$api_directory/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php"
