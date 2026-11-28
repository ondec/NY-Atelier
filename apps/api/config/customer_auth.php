<?php

return [
    // Sign-in codes and magic links.
    'code_minutes' => 15,
    'max_attempts' => 5,
    // The email links to this https page, which then opens the app. Email apps such as Gmail
    // block links that start with nyatelier://, so the email never links to the app directly.
    'link_base' => env('CUSTOMER_SIGN_IN_PAGE', rtrim((string) env('APP_URL', 'http://localhost'), '/').'/api/customer/auth/link'),
    // Where that page sends the customer. In Expo Go use exp://<computer IP>:8081/--/sign-in.
    'app_link_base' => env('CUSTOMER_SIGN_IN_LINK_BASE', 'nyatelier://sign-in'),

    // The public website, for links in customer emails (appointment replies). On the Render preview the
    // website lives under /home on the service's own address.
    'website_url' => rtrim((string) (env('NY_CUSTOMER_WEBSITE_URL')
        ?: (env('NY_PUBLIC_SITES_PREVIEW_PATHS') === '1' && env('RENDER_EXTERNAL_URL') ? rtrim((string) env('RENDER_EXTERNAL_URL'), '/').'/home' : null)
        ?: env('NY_WEBSITE_ORIGIN', 'http://localhost:5173')), '/'),

    // Signed-in customers stay signed in on their device for this long.
    'session_days' => (int) env('CUSTOMER_SESSION_DAYS', 60),

    // A passkey is offered after the first order and required this many days after first sign-in.
    'passkey_required_after_days' => (int) env('CUSTOMER_PASSKEY_REQUIRED_AFTER_DAYS', 30),

    // log: writes the message to the Laravel log only (development). array: kept in memory (tests).
    'sms_driver' => env('CUSTOMER_SMS_DRIVER', 'log'),
    'default_country_code' => '233',
];
