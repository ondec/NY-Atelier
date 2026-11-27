<?php

namespace App\Http\Controllers;

use App\DeliveryRoutePlanner;
use App\Models\DeliveryStartPoint;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use App\OrderCustomerNotice;
use App\OrderWorkflow;
use App\StaffAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Deliveries: the front desk assigns a delivery order to a delivery courier; the courier sees only their own
 * deliveries (who, where, what) and confirms each one delivered. Couriers never see prices, payments or measurements.
 */
class DeliveryController extends Controller
{
    /** Active courier accounts the order desk can assign. */
    public function couriers(Request $request): JsonResponse
    {
        StaffAccess::requireStaffToken($request);

        return response()->json(['couriers' => User::query()->where('staff_role', 'courier')->where('staff_active', true)
            ->orderBy('name')->get(['id', 'name'])->map(fn (User $user): array => ['id' => $user->id, 'name' => $user->name])->values()]);
    }

    public function assign(Request $request, string $reference, OrderWorkflow $workflow): JsonResponse
    {
        $actor = StaffAccess::requireStaffToken($request);
        $data = $request->validate(['courier_id' => ['present', 'nullable', 'integer']]);

        DB::transaction(function () use ($reference, $data, $actor): void {
            $order = Order::query()->where('reference', $reference)->lockForUpdate()->firstOrFail();
            abort_unless($order->fulfilment_method === 'Delivery', 422, 'Only delivery orders can be given to a courier. Set the handover to delivery first.');
            abort_if($order->completed_at !== null, 422, 'This order is already closed.');
            $courier = $data['courier_id'] ? User::query()->where('id', $data['courier_id'])->where('staff_role', 'courier')->where('staff_active', true)->first() : null;
            abort_if($data['courier_id'] && ! $courier, 422, 'Choose an active delivery courier.');
            $order->forceFill([
                'assigned_courier_id' => $courier?->id, 'courier_assigned_at' => $courier ? now() : null,
                'courier_name' => $courier?->name ?? $order->courier_name, 'workflow_version' => $order->workflow_version + 1,
            ])->save();
            $order->events()->create(['title' => $courier ? 'Courier assigned' : 'Courier removed', 'action_type' => 'note', 'client_visible' => false,
                'occurred_at' => now(), 'explanation' => ($courier ? $courier->name.' will deliver this order.' : 'No courier assigned.')." ({$actor->name})"]);
        });

        $order = Order::query()->where('reference', $reference)->with(['customer', 'items', 'events', 'assignedTailor', 'assignedCourier'])->firstOrFail();

        return response()->json(['order' => $workflow->serialize($order, true, $request->user()->can('staff.orders.manage'))]);
    }

    /**
     * Open deliveries plus those delivered in the last week. A courier gets only their own; the order desk
     * (owner, general manager, operations manager) gets every delivery order, with its courier, to assign.
     */
    public function index(Request $request): JsonResponse
    {
        $staff = StaffAccess::requireStaffToken($request);
        $board = $request->user()->can('staff.orders.manage');
        $orders = Order::query()->when($board, fn ($query) => $query->where('fulfilment_method', 'Delivery'), fn ($query) => $query->where('assigned_courier_id', $staff->id))
            ->where(fn ($query) => $query->whereNull('completed_at')->orWhere('completed_at', '>=', now()->subDays(7)))
            ->with(['customer', 'items', 'assignedCourier', 'deliveryZone'])->orderByRaw('completed_at IS NOT NULL')->orderByRaw('delivery_due_by IS NULL')->orderBy('delivery_due_by')->orderBy('courier_assigned_at')->get();

        return response()->json(['board' => $board,
            'start_points' => DeliveryStartPoint::query()->where('active', true)->orderBy('sort_order')->orderBy('name')->get()->map->toPayload()->values(),
            'deliveries' => $orders->map(fn (Order $order): array => $this->delivery($order, $staff->id))->values()])->header('Cache-Control', 'no-store');
    }

