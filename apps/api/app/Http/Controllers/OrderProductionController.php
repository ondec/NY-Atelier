<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\OrderAlerts;
use App\OrderCustomerNotice;
use App\OrderInspiration;
use App\OrderProduction;
use App\OrderWorkflow;
use App\StaffAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** The front desk completes an order's production brief and sends it to NY Production. */
class OrderProductionController extends Controller
{
    /** Adds or changes the specifications and linked fitting before the order goes to production. */
    public function brief(Request $request, string $reference, OrderWorkflow $workflow): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);
        $order = Order::query()->where('reference', $reference)->firstOrFail();
        abort_unless(OrderProduction::canPrepare($user, $order), 403, 'This order is already in production or you can’t change it.');
        $data = $request->validate([
            'specifications' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'measurement_id' => ['sometimes', 'nullable', 'integer', Rule::exists('customer_measurements', 'id')->where('customer_id', $order->customer_id)],
        ]);

        DB::transaction(function () use ($order, $data, $workflow): void {
            $order = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if (array_key_exists('specifications', $data)) {
                $order->specifications = filled($data['specifications']) ? trim($data['specifications']) : null;
            }
            $linked = array_key_exists('measurement_id', $data) && $data['measurement_id'] && $data['measurement_id'] !== $order->measurement_id;
            if (array_key_exists('measurement_id', $data)) {
                $order->measurement_id = $data['measurement_id'];
            }
            $order->save();
            if ($linked) {
                OrderInspiration::moveFromFitting($order);
                // Linking the fitting confirms the measurements.
                $workflow->autoAdvance($order, ['measurements']);
            }
        });

        return response()->json(['order' => $workflow->serialize($this->fresh($reference), true, $user->can('staff.orders.manage'))]);
    }

    /** Sending approves the design (or the alteration assessment) and starts production. */
    public function send(Request $request, string $reference, OrderWorkflow $workflow, OrderCustomerNotice $notices): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);

        $events = DB::transaction(function () use ($reference, $user, $workflow): array {
            $order = Order::query()->where('reference', $reference)->lockForUpdate()->firstOrFail();
            abort_unless(OrderProduction::canPrepare($user, $order), 403, 'This order is already in production or you can’t send it.');
            $missing = OrderProduction::missing($order);
            if ($missing) {
                throw ValidationException::withMessages(['production' => $missing]);
            }
            $returned = $order->returned_from_production_at !== null;
            $order->forceFill(['sent_to_production_at' => now(), 'sent_to_production_by_id' => $user->id,
                'returned_from_production_at' => null, 'production_return_reason' => null])->save();
            $order->events()->create(['title' => $returned ? 'Sent back to production' : 'Sent to production', 'explanation' => "By {$user->name}.",
                'action_type' => 'production', 'client_visible' => false, 'occurred_at' => now()]);

            return $workflow->autoAdvance($order, $order->category === 'Alterations' ? ['assessment', 'in_production'] : ['measurements', 'design', 'in_production']);
        });
        foreach ($events as $event) {
            if ($event->notified_at) {
                $notices->send($event);
            }
        }
        $order = $this->fresh($reference);
        OrderAlerts::sentToProduction($order);

        return response()->json(['order' => $workflow->serialize($order, true, $user->can('staff.orders.manage'))]);
    }

    private function fresh(string $reference): Order
    {
        return Order::query()->where('reference', $reference)->with(['customer', 'items', 'events', 'assignedTailor'])->firstOrFail();
    }
}
