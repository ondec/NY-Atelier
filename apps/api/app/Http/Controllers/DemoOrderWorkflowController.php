<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\OrderCustomerNotice;
use App\OrderWorkflow;
use App\StaffAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DemoOrderWorkflowController extends Controller
{
    public function show(Request $request, string $reference, OrderWorkflow $workflow): JsonResponse
    {
        StaffAccess::requireStaffToken($request);
        $order = Order::query()->where('reference', $reference)->with(['customer', 'items', 'events'])->firstOrFail();

        return response()->json(['order' => $workflow->serialize($order, $request->user()->can('staff.orders.manage'))]);
    }

    public function update(Request $request, string $reference, OrderWorkflow $workflow, OrderCustomerNotice $notices): JsonResponse
    {
        StaffAccess::requireStaffToken($request);
        $data = $request->validate([
            'request_id' => ['required', 'uuid'], 'version' => ['required', 'integer', 'min:1'],
            'action' => ['required', Rule::in(['advance', 'skip', 'item_ready', 'handover', 'cancel', 'notify', 'note'])],
            'stage' => ['required_if:action,advance,skip', 'nullable', 'string', Rule::in(array_keys(config('order_workflows.stages')))],
            'note' => ['nullable', 'string', 'max:1000'], 'notify' => ['sometimes', 'boolean'], 'client_visible' => ['sometimes', 'boolean'],
            'item_id' => ['required_if:action,item_ready', 'integer'], 'ready' => ['sometimes', 'boolean'],
            'fulfilment_method' => ['required_if:action,handover', 'nullable', Rule::in(['Collection', 'Delivery'])],
            'handover_instructions' => ['nullable', 'string', 'max:1000'], 'courier_name' => ['nullable', 'string', 'max:150'], 'tracking_reference' => ['nullable', 'string', 'max:150'],
        ]);
        $event = $workflow->update($reference, $data);
        $notices->send($event);
        $order = Order::query()->where('reference', $reference)->with(['customer', 'items', 'events'])->firstOrFail();

        return response()->json(['order' => $workflow->serialize($order, $request->user()->can('staff.orders.manage')), 'notification' => $event->notified_at ? $workflow->notice($event->fresh()) : null]);
    }
}
