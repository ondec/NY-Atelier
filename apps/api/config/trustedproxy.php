<?php

return [
    // Reverse proxies whose X-Forwarded-* headers Laravel may believe, as a comma list of IPs/CIDRs.
    // Empty by default: no proxy is trusted, so a client cannot spoof its IP, host or scheme.
    // The staff-test setup (Cloudflare Tunnel -> Next.js portal -> API on 127.0.0.1) does not need any.
    'proxies' => array_values(array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES', ''))))),
];