    public function delivered(Request $request, string $reference, OrderWorkflow $workflow, OrderCustomerNotice $notices): JsonResponse
    {
        $courier = StaffAccess::requireStaffToken($request);
        $data = $request->validate(['request_id' => ['required', 'uuid'], 'note' => ['required', 'string', 'min:3', 'max:1000']]);
        $order = Order::query()->where('reference', $reference)->where('assigned_courier_id', $courier->id)->firstOrFail();
        abort_unless($order->workflow_stage === 'out_for_delivery' || $order->workflow_stage === 'delivered', 422, 'This order hasn’t been sent out for delivery yet.');

        $event = $workflow->update($reference, ['request_id' => $data['request_id'], 'version' => $order->workflow_version, 'action' => 'advance',
            'stage' => 'delivered', 'note' => trim($data['note']).' (delivered by '.$courier->name.')']);
        $notices->send($event);

        return response()->json(['delivery' => $this->delivery($order->fresh(['customer', 'items', 'assignedCourier', 'deliveryZone']), $courier->id)]);
    }

    /**
     * Plans a road route through the courier's chosen stops from a start point (a shop, the courier's location or a
     * dropped pin). Stops without a map pin can't be routed and are returned separately.
     */
    public function route(Request $request, DeliveryRoutePlanner $planner): JsonResponse
    {
        $courier = StaffAccess::requireStaffToken($request);
        $data = $request->validate([
            'start.latitude' => ['required', 'numeric', 'between:-90,90'], 'start.longitude' => ['required', 'numeric', 'between:-180,180'],
            'references' => ['required', 'array', 'min:1', 'max:60'], 'references.*' => ['required', 'string', 'distinct', 'max:40'],
            'pickup_point_id' => ['nullable', 'integer'], 'pickup_references' => ['nullable', 'array', 'max:60'], 'pickup_references.*' => ['string', 'distinct', 'max:40'],
            'finish_point_id' => ['nullable', 'integer'],
        ]);
        $orders = $this->courierOrders($courier->id, $data['references']);
        [$mapped, $unmapped] = $orders->partition(fn (Order $order): bool => $order->delivery_latitude !== null && $order->delivery_longitude !== null);
        $shop = fn (?int $id): ?DeliveryStartPoint => $id ? DeliveryStartPoint::query()->where('active', true)->findOrFail($id) : null;
        $pickup = $shop($data['pickup_point_id'] ?? null);
        $finish = $shop($data['finish_point_id'] ?? null);
        $point = fn (?DeliveryStartPoint $shop): ?array => $shop ? ['latitude' => $shop->latitude, 'longitude' => $shop->longitude] : null;
        $stop = fn (Order $order): array => ['key' => $order->reference, 'latitude' => (float) $order->delivery_latitude, 'longitude' => (float) $order->delivery_longitude];
        $start = ['latitude' => (float) $data['start']['latitude'], 'longitude' => (float) $data['start']['longitude']];
        $waiting = $data['pickup_references'] ?? [];
        abort_if(array_diff($waiting, $data['references']) !== [], 422, 'Orders to pick up must be part of the route.');

        $plan = $pickup
            ? $planner->planWithPickup($start, $mapped->reject(fn (Order $order): bool => in_array($order->reference, $waiting, true))->map($stop)->values()->all(),
                $point($pickup), $mapped->filter(fn (Order $order): bool => in_array($order->reference, $waiting, true))->map($stop)->values()->all(), $point($finish))
            : $planner->plan($start, $mapped->map($stop)->values()->all(), $point($finish));

        return response()->json(['route' => [...$plan, 'unmapped' => $unmapped->pluck('reference')->values(),
            'pickup' => $pickup?->toPayload(), 'finish' => $finish?->toPayload()]]);
    }

    /** Starts a route: every chosen packaged order goes Out for delivery, and each customer is told. */
    public function start(Request $request, OrderWorkflow $workflow, OrderCustomerNotice $notices): JsonResponse
    {
        $courier = StaffAccess::requireStaffToken($request);
        $data = $request->validate(['references' => ['required', 'array', 'min:1', 'max:60'], 'references.*' => ['required', 'string', 'distinct', 'max:40']]);
        $started = [];
        foreach ($this->courierOrders($courier->id, $data['references']) as $order) {
            if ($order->workflow_stage !== 'packaged') {
                continue;
            }
            $event = $workflow->update($order->reference, ['request_id' => (string) Str::uuid(), 'version' => $order->workflow_version, 'action' => 'advance',
                'stage' => 'out_for_delivery', 'note' => 'Your delivery is coming today. '.Str::before($courier->name, ' ').' will bring it to the agreed address.']);
            $notices->send($event);
            $started[] = $order->reference;
        }

        return response()->json(['started' => $started]);
    }

