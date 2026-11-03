<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $customer = Customer::create(['name' => 'Ama Mensah (demo)']);

        $readyToWear = Order::create([
            'customer_id' => $customer->id,
            'reference' => 'NY-RTW-000001',
            'category' => 'Ready-to-Wear',
            'status' => 'Preparing',
            'expected_completion_date' => today()->addDays(4),
            'fulfilment_method' => 'Delivery',
            'fulfilment_status' => 'Preparing for delivery',
            'payment_status' => 'Simulated full payment received',
        ]);
        $readyToWear->items()->create([
            'garment_name' => 'Linen shirt',
            'status' => 'Preparing',
        ]);
        $readyToWear->events()->createMany([
            ['title' => 'Order received', 'occurred_at' => now()->subDays(2)],
            ['title' => 'Preparing', 'occurred_at' => now()->subDay()],
        ]);

        $custom = Order::create([
            'customer_id' => $customer->id,
            'reference' => 'NY-CUS-000001',
            'category' => 'Custom',
            'status' => 'Your outfit is being made',
            'expected_completion_date' => today()->addDays(24),
            'fulfilment_method' => 'Collection',
            'fulfilment_status' => 'Awaiting all outfits',
            'payment_status' => 'Simulated deposit recorded',
        ]);
        $father = $custom->items()->create([
            'garment_name' => 'Tailored suit',
            'wearer_name' => 'Father',
            'status' => 'Final checks complete',
            'completed_at' => now()->subDay(),
            'sort_order' => 1,
        ]);
        $custom->items()->createMany([
            [
                'garment_name' => 'Occasion dress',
                'wearer_name' => 'Mother',
                'status' => 'Final checks',
                'sort_order' => 2,
            ],
            [
                'garment_name' => 'Celebration outfit',
                'wearer_name' => 'Child',
                'status' => 'Your outfit is being made',
                'sort_order' => 3,
            ],
        ]);
        $custom->events()->createMany([
            [
                'title' => 'Consultation & approval',
                'occurred_at' => now()->subDays(12),
                'explanation' => 'Design and quotation agreed.',
            ],
            [
                'title' => 'Preparing your order',
                'occurred_at' => now()->subDays(9),
            ],
            [
                'title' => 'Your outfit is being made',
                'occurred_at' => now()->subDays(6),
            ],
            [
                'order_item_id' => $father->id,
                'title' => 'Final checks complete',
                'occurred_at' => now()->subDay(),
                'explanation' => 'One of three outfits is complete. Collection waits until all are ready.',
            ],
        ]);

        $alteration = Order::create([
            'customer_id' => $customer->id,
            'reference' => 'NY-ALT-000001',
            'category' => 'Alterations',
            'status' => 'Adjustments in progress',
            'expected_completion_date' => today()->addDays(2),
            'fulfilment_method' => 'Collection',
            'fulfilment_status' => 'In progress',
        ]);
        $alteration->items()->create([
            'garment_name' => 'Trouser hem adjustment',
            'status' => 'Adjustments in progress',
        ]);
        $alteration->events()->createMany([
            ['title' => 'Order recorded', 'occurred_at' => now()->subDay()],
            ['title' => 'Adjustments in progress', 'occurred_at' => now()],
        ]);

        $completed = Order::create([
            'customer_id' => $customer->id,
            'reference' => 'NY-RTW-000002',
            'category' => 'Ready-to-Wear',
            'status' => 'Collected',
            'expected_completion_date' => today()->subDays(7),
            'fulfilment_method' => 'Collection',
            'fulfilment_status' => 'Collected',
            'payment_status' => 'Simulated full payment received',
            'completed_at' => now()->subDays(7),
        ]);
        $completed->items()->create([
            'garment_name' => 'Cotton overshirt',
            'status' => 'Collected',
            'completed_at' => now()->subDays(7),
        ]);
        $completed->events()->createMany([
            ['title' => 'Order received', 'occurred_at' => now()->subDays(10)],
            ['title' => 'Ready for collection', 'occurred_at' => now()->subDays(8)],
            ['title' => 'Collected', 'occurred_at' => now()->subDays(7)],
        ]);
    }
}
