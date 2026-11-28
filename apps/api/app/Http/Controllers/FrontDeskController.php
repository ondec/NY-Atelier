<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\OrderLocation;
use App\OrderWorkflow;
use App\StaffAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * NY Studio's front desk: the orders production has handed back (packed for handover, or returned with a reason),
 * and turning a Ready-to-Wear purchase into an alteration.
 */
class FrontDeskController extends Controller
{
    public function alerts(Request $request): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);
        $packed = Order::query()->whereIn('category', ['Custom', 'Alterations'])->where('workflow_stage', 'packaged')->whereNull('completed_at')
            ->whereNotNull('sent_to_production_at')->with(['customer', 'items', 'events'])->get()
            ->map(fn (Order $order): array => $this->alert($order, 'packed', $order->events->where('stage_key', 'packaged')->max('occurred_at') ?? $order->updated_at));
        $returned = Order::query()->whereIn('category', ['Custom', 'Alterations'])->whereNull('sent_to_production_at')->whereNotNull('returned_from_production_at')
            ->whereNull('completed_at')->with(['customer', 'items'])->get()
            ->map(fn (Order $order): array => $this->alert($order, 'returned', $order->returned_from_production_at, $order->production_return_reason));

        $toPackage = Order::query()->where('workflow_stage', 'production_done')->whereNotNull('handed_to_front_desk_at')->whereNull('completed_at')
            ->with(['customer', 'items'])->get()
            ->map(fn (Order $order): array => $this->alert($order, 'to_package', $order->handed_to_front_desk_at));

        $delivered = Order::query()->where('workflow_stage', 'delivered')->where('completed_at', '>=', now()->subDays(2))
            ->with(['customer', 'items'])->get()
            ->map(fn (Order $order): array => $this->alert($order, 'delivered', $order->completed_at));

        return response()->json([
            'alerts' => $packed->concat($returned)->concat($toPackage)->concat($delivered)->sortByDesc('arrived_at')->values(),
            'seen_at' => $user->front_desk_seen_at?->toIso8601String(),
        ]);
    }

    public function seen(Request $request): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);
        $user->forceFill(['front_desk_seen_at' => now()])->save();

        return response()->json(['seen_at' => $user->front_desk_seen_at->toIso8601String()]);
    }

    /**
     * A Ready-to-Wear purchase that needs adjusting becomes an alteration and follows the Alterations journey. Its sale
     * (payment and stock) stays recorded as Ready-to-Wear; original_category keeps that on the order.
     */
    public function needsAlteration(Request $request, string $reference, OrderWorkflow $workflow): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);
        $data = $request->validate(['specifications' => ['required', 'string', 'min:3', 'max:3000']]);

        DB::transaction(function () use ($reference, $data, $user): void {
            $order = Order::query()->where('reference', $reference)->lockForUpdate()->firstOrFail();
            abort_unless($order->category === 'Ready-to-Wear' && $order->completed_at === null, 422, 'Only a Ready-to-Wear order that hasn’t been handed over can become an alteration.');
            abort_if(in_array($order->workflow_stage, ['ready_collection', 'out_for_delivery'], true), 422, 'This order is already out for handover. Bring it back before changing it.');
            $order->forceFill([
                'category' => 'Alterations', 'original_category' => 'Ready-to-Wear', 'created_by_id' => $order->created_by_id ?? $user->id,
                'specifications' => trim($data['specifications']), 'workflow_stage' => 'received', 'status' => 'Order created',
                'fulfilment_status' => 'To be arranged', 'workflow_version' => $order->workflow_version + 1,
            ])->save();
            $order->items()->update(['status' => 'Order created', 'completed_at' => null]);
            $order->events()->create(['title' => 'Changed to an alteration', 'explanation' => trim($data['specifications'])." ({$user->name})",
                'action_type' => 'note', 'client_visible' => false, 'occurred_at' => now()]);
        });

        $order = Order::query()->where('reference', $reference)->with(['customer', 'items', 'events', 'assignedTailor'])->firstOrFail();

        return response()->json(['order' => $workflow->serialize($order, true, $user->can('staff.orders.manage'))]);
    }

    /** @return array<string, mixed> */
    private function alert(Order $order, string $kind, mixed $at, ?string $reason = null): array
    {
        return [
            'reference' => $order->reference, 'kind' => $kind, 'category' => $order->category, 'store' => OrderLocation::for($order), 'customer_id' => $order->customer_id,
            'customer_name' => $order->customer->name, 'garments' => $order->items->pluck('garment_name')->values(),
            'fulfilment_method' => $order->fulfilment_method, 'reason' => $reason,
            'arrived_at' => $at ? Carbon::parse($at)->toIso8601String() : null,
        ];
    }
}