    /**
     * The customer can't take the delivery today: the order comes off the route, goes back to Packaged (ready for a
     * later route) with a new due date if one was agreed, and the customer is told.
     */
    public function postpone(Request $request, string $reference, OrderCustomerNotice $notices): JsonResponse
    {
        $courier = StaffAccess::requireStaffToken($request);
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:500'],
            'new_date' => ['nullable', 'date_format:Y-m-d', 'after:today', 'before:+90 days'],
        ]);
        $event = DB::transaction(function () use ($reference, $courier, $data) {
            $order = Order::query()->where('reference', $reference)->where('assigned_courier_id', $courier->id)->whereNull('completed_at')->lockForUpdate()->firstOrFail();
            abort_unless($order->workflow_stage === 'out_for_delivery', 422, 'Only a delivery that is on the way can be moved to another day.');
            $date = filled($data['new_date'] ?? null) ? Carbon::parse($data['new_date']) : null;
            $order->forceFill([
                'workflow_stage' => 'packaged', 'status' => config('order_workflows.stages.packaged.label', 'Packaged'),
                'delivery_due_from' => $date ?? $order->delivery_due_from, 'delivery_due_by' => $date ?? $order->delivery_due_by,
                'workflow_version' => $order->workflow_version + 1,
            ])->save();
            $order->events()->create(['title' => 'Delivery not today', 'action_type' => 'note', 'client_visible' => false, 'occurred_at' => now(),
                'explanation' => trim($data['reason']).' ('.$courier->name.')']);

            return $order->events()->create(['title' => 'Delivery moved', 'action_type' => 'notify', 'stage_key' => 'packaged', 'client_visible' => true,
                'occurred_at' => now(), 'notified_at' => now(), 'external_status' => 'pending',
                'explanation' => $date ? 'Your delivery has been moved to '.$date->format('l j F').'. We’ll let you know when it’s on the way.'
                    : 'Your delivery won’t come today. The team will arrange a new day with you.']);
        });
        $notices->send($event);

        return response()->json(['postponed' => $reference]);
    }

    /**
     * @param  list<string>  $references
     * @return Collection<int, Order>
     */
    private function courierOrders(int $courierId, array $references)
    {
        $orders = Order::query()->whereIn('reference', $references)->where('assigned_courier_id', $courierId)->whereNull('completed_at')->get();
        abort_if($orders->count() !== count($references), 404, 'One of these deliveries isn’t yours or is already closed. Reload and try again.');

        return $orders->sortBy(fn (Order $order): int => (int) array_search($order->reference, $references, true))->values();
    }

    /** @return array<string, mixed> */
    private function delivery(Order $order, int $viewerId): array
    {
        return [
            'reference' => $order->reference, 'category' => $order->category, 'stage' => $order->workflow_stage, 'status' => $order->status,
            'can_deliver' => $order->workflow_stage === 'out_for_delivery' && $order->assigned_courier_id === $viewerId,
            'ready' => $order->workflow_stage === 'packaged',
            'zone' => $order->deliveryZone?->name, 'due_from' => $order->delivery_due_from?->toDateString(), 'due_by' => $order->delivery_due_by?->toDateString(),
            'courier' => $order->assignedCourier ? ['id' => $order->assignedCourier->id, 'name' => $order->assignedCourier->name] : null,
            'delivered_at' => $order->completed_at?->toIso8601String(),
            'customer' => ['name' => $order->customer->name, 'phone' => $order->customer->phone],
            'recipient_name' => $order->delivery_recipient_name, 'phone' => $order->delivery_phone,
            'address' => $order->delivery_address, 'area' => $order->delivery_area, 'gps_code' => $order->delivery_gps_code,
            'directions' => $order->delivery_directions, 'latitude' => $order->delivery_latitude, 'longitude' => $order->delivery_longitude,
            'instructions' => $order->handover_instructions,
            'garments' => $order->items->sortBy('sort_order')->map(fn (OrderItem $item): string => $item->garment_name)->values(),
        ];
    }
}
