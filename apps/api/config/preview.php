<?php

return [
    'enabled' => (bool) env('NY_HOSTED_PREVIEW', false),
    'password' => env('NY_PREVIEW_STAFF_PASSWORD'),
    'accounts' => [
        'owner' => env('NY_PREVIEW_OWNER_EMAIL'),
        'manager' => env('NY_PREVIEW_MANAGER_EMAIL'),
        'receptionist' => env('NY_PREVIEW_RECEPTIONIST_EMAIL'),
    ],
];
