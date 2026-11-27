<?php

namespace App\Http\Controllers;

use App\Models\DeliveryStartPoint;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\StaffAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Delivery set-up for the order desk: delivery areas (each with the window promised to customers) and the shops a
 * courier can start a route from. Also sets an order's delivery area, which fixes its promised delivery dates.
 */
class DeliverySettingsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        StaffAccess::requireStaffToken($request);

        return response()->json([
            'zones' => DeliveryZone::query()->orderBy('sort_order')->orderBy('name')->get()->map->toPayload()->values(),
            'start_points' => DeliveryStartPoint::query()->orderBy('sort_order')->orderBy('name')->get()->map->toPayload()->values(),
        ])->header('Cache-Control', 'no-store');
    }

    public function saveZone(Request $request, ?DeliveryZone $zone = null): JsonResponse
    {
        StaffAccess::requireStaffToken($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('delivery_zones', 'name')->ignore($zone?->id)],
            'min_days' => ['required', 'integer', 'min:0', 'max:60'],
            'max_days' => ['required', 'integer', 'min:0', 'max:60', 'gte:min_days'],
            'active' => ['sometimes', 'boolean'],
        ]);
        $zone ??= new DeliveryZone(['sort_order' => (int) DeliveryZone::query()->max('sort_order') + 1]);
        $zone->fill(['name' => trim($data['name']), 'min_days' => $data['min_days'], 'max_days' => $data['max_days'], 'active' => $data['active'] ?? $zone->active ?? true])->save();

        return response()->json(['zone' => $zone->toPayload()], $zone->wasRecentlyCreated ? 201 : 200);
    }

    public function saveStartPoint(Request $request, ?DeliveryStartPoint $point = null): JsonResponse
    {
        StaffAccess::requireStaffToken($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'active' => ['sometimes', 'boolean'],
        ]);
        $point ??= new DeliveryStartPoint(['sort_order' => (int) DeliveryStartPoint::query()->max('sort_order') + 1]);
        $point->fill(['name' => trim($data['name']), 'address' => filled($data['address'] ?? null) ? trim($data['address']) : null,
            'latitude' => round((float) $data['latitude'], 6), 'longitude' => round((float) $data['longitude'], 6), 'active' => $data['active'] ?? $point->active ?? true])->save();

        return response()->json(['start_point' => $point->toPayload()], $point->wasRecentlyCreated ? 201 : 200);
    }

    /** Sets a delivery order's area; the promise counts from the day the order was placed. */
    public function setOrderZone(Request $request, string $reference): JsonResponse
    {
        $actor = StaffAccess::requireStaffToken($request);
        $data = $request->validate(['zone_id' => ['present', 'nullable', 'integer', Rule::exists('delivery_zones', 'id')->where('active', true)]]);
        $order = Order::query()->where('reference', $reference)->firstOrFail();
        abort_unless($order->fulfilment_method === 'Delivery', 422, 'Only delivery orders have a delivery area.');
        abort_if($order->completed_at !== null, 422, 'This order is already closed.');
        $zone = $data['zone_id'] ? DeliveryZone::query()->findOrFail($data['zone_id']) : null;
        $placed = $order->created_at->copy()->startOfDay();
        $order->forceFill([
            'delivery_zone_id' => $zone?->id,
            'delivery_due_from' => $zone ? $placed->copy()->addDays($zone->min_days) : null,
            'delivery_due_by' => $zone ? $placed->copy()->addDays($zone->max_days) : null,
            'workflow_version' => $order->workflow_version + 1,
        ])->save();
        $order->events()->create(['title' => 'Delivery area set', 'action_type' => 'note', 'client_visible' => false, 'occurred_at' => now(),
            'explanation' => ($zone ? "{$zone->name}: delivery by ".$order->delivery_due_by->format('j M Y') : 'Delivery area removed')." ({$actor->name})"]);

        return response()->json(['delivery_promise' => $zone ? ['zone_id' => $zone->id, 'area' => $zone->name,
            'from' => $order->delivery_due_from->toDateString(), 'by' => $order->delivery_due_by->toDateString()] : null]);
    }
}
