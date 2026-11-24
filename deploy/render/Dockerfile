# One preview web service: Next.js is public (staff portal, plus the website and RTW store on their own
# addresses); Laravel listens only on loopback.
FROM node:22-bookworm-slim AS portal-build
WORKDIR /build/apps/portal
COPY apps/portal/package*.json ./
RUN npm ci --no-audit --no-fund
COPY apps/portal/ ./
COPY apps/mobile/src/ /build/apps/mobile/src/
ENV NY_STANDALONE=1 NEXT_TELEMETRY_DISABLED=1
RUN npm run build -- --webpack

# The public website and RTW store, served by the portal (src/proxy.ts): on their own addresses, or as
# previews under /home and /store when NY_PUBLIC_SITES_PREVIEW_PATHS=1 (or no addresses are set).
# Render passes the service's environment variables in as these build arguments.
FROM node:22-bookworm-slim AS sites-build
ARG NY_WEBSITE_ORIGIN=
ARG NY_STORE_ORIGIN=
ARG NY_PUBLIC_SITES_PREVIEW_PATHS=
WORKDIR /build
COPY website/package*.json website/
COPY rtw-store/package*.json rtw-store/
RUN cd website && npm ci --no-audit --no-fund && cd ../rtw-store && npm ci --no-audit --no-fund
COPY website/ website/
COPY rtw-store/ rtw-store/
RUN cd website && npm run check && cd ../rtw-store && npm run check
RUN if [ "$NY_PUBLIC_SITES_PREVIEW_PATHS" = "1" ] || { [ -z "$NY_WEBSITE_ORIGIN" ] && [ -z "$NY_STORE_ORIGIN" ]; }; then \
      cd /build/website && NY_SITE_BASE=/home/ VITE_API_URL=/home VITE_RTW_STORE_URL=/store npm run build \
      && cd /build/rtw-store && NY_SITE_BASE=/store/ VITE_API_URL=/store VITE_SIZE_GUIDE_URL=/store VITE_MAIN_SITE_URL=/home npm run build; \
    else \
      cd /build/website && VITE_RTW_STORE_URL="$NY_STORE_ORIGIN" npm run build \
      && cd /build/rtw-store && VITE_MAIN_SITE_URL="$NY_WEBSITE_ORIGIN" npm run build; \
    fi

FROM php:8.4-apache-bookworm AS api-build
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev libicu-dev libonig-dev libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j2 pdo_pgsql intl mbstring bcmath zip gd opcache \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /srv/api
COPY apps/api/composer.json apps/api/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress
COPY apps/api/artisan ./
COPY apps/api/app/ app/
COPY apps/api/bootstrap/ bootstrap/
COPY apps/api/config/ config/
COPY apps/api/routes/ routes/
COPY apps/api/resources/ resources/
COPY apps/api/database/migrations/ database/migrations/
COPY apps/api/public/index.php apps/api/public/.htaccess public/
RUN mkdir -p bootstrap/cache storage/app/fittings storage/app/private storage/app/public \
    storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs \
    && composer dump-autoload --no-dev --classmap-authoritative --no-interaction

FROM api-build AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends tini gosu \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod rewrite \
    && printf 'Listen 127.0.0.1:8080\n' > /etc/apache2/ports.conf \
    && printf 'StartServers 2\nMinSpareServers 2\nMaxSpareServers 4\nMaxRequestWorkers 4\nMaxConnectionsPerChild 1000\n' > /etc/apache2/mods-available/mpm_prefork.conf
COPY --from=portal-build /usr/local/bin/node /usr/local/bin/node
COPY --from=portal-build /build/apps/portal/.next/standalone/ /srv/portal/
COPY --from=portal-build /build/apps/portal/.next/static/ /srv/portal/apps/portal/.next/static/
COPY --from=portal-build /build/apps/portal/public/ /srv/portal/apps/portal/public/
COPY --from=sites-build /build/website/dist/ /srv/portal/apps/portal/public/_sites/website/
COPY --from=sites-build /build/rtw-store/dist/ /srv/portal/apps/portal/public/_sites/store/
COPY deploy/render/apache.conf /etc/apache2/sites-available/000-default.conf
COPY deploy/render/php.ini /usr/local/etc/php/conf.d/ny-preview.ini
COPY deploy/render/start.sh /usr/local/bin/ny-start
RUN chmod 755 /usr/local/bin/ny-start \
    && mkdir -p /srv/portal-data \
    && chown -R www-data:www-data /srv/api/storage /srv/api/bootstrap/cache /srv/portal /srv/portal-data
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 API_BASE_URL=http://127.0.0.1:8080 \
    NY_STUDIO_DATA_DIR=/srv/portal-data NY_SIZE_CHART_DATA_DIR=/srv/portal-data
EXPOSE 10000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/usr/local/bin/ny-start"]
