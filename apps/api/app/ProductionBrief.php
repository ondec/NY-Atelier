<?php

namespace App;

use App\Http\Controllers\DemoCustomerController;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

/**
 * The full production brief for the production manager's "New in production" email: the order, the customer,
 * the garments, the specifications, the linked fitting with every measurement, and the delivery details.
 * Like NY Production itself it leaves out prices and payments.
 */
class ProductionBrief
{
    /** @return list<array{title: string, rows?: array<string, string>, text?: string}> */
    public static function sections(Order $order): array
    {
        $order->loadMissing(['customer', 'items', 'sentToProductionBy']);
        $sections = [];

        $sections[] = ['title' => 'Order details', 'rows' => self::rows([
            'Service' => config('demo.offerings')[$order->service_offering] ?? null,
            'Created' => $order->created_at?->format('j F Y'),
            'Sent to production' => $order->sent_to_production_at?->format('j F Y, H:i'),
            'Sent by' => $order->sentToProductionBy?->name,
            'Expected ready' => $order->expected_completion_date?->format('j F Y'),
            'Handover' => $order->fulfilment_method,
            'Handover notes' => $order->handover_instructions,
        ])];

        $customer = $order->customer;
        $sections[] = ['title' => 'Customer', 'rows' => self::rows([
            'Name' => $customer?->name,
            'Phone' => $customer?->phone,
            'Email' => $customer?->email,
            'Account' => $customer?->account_reference,
        ])];

        $garments = [];
        foreach ($order->items->sortBy('sort_order')->values() as $index => $item) {
            $garments[($index + 1).'.'] = $item->garment_name.($item->wearer_name ? ' · for '.$item->wearer_name : '');
        }
        if ($garments !== []) {
            $sections[] = ['title' => 'Garments', 'rows' => $garments];
        }

        if (filled($order->specifications)) {
            $sections[] = ['title' => $order->category === 'Alterations' ? 'Alterations needed' : 'Specifications', 'text' => (string) $order->specifications];
        }

        array_push($sections, ...self::fitting($order));

        if ($order->fulfilment_method === 'Delivery') {
            $delivery = self::rows([
                'Recipient' => $order->delivery_recipient_name,
                'Phone' => $order->delivery_phone,
                'Address' => $order->delivery_address,
                'Area' => $order->delivery_area,
                'GPS code' => $order->delivery_gps_code,
                'Directions' => $order->delivery_directions,
            ]);
            if ($delivery !== []) {
                $sections[] = ['title' => 'Delivery', 'rows' => $delivery];
            }
        }

        return $sections;
    }

    /** @return list<array{title: string, rows?: array<string, string>, text?: string}> */
    private static function fitting(Order $order): array
    {
        $fitting = $order->measurement_id ? DB::table('customer_measurements')->where('id', $order->measurement_id)->first() : null;
        if (! $fitting) {
            return [];
        }
        $unit = $fitting->recorded_unit === 'in' ? 'in' : 'cm';
        $values = json_decode($fitting->values ?? '{}', true) ?: [];
        $additional = json_decode($fitting->additional_measurements ?? '[]', true) ?: [];
        $pieces = json_decode($fitting->pieces ?? '[]', true) ?: [];
        $template = config('fittings.templates.'.$fitting->garment_type);
        $labels = DemoCustomerController::MEASUREMENTS;

        $sections = [['title' => 'Fitting', 'rows' => self::rows([
            'Fitting' => '#'.$fitting->id,
            'Measured on' => $fitting->measured_on ? date('j F Y', strtotime((string) $fitting->measured_on)) : null,
            'Garment' => $template['name'] ?? $fitting->garment_type,
            'Measured in' => $unit === 'in' ? 'Inches' : 'Centimetres',
        ])]];
        if (filled($fitting->notes)) {
            $sections[] = ['title' => 'Fitting notes', 'text' => (string) $fitting->notes];
        }

        $groups = [];
        $shown = [];
        foreach ($template['groups'] ?? [] as $group) {
            $groups[$group['title']] = [];
            foreach ($group['fields'] as $key) {
                if (isset($values[$key])) {
                    $groups[$group['title']][$labels[$key] ?? $key] = self::measure($key, $values[$key], $unit);
                    $shown[] = $key;
                }
            }
        }
        foreach ($values as $key => $value) {
            if (! in_array($key, $shown, true)) {
                $groups['Measurements'][$labels[$key] ?? $key] = self::measure($key, $value, $unit);
            }
        }
        foreach ($additional as $extra) {
            if (isset($extra['label'], $extra['value'])) {
                $groups[($extra['group'] ?? null) ?: 'Other measurements'][$extra['label']] = self::measure('', $extra['value'], $unit);
            }
        }
        foreach ($pieces as $piece) {
            foreach ($piece['values'] ?? [] as $key => $value) {
                $groups[$piece['title'] ?? 'Piece'][$labels[$key] ?? $key] = self::measure($key, $value, $unit);
            }
        }
        foreach ($groups as $title => $rows) {
            if ($rows !== []) {
                $sections[] = ['title' => $title, 'rows' => $rows];
            }
        }

        return $sections;
    }

    /** Measurements are stored in centimetres; show them in the unit the fitting was taken in. */
    private static function measure(string $key, mixed $value, string $unit): string
    {
        if ($key === 'weight') {
            return self::number((float) $value).' kg';
        }

        return self::number($unit === 'in' ? (float) $value / 2.54 : (float) $value).' '.$unit;
    }

    private static function number(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
    }

    /**
     * @param  array<string, mixed>  $rows
     * @return array<string, string>
     */
    private static function rows(array $rows): array
    {
        return array_map('strval', array_filter($rows, fn ($value): bool => filled($value)));
    }
}
