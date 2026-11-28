<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\OrderWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * A signed-in customer's own orders, for the website account page (and the app later).
 * Only the customer-facing part of each order is returned: no prices, staff notes or hidden timeline events.
 */
class CustomerOrderController extends Controller
{
    public function index(Request $request, OrderWorkflow $workflow): JsonResponse
    {
        $customer = $request->user();
        abort_unless($customer instanceof Customer && $customer->tokenCan('customer'), 401, 'Please sign in again.');

        $orders = Order::query()->where('customer_id', $customer->id)
            ->with(['customer', 'items', 'events'])
            ->orderByRaw('completed_at IS NOT NULL')
            ->latest('created_at')->latest('id')
            ->limit(50)->get()
            ->map(fn (Order $order): array => $workflow->serialize($order, false));

        return response()->json(['orders' => $orders]);
    }
}
