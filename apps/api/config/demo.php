<?php

return [
    'customer_name' => 'Ama Mensah (demo)',
    'offerings' => [
        'couture' => 'Couture Experience',
        'bespoke' => 'Bespoke Tailor-Made Clothing',
        'special-events' => 'Unique Idea Development for Special Events',
        'consultancy' => 'Consultancy Services',
        'fabric' => 'Custom Fabric Selection',
        'wardrobe' => 'Wardrobe Revamping',
        'accessories' => 'Personalized Accessories Design',
    ],
    'enabled' => (bool) env('NY_DEMO_API_ENABLED', false),
];
