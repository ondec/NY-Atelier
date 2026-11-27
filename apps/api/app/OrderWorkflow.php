<?php

namespace App;

use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderWorkflow
{
    public function stage(Order $order): string
    {
        if ($order->workflow_stage) {
            return $order->workflow_stage;
        }

        $known = array_search($order->status, array_map(fn (array $stage): string => $stage['label'], config('order_workflows.stages')), true);
        if ($order->status === 'Order received') {
            return 'received';
        }

        return match ($order->status) {
            'Collected' => 'collected', 'Delivered' => 'delivered',
            'Cancelled', 'Canceled' => 'cancelled',
            'Preparing' => 'received',
            'Your outfit is being made', 'Adjustments in progress', 'Final checks', 'Final checks complete' => $order->category === 'Ready-to-Wear' ? 'received' : 'in_production',
            default => $known ?: ($order->completed_at ? ($order->fulfilment_method === 'Delivery' ? 'delivered' : 'collected') : 'received'),
        };
    }

    public function steps(Order $order): array
    {
        $keys = [...config('order_workflows.preparation.'.$order->category, ['received']), ...config('order_workflows.handover.'.$order->fulfilment_method, [])];

        return array_map(fn (string $key): array => ['key' => $key, ...config('order_workflows.stages.'.$key), 'phase' => in_array($key, config('order_workflows.preparation.'.$order->category, []), true) ? 'Preparation' : 'Handover',
            'in_production' => in_array($key, self::productionStages($order), true),
            'notify' => in_array($key, config('order_workflows.customer_notify', []), true)], $keys);
    }

    /** @return list<string> The stages NY Production owns for this order (In production, Production done, Packaged). */
    public static function productionStages(Order $order): array
    {
        return config('order_workflows.production.'.$order->category, []);
    }

    /**
     * Why the current user may not move the order to $next, or null if they may. Workroom steps are updated from
     * NY Production by the production manager once the order has been sent; NY Production updates nothing else.
     */
    public function advanceBlock(Order $order, array $next): ?string
    {
        if ($next['auto'] ?? false) {
            return $next['key'] === 'measurements'
                ? 'This step moves on its own when the customer’s fitting is linked to the order.'
                : 'This step moves on its own when the front desk sends the order to production.';
        }
        $onProductionDesk = request()->is('api/demo/staff/production/*');
        if (! $next['in_production']) {
            return $onProductionDesk ? 'The front desk records this step.' : null;
        }
        if ($order->sent_to_production_at === null) {
            return 'Send the order to production first.';
        }

        return request()->user()?->can('staff.production.manage') ? null : 'The production manager records this step in NY Production.';
    }

    public function describe(Order $order, bool $staff, ?bool $manage = null): array
    {
        $manage ??= $staff;
        $steps = $this->steps($order);
        if (! $staff) {
            $steps = array_map(fn (array $step): array => [...$step, 'help' => config('order_workflows.customer_help.'.$step['key'], $step['help'])], $steps);
        }
        $current = $this->stage($order);
        $index = array_search($current, array_column($steps, 'key'), true);
        $closed = $order->completed_at !== null || $current === 'cancelled';
        $latestNotice = $order->events->first(fn (OrderEvent $event): bool => $event->notified_at !== null);
        $next = ! $closed && $index !== false ? ($steps[$index + 1] ?? null) : null;
        $blocked = $next ? $this->advanceBlock($order, $next) : null;

        $described = [
            'version' => $order->workflow_version, 'current' => $current, 'closed' => $closed,
            'legacy' => $order->workflow_stage === null,
            'steps' => array_map(function (array $step, int $position) use ($order, $index, $current): array {
                $event = $order->events->first(fn (OrderEvent $event): bool => ($event->stage_key === $step['key'] && in_array($event->action_type, ['advance', 'skip', 'created'], true)) || ($event->stage_key === null && $event->title === $step['label']));

                // A stage after the current one is upcoming even if it was recorded before (e.g. a delivery moved to another day).
                $reached = $index === false || $position <= $index;
                $moved = $step['key'] === 'out_for_delivery' && ! $reached && $order->delivery_due_by
                    && $order->events->contains(fn (OrderEvent $event): bool => $event->title === 'Delivery moved');

                return [...$step, 'is_current' => $step['key'] === $current, 'recorded_at' => $reached ? $event?->occurred_at->toIso8601String() : null,
                    'state' => $event && $reached ? ($event->action_type === 'skip' ? 'skipped' : 'recorded') : ($reached ? 'unrecorded' : 'upcoming'),
                    'note' => $moved ? 'Moved to '.$order->delivery_due_by->format('D j M') : null];
            }, $steps, array_keys($steps)),
            'next' => $next,
            'can_manage' => $manage,
            'can_advance' => $manage && $next !== null && $blocked === null,
            'advance_blocked' => $manage && $next !== null ? $blocked : null,
            'can_cancel' => $manage && ! $closed && $current !== 'out_for_delivery',
            'can_edit_handover' => $manage && ! $closed,
            'can_change_method' => $manage && ! $closed && $current !== 'out_for_delivery',
            'can_mark_items' => $manage && ! $closed && in_array($current, config('order_workflows.preparation.'.$order->category, []), true) && $current !== 'packaged',
            ...($staff ? ['notification_route' => $order->customer->email ? 'email' : ($order->customer->phone ? 'sms' : 'no_contact'), 'latest_notification' => $latestNotice ? $this->notice($latestNotice) : null, 'current_notification' => ($currentNotice = $this->currentNotice($order)) ? $this->notice($currentNotice) : null] : []),
        ];

        return $staff ? $described : $this->forCustomer($described);
    }

    /** Customers see In production and Production done as one "In production" step. */
    private function forCustomer(array $described): array
    {
        $grouped = config('order_workflows.production_customer_group', []);
        $steps = [];
        $group = null;
        foreach ($described['steps'] as $step) {
            if (! in_array($step['key'], $grouped, true)) {
                $steps[] = $step;

                continue;
            }
            if ($group === null) {
                $group = count($steps);
                $steps[] = ['key' => 'production', ...config('order_workflows.production_customer_step'), 'action' => null, 'phase' => 'Preparation', 'in_production' => true,
                    'is_current' => false, 'recorded_at' => $step['recorded_at'], 'state' => $step['state']];
            }
            $steps[$group]['is_current'] = $steps[$group]['is_current'] || $step['is_current'];
            $steps[$group]['recorded_at'] ??= $step['recorded_at'];
        }
        $position = array_search(true, array_column($steps, 'is_current'), true);

        return [...$described, 'steps' => $steps,
            'current' => in_array($described['current'], $grouped, true) ? 'production' : $described['current'],
            'next' => $described['closed'] || $position === false ? null : ($steps[$position + 1] ?? null)];
    }

    private function currentNotice(Order $order): ?OrderEvent
    {
        $stage = $this->stage($order);
        $stageEvent = $order->events->first(fn (OrderEvent $event): bool => $event->stage_key === $stage && in_array($event->action_type, ['advance', 'skip', 'created'], true));

        return $order->events->first(fn (OrderEvent $event): bool => $event->stage_key === $stage && $event->notified_at !== null && (! $stageEvent || $event->id >= $stageEvent->id));
    }

    public function notice(OrderEvent $event): array
    {
        return ['in_app' => $event->notified_at?->toIso8601String(), 'channel' => $event->external_channel, 'status' => $event->external_status];
    }

    /**
     * @param  bool  $staff  Staff detail (internal notes, delivery, specifications, inspiration).
     * @param  bool|null  $manage  Whether the viewer may update the order; defaults to $staff.
     */
    public function serialize(Order $order, bool $staff, ?bool $manage = null): array
    {
        $order->loadMissing(['customer', 'items', 'events', 'assignedTailor']);
        $manage ??= $staff;

        return [
            ...($staff ? ['measurement_id' => $order->measurement_id, 'customer_id' => $order->customer_id, 'delivery' => $order->fulfilment_method === 'Delivery' && $order->delivery_address ? [
                'recipient_name' => $order->delivery_recipient_name, 'phone' => $order->delivery_phone, 'address' => $order->delivery_address,
                'area' => $order->delivery_area, 'gps_code' => $order->delivery_gps_code, 'directions' => $order->delivery_directions,
                'latitude' => $order->delivery_latitude, 'longitude' => $order->delivery_longitude,
            ] : null,
                'specifications' => $order->specifications,
                'assigned_tailor' => $order->assignedTailor ? ['id' => $order->assignedTailor->id, 'name' => $order->assignedTailor->name] : null,
                'assigned_at' => $order->assigned_at?->toIso8601String(),
                'assigned_courier' => $order->assignedCourier ? ['id' => $order->assignedCourier->id, 'name' => $order->assignedCourier->name] : null,
                'production' => OrderProduction::state($order, request()->user()),
                'attachments' => DB::table('order_attachments')->where('order_id', $order->id)->orderBy('created_at')->orderBy('name')
                    ->get(['id', 'name', 'mime_type', 'size'])->map(fn (object $file): array => (array) $file)->values(),
            ] : []),
            'delivery_promise' => $order->fulfilment_method === 'Delivery' && $order->delivery_due_by ? [
                'zone_id' => $order->delivery_zone_id, 'area' => $order->deliveryZone?->name,
                'from' => $order->delivery_due_from?->toDateString(), 'by' => $order->delivery_due_by->toDateString(),
            ] : null,
            'reference' => $order->reference, 'category' => $order->category, 'original_category' => $order->original_category, 'customer_name' => $order->customer->name,
            'source' => $order->source,
            'status' => $order->status, 'service_offering' => config('demo.offerings')[$order->service_offering] ?? null,
            'consultation_id' => $order->consultation_id,
            'expected_completion_date' => $order->expected_completion_date?->toDateString(),
            'date_change_explanation' => $order->date_change_explanation,
            'fulfilment_method' => $order->fulfilment_method, 'fulfilment_status' => $order->fulfilment_status,
            'handover_instructions' => $order->handover_instructions, 'courier_name' => $order->courier_name, 'tracking_reference' => $order->tracking_reference,
            'payment_status' => $order->payment_status, 'client_action' => $order->client_action,
            'completed_at' => $order->completed_at?->toIso8601String(), 'is_complete' => $order->completed_at !== null, 'item_count' => $order->items->count(), 'completed_item_count' => $order->items->whereNotNull('completed_at')->count(),
            'items' => $order->items->map(fn (OrderItem $item): array => ['id' => $item->id, 'garment_name' => $item->garment_name, 'wearer_name' => $item->wearer_name, 'status' => $item->status, 'is_ready' => $item->completed_at !== null, 'expected_completion_date' => $item->expected_completion_date?->toDateString()])->values(),
            'workflow' => $this->describe($order, $staff, $manage),
            'timeline' => $order->events->filter(fn (OrderEvent $event): bool => $staff || $event->client_visible)->map(fn (OrderEvent $event): array => [
                'id' => $event->id, 'title' => $event->title, 'explanation' => $event->explanation, 'occurred_at' => $event->occurred_at->toIso8601String(),
                'stage_key' => $event->stage_key, 'action_type' => $event->action_type, 'notified_at' => $event->notified_at?->toIso8601String(),
                ...($staff ? ['client_visible' => $event->client_visible, 'notification' => $event->notified_at ? $this->notice($event) : null] : []),
            ])->values(),
        ];
    }

    /**
     * Moves the order through $keys without anyone clicking: each key is taken only when it is the order's next step.
     * Main customer stages are marked for notification; pass the returned events to OrderCustomerNotice after the
     * transaction. Call with the order locked.
     *
     * @param  list<string>  $keys
     * @return list<OrderEvent>
     */
    public function autoAdvance(Order $order, array $keys, ?string $explanation = null): array
    {
        $events = [];
        foreach ($keys as $key) {
            $steps = $this->steps($order);
            $index = array_search($this->stage($order), array_column($steps, 'key'), true);
            $next = $index === false ? null : ($steps[$index + 1] ?? null);
            if ($order->completed_at !== null || ! $next || $next['key'] !== $key) {
                continue;
            }
            $order->workflow_stage = $key;
            $order->status = $next['label'];
            $order->workflow_version++;
            $order->save();
            $order->items()->whereNull('completed_at')->update(['status' => $order->status]);
            $events[] = $order->events()->create(['title' => $next['label'], 'stage_key' => $key, 'action_type' => 'advance', 'client_visible' => true,
                'occurred_at' => now(), 'explanation' => $explanation, ...($next['notify'] ? ['notified_at' => now(), 'external_status' => 'pending'] : [])]);
        }

        return $events;
    }

    public function update(string $reference, array $data): OrderEvent
    {
        return DB::transaction(function () use ($reference, $data): OrderEvent {
            $order = Order::query()->where('reference', $reference)->lockForUpdate()->firstOrFail();
            $hash = hash('sha256', json_encode($data));
            $existing = OrderEvent::query()->where('action_key', $data['request_id'])->first();
            if ($existing) {
                abort_unless($existing->order_id === $order->id && $existing->request_hash === $hash, 409, 'This update identifier was already used for a different action.');

                return $existing;
            }
            abort_unless($order->workflow_version === $data['version'], 409, 'This order has changed. Refresh it before updating.');
            $order->load(['items', 'events', 'customer']);
            $state = $this->describe($order, true);
            $action = $data['action'];
            $note = trim($data['note'] ?? '');
            $event = ['action_key' => $data['request_id'], 'request_hash' => $hash, 'action_type' => $action, 'occurred_at' => now(), 'client_visible' => true, 'explanation' => $note ?: null];
            if (in_array($action, ['advance', 'skip'], true)) {
                abort_if($state['closed'], 422, 'Closed orders cannot move to another stage.');
                $next = $state['next'];
                if (! $next || $next['key'] !== ($data['stage'] ?? null)) {
                    throw ValidationException::withMessages(['stage' => 'Choose the next stage in this order’s workflow.']);
                }
                if ($action === 'skip' && (! ($next['optional'] ?? false) || ! $note)) {
                    throw ValidationException::withMessages(['note' => 'Only an optional fitting may be skipped. Record why it is not required.']);
                }
                if (($next['note_required'] ?? false) && ! $note) {
                    throw ValidationException::withMessages(['note' => 'Record the recipient and handover confirmation.']);
                }
                if ($next['key'] === 'packaged' && ($order->items->isEmpty() || $order->items->contains(fn (OrderItem $item): bool => $item->completed_at === null))) {
                    throw ValidationException::withMessages(['stage' => 'Every garment must be marked ready before packaging.']);
                }
                if ($blocked = $this->advanceBlock($order, $next)) {
                    abort(403, $blocked);
                }
                if ($next['key'] === 'out_for_delivery' && ! $order->delivery_address && ! $order->handover_instructions) {
                    throw ValidationException::withMessages(['handover_instructions' => 'Add the delivery address in Handover before sending it out for delivery.']);
                }
                $order->workflow_stage = $next['key'];
                $order->status = $action === 'skip' ? 'Fitting not required' : $next['label'];
                if ($next['phase'] === 'Handover' || $next['key'] === 'packaged') {
                    $order->fulfilment_status = $order->status;
                }
                if ($next['terminal'] ?? false) {
                    $order->completed_at = now();
                    $order->client_action = null;
                    $order->items()->update(['status' => $order->status]);
                } elseif ($next['phase'] === 'Preparation' && $next['key'] !== 'packaged') {
                    $order->items()->whereNull('completed_at')->update(['status' => $order->status]);
                }
                $event = [...$event, 'title' => $order->status, 'stage_key' => $next['key']];
            } elseif ($action === 'item_ready') {
                abort_unless($state['can_mark_items'], 422, 'Garment readiness can only change before packaging.');
                $item = $order->items()->whereKey($data['item_id'] ?? 0)->firstOrFail();
                $ready = $data['ready'] ?? true;
                if (! $ready && ! $note) {
                    throw ValidationException::withMessages(['note' => 'Explain the further work required for this garment.']);
                }
                $item->update(['status' => $ready ? 'Final checks complete' : 'Final quality check', 'completed_at' => $ready ? now() : null]);
                $event = [...$event, 'order_item_id' => $item->id, 'title' => $ready ? 'Garment ready' : 'Garment needs further work', 'explanation' => $item->garment_name.($note ? ' · '.$note : '')];
            } elseif ($action === 'handover') {
                abort_unless($state['can_edit_handover'], 422, 'Handover is already complete.');
                $method = $data['fulfilment_method'] ?? null;
                if (! $method) {
                    throw ValidationException::withMessages(['fulfilment_method' => 'Choose collection or delivery.']);
                }
                if ($method !== $order->fulfilment_method) {
                    abort_unless($state['can_change_method'], 422, 'The courier handover has started. The fulfilment method cannot be changed.');
                    if ($order->fulfilment_method && ! $note) {
                        throw ValidationException::withMessages(['note' => 'Explain the change to collection or delivery.']);
                    }
                    if ($state['current'] === 'ready_collection') {
                        $order->workflow_stage = 'packaged';
                        $order->status = 'Packaged';
                        $order->fulfilment_status = 'Packaged';
                    }
                }
                if ($method === 'Delivery' && $state['current'] === 'out_for_delivery' && empty($data['handover_instructions']) && ! $order->delivery_address) {
                    throw ValidationException::withMessages(['handover_instructions' => 'Keep the agreed delivery address and instructions while delivery is in progress.']);
                }
                $order->fulfilment_method = $method;
                $order->handover_instructions = $data['handover_instructions'] ?? null;
                $order->courier_name = $method === 'Delivery' ? ($data['courier_name'] ?? null) : null;
                $order->tracking_reference = $method === 'Delivery' ? ($data['tracking_reference'] ?? null) : null;
                $event = [...$event, 'title' => 'Handover arrangements updated', 'explanation' => implode("\n", array_filter([$method, $order->handover_instructions, $order->courier_name ? 'Courier: '.$order->courier_name : null, $order->tracking_reference ? 'Tracking: '.$order->tracking_reference : null, $note]))];
            } elseif ($action === 'cancel') {
                abort_unless($state['can_cancel'], 422, 'This order cannot be cancelled at its current stage.');
                if (! $note) {
                    throw ValidationException::withMessages(['note' => 'Record the reason for cancellation.']);
                }
                $order->workflow_stage = 'cancelled';
                $order->status = 'Cancelled';
                $order->completed_at = now();
                $order->fulfilment_status = 'Cancelled';
                $order->client_action = null;
                $event = [...$event, 'title' => 'Cancelled', 'stage_key' => 'cancelled'];
            } elseif ($action === 'notify') {
                $previous = $this->currentNotice($order);
                if ($previous) {
                    return $previous;
                }
                $event = [...$event, 'title' => 'Customer update issued', 'stage_key' => $state['current'], 'explanation' => $order->status.($note ? ' · '.$note : '')];
            } else {
                if (! $note) {
                    throw ValidationException::withMessages(['note' => 'Enter the update to record.']);
                }
                $event = [...$event, 'title' => 'Order note', 'client_visible' => $data['client_visible'] ?? true];
            }
            $mainStage = in_array($action, ['advance', 'skip'], true) && in_array($event['stage_key'] ?? null, config('order_workflows.customer_notify', []), true);
            if ($action === 'notify' || $mainStage || (($data['notify'] ?? false) && $event['client_visible'])) {
                $event['notified_at'] = now();
                $event['external_status'] = 'pending';
            }
            $order->workflow_version++;
            $order->save();

            return $order->events()->create($event);
        }, 3);
    }
}
