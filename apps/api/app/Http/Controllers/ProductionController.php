<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\User;
use App\OrderAlerts;
use App\OrderCustomerNotice;
use App\OrderProduction;
use App\OrderWorkflow;
use App\StaffAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * NY Office → Production. Production managers see every custom and alteration order sent to them, assign tailors,
 * mark production done after inspection and package the order for the front desk. Tailors see only the orders assigned to them. Neither sees prices or payments.
 */
class ProductionController extends Controller
{
    private const CATEGORIES = ['Custom', 'Alterations'];

    public function index(Request $request): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);
        $manage = $user->can('staff.production.manage');
        $orders = $this->visible($user)->with(['customer', 'items', 'assignedTailor'])
            ->withCount(['items'])
            ->orderByRaw("completed_at IS NOT NULL OR workflow_stage NOT IN ('in_production', 'production_done')")->orderByRaw('expected_completion_date IS NULL')->orderBy('expected_completion_date')->orderByDesc('id')
            ->get();
        $attachments = DB::table('order_attachments')->whereIn('order_id', $orders->pluck('id'))->selectRaw('order_id, count(*) as total')->groupBy('order_id')->pluck('total', 'order_id');

        return response()->json([
            'orders' => $orders->map(fn (Order $order): array => [
                'reference' => $order->reference, 'category' => $order->category, 'customer_name' => $order->customer->name,
                'service_offering' => config('demo.offerings')[$order->service_offering] ?? null, 'status' => $order->status,
                'expected_completion_date' => $order->expected_completion_date?->toDateString(), 'is_complete' => OrderProduction::isFinished($order),
                'fulfilment_method' => $order->fulfilment_method, 'created_at' => $order->created_at?->toIso8601String(),
                'items' => $order->items->map(fn ($item): array => ['garment_name' => $item->garment_name, 'wearer_name' => $item->wearer_name])->values(),
                'assigned_tailor' => $order->assignedTailor ? ['id' => $order->assignedTailor->id, 'name' => $order->assignedTailor->name] : null,
                'has_fitting' => $order->measurement_id !== null, 'inspiration_count' => (int) ($attachments[$order->id] ?? 0),
                'arrived_at' => ($manage ? $order->sent_to_production_at : $order->assigned_at)?->toIso8601String(),
            ])->values(),
            'tailors' => $manage ? $this->tailors() : [],
            'can_manage' => $manage,
            'seen_at' => $user->production_seen_at?->toIso8601String(),
        ]);
    }

    /** Marks NY Production notifications as read: orders that arrived before now are no longer new. */
    public function seen(Request $request): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);
        $user->forceFill(['production_seen_at' => now()])->save();

        return response()->json(['seen_at' => $user->production_seen_at->toIso8601String()]);
    }

    public function show(Request $request, string $reference, OrderWorkflow $workflow): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);

        return response()->json($this->detail($this->find($user, $reference), $user, $workflow));
    }

    public function assign(Request $request, string $reference, OrderWorkflow $workflow): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);
        $data = $request->validate(['tailor_id' => ['present', 'nullable', 'integer', Rule::exists('users', 'id')->where('staff_role', 'tailor')->where('staff_active', true)]]);
        $order = $this->find($user, $reference);
        abort_if($order->completed_at !== null, 422, 'This order is already complete.');

        DB::transaction(function () use ($order, $data): void {
            $order = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $tailor = $data['tailor_id'] ? User::query()->find($data['tailor_id']) : null;
            if ($order->assigned_tailor_id === $tailor?->id) {
                return;
            }
            $previous = $order->assignedTailor?->name;
            $order->forceFill(['assigned_tailor_id' => $tailor?->id, 'assigned_at' => $tailor ? now() : null])->save();
            $order->events()->create([
                'title' => $tailor ? ($previous ? "Reassigned to {$tailor->name}" : "Assigned to {$tailor->name}") : 'Tailor unassigned',
                'explanation' => $previous ? "Previously with {$previous}." : null,
                'action_type' => 'assignment', 'client_visible' => false, 'occurred_at' => now(),
            ]);
        });

        return response()->json($this->detail($order->fresh(), $user, $workflow));
    }

    public function workflow(Request $request, string $reference, OrderWorkflow $workflow, OrderCustomerNotice $notices): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);
        $this->find($user, $reference);
        $data = $request->validate(DemoOrderWorkflowController::rules());
        // NY Production records workroom steps, garment checks and notes; handover and cancellation stay with the front desk.
        abort_unless(in_array($data['action'], ['advance', 'item_ready', 'note'], true), 403, 'The front desk handles this from NY Office or NY Studio.');
        $event = $workflow->update($reference, $data);
        $notices->send($event);
        if ($event->stage_key === 'packaged' && $event->action_type === 'advance') {
            // Packed by production: back to the front desk for collection or delivery.
            OrderAlerts::backToFrontDesk($this->find($user, $reference));
        }
        $detail = $this->detail($this->find($user, $reference), $user, $workflow);

        return response()->json([...$detail, 'notification' => $event->notified_at ? $workflow->notice($event->fresh()) : null]);
    }

    /** Returns the order to the front desk with what needs fixing; it leaves NY Production until it is sent again. */
    public function sendBack(Request $request, string $reference): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);
        $data = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:1000']]);
        $order = $this->find($user, $reference);
        abort_if(OrderProduction::isMade($order), 422, 'Production is already finished for this order.');

        DB::transaction(function () use ($order, $data, $user): void {
            $order = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            // Back to the last front-desk stage, so sending it again approves and starts production afresh.
            $stage = $order->category === 'Custom' && $order->measurement_id ? 'measurements' : 'received';
            $order->forceFill(['sent_to_production_at' => null, 'sent_to_production_by_id' => null,
                'returned_from_production_at' => now(), 'production_return_reason' => trim($data['reason']), 'handed_to_front_desk_at' => null,
                'workflow_stage' => $stage, 'status' => config("order_workflows.stages.{$stage}.label"), 'workflow_version' => $order->workflow_version + 1])->save();
            $order->items()->whereNull('completed_at')->update(['status' => $order->status]);
            $order->events()->create(['title' => 'Returned from production', 'explanation' => trim($data['reason'])." ({$user->name})",
                'action_type' => 'production', 'client_visible' => false, 'occurred_at' => now()]);
        });

        OrderAlerts::returnedToFrontDesk($order, trim($data['reason']));

        return response()->json(['returned' => true]);
    }

    /** Hands a finished order to reception unpackaged; reception packs it and arranges the handover. */
    public function handToFrontDesk(Request $request, string $reference): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);
        $order = $this->find($user, $reference);
        abort_unless($order->workflow_stage === 'production_done' && $order->completed_at === null, 422, 'Mark production done first. A packaged order is already with reception.');
        abort_if($order->items->isEmpty() || $order->items->contains(fn ($item): bool => $item->completed_at === null), 422, 'Mark every garment ready before handing it to reception.');
        abort_if($order->handed_to_front_desk_at !== null, 409, 'This order is already with reception.');

        DB::transaction(function () use ($order, $user): void {
            $order = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $order->forceFill(['handed_to_front_desk_at' => now(), 'workflow_version' => $order->workflow_version + 1])->save();
            $order->events()->create(['title' => 'Sent to reception to package', 'explanation' => "Not packaged ({$user->name})",
                'action_type' => 'production', 'client_visible' => false, 'occurred_at' => now()]);
        });
        OrderAlerts::toPackage($order);

        return response()->json(['handed' => true]);
    }

    /** @return Builder<Order> */
    private function visible(User $user): Builder
    {
        return Order::query()->whereIn('category', self::CATEGORIES)->whereNotNull('sent_to_production_at')
            ->when(! $user->can('staff.production.manage'), fn (Builder $query) => $query->where('assigned_tailor_id', $user->id));
    }

    private function find(User $user, string $reference): Order
    {
        return $this->visible($user)->where('reference', $reference)->with(['customer', 'items', 'events', 'assignedTailor'])->firstOrFail();
    }

    /** @return list<array{id: int, name: string}> */
    private function tailors(): array
    {
        return User::query()->where('staff_role', 'tailor')->where('staff_active', true)->orderBy('name')->get(['id', 'name'])
            ->map(fn (User $tailor): array => ['id' => $tailor->id, 'name' => $tailor->name])->all();
    }

    private function detail(Order $order, User $user, OrderWorkflow $workflow): array
    {
        $manage = $user->can('staff.production.manage');
        $serialized = $workflow->serialize($order, true, $manage);
        // Production works without prices or payments.
        unset($serialized['payment_status']);
        $fitting = $order->measurement_id ? DB::table('customer_measurements')->where('id', $order->measurement_id)->first() : null;

        return [
            'order' => $serialized,
            'customer' => ['name' => $order->customer->name, 'phone' => $order->customer->phone, 'email' => $order->customer->email, 'account_reference' => $order->customer->account_reference],
            'fitting' => $fitting ? [
                'id' => $fitting->id, 'measured_on' => $fitting->measured_on, 'notes' => $fitting->notes,
                'garment_type' => $fitting->garment_type, 'unit' => 'cm', 'recorded_unit' => $fitting->recorded_unit,
                'values' => json_decode($fitting->values, true, 512, JSON_THROW_ON_ERROR),
                'additional_measurements' => json_decode($fitting->additional_measurements ?? '[]', true, 512, JSON_THROW_ON_ERROR),
                'pieces' => json_decode($fitting->pieces ?? '[]', true, 512, JSON_THROW_ON_ERROR),
                'attachments' => [],
            ] : null,
            'fields' => DemoCustomerController::MEASUREMENTS,
            'templates' => config('fittings.templates'),
            'pieces' => config('fittings.pieces'),
            'tailors' => $manage ? $this->tailors() : [],
            'can_manage' => $manage,
        ];
    }
}
