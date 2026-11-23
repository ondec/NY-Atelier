<?php

return [
    // Public origin of the staff web app, used in invitation setup links. Render supplies RENDER_EXTERNAL_URL.
    'portal_url' => rtrim((string) env('NY_STAFF_PORTAL_URL', env('RENDER_EXTERNAL_URL', 'http://127.0.0.1:3000')), '/'),
    'invitation_hours' => (int) env('NY_STAFF_INVITATION_HOURS', 72),
];
