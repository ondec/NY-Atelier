<?php

return [
    'templates' => [
        'kaftan' => [
            'name' => 'Kaftan',
            'description' => 'The kaftan top and its matching trousers.',
            'groups' => [
                ['title' => 'Kaftan top', 'fields' => ['neck', 'shoulder', 'chest', 'waist', 'hips', 'sleeve', 'arm', 'wrist', 'top_length']],
                ['title' => 'Matching trousers', 'fields' => ['trouser_waist', 'rise', 'thigh', 'knee', 'hem', 'inseam', 'outseam']],
            ],
        ],
        'agbada' => [
            'name' => 'Agbada',
            'description' => 'The outer robe, inner top and matching trousers.',
            'groups' => [
                ['title' => 'Outer robe', 'fields' => ['agbada_length', 'agbada_span']],
                ['title' => 'Inner top', 'fields' => ['neck', 'shoulder', 'chest', 'waist', 'hips', 'sleeve', 'arm', 'wrist', 'top_length']],
                ['title' => 'Matching trousers', 'fields' => ['trouser_waist', 'rise', 'thigh', 'knee', 'hem', 'inseam', 'outseam']],
            ],
        ],
        'suit' => [
            'name' => 'Suit',
            'description' => 'Jacket proportions and tailored trousers.',
            'groups' => [
                ['title' => 'Jacket', 'fields' => ['neck', 'shoulder', 'chest', 'waist', 'hips', 'sleeve', 'arm', 'wrist', 'jacket_length']],
                ['title' => 'Suit trousers', 'fields' => ['trouser_waist', 'rise', 'thigh', 'knee', 'hem', 'inseam', 'outseam']],
            ],
        ],
        'shirt-long' => [
            'name' => 'Shirt · Long sleeve',
            'description' => 'A shirt with a full-length sleeve and cuff.',
            'groups' => [
                ['title' => 'Shirt body', 'fields' => ['neck', 'shoulder', 'chest', 'waist', 'hips', 'top_length']],
                ['title' => 'Long sleeves', 'fields' => ['sleeve', 'arm', 'wrist']],
            ],
        ],
        'shirt-short' => [
            'name' => 'Shirt · Short sleeve',
            'description' => 'A shirt with a short sleeve and sleeve opening.',
            'groups' => [
                ['title' => 'Shirt body', 'fields' => ['neck', 'shoulder', 'chest', 'waist', 'hips', 'top_length']],
                ['title' => 'Short sleeves', 'fields' => ['short_sleeve', 'arm', 'sleeve_opening']],
            ],
        ],
        'trousers-fitted' => [
            'name' => 'Trousers · Fitted',
            'description' => 'A fitted trouser silhouette, from waistband to hem.',
            'groups' => [
                ['title' => 'Waist & seat', 'fields' => ['trouser_waist', 'hips', 'rise']],
                ['title' => 'Leg & length', 'fields' => ['thigh', 'knee', 'hem', 'inseam', 'outseam']],
            ],
        ],
    ],    /**
     * Pieces staff can add to a fitting ("Add a piece"), each with its own readings. A piece can be added once per
     * fitting and not when the garment type already has a section with the same name. "custom" is a named piece with
     * only the measurements staff add.
     */
    'pieces' => [
        'shirt-long' => ['title' => 'Shirt', 'fields' => ['neck', 'shoulder', 'chest', 'waist', 'hips', 'sleeve', 'arm', 'wrist', 'top_length']],
        'shirt-short' => ['title' => 'Short-sleeve shirt', 'fields' => ['neck', 'shoulder', 'chest', 'waist', 'hips', 'short_sleeve', 'arm', 'sleeve_opening', 'top_length']],
        'waistcoat' => ['title' => 'Waistcoat', 'fields' => ['shoulder', 'chest', 'waist', 'hips', 'top_length']],
        'jacket' => ['title' => 'Jacket', 'fields' => ['neck', 'shoulder', 'chest', 'waist', 'hips', 'sleeve', 'arm', 'wrist', 'jacket_length']],
        'trousers' => ['title' => 'Trousers', 'fields' => ['trouser_waist', 'hips', 'rise', 'thigh', 'knee', 'hem', 'inseam', 'outseam']],
        'kaftan-top' => ['title' => 'Kaftan top', 'fields' => ['neck', 'shoulder', 'chest', 'waist', 'hips', 'sleeve', 'arm', 'wrist', 'top_length']],
        'outer-robe' => ['title' => 'Outer robe', 'fields' => ['agbada_length', 'agbada_span']],
        'custom' => ['title' => null, 'fields' => []],
    ],
];
