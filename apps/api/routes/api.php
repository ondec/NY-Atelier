<?php

use App\Models\Order;
use Illuminate\Support\Facades\Route;

Route::get('/demo/orders', function () {
    abort_unless(config('demo.enabled'), 404);

    $orders = Order::query()
        ->with(['customer', 'items', 'events'])
        ->orderByRaw('completed_at IS NOT NULL')
        ->orderBy('reference')
        ->get()
        ->map(fn (Order $order) => [
            'reference' => $order->reference,
            'category' => $order->category,
            'customer_name' => $order->customer->name,
            'status' => $order->status,
            'expected_completion_date' => $order->expected_completion_date?->toDateString(),
            'date_change_explanation' => $order->date_change_explanation,
            'fulfilment_method' => $order->fulfilment_method,
            'fulfilment_status' => $order->fulfilment_status,
            'payment_status' => $order->payment_status,
            'client_action' => $order->client_action,
            'is_complete' => $order->completed_at !== null,
            'item_count' => $order->items->count(),
            'completed_item_count' => $order->items->whereNotNull('completed_at')->count(),
            'items' => $order->items->map(fn ($item) => [
                'garment_name' => $item->garment_name,
                'wearer_name' => $item->wearer_name,
                'status' => $item->status,
                'expected_completion_date' => $item->expected_completion_date?->toDateString(),
            ])->values(),
            'timeline' => $order->events
                ->where('client_visible', true)
                ->map(fn ($event) => [
                    'title' => $event->title,
                    'explanation' => $event->explanation,
                    'occurred_at' => $event->occurred_at->toIso8601String(),
                ])->values(),
        ]);

    return response()->json(['demo' => true, 'orders' => $orders]);
});
