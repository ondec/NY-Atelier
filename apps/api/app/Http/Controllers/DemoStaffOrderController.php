<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DemoStaffOrderController extends Controller
{
    public function options(Request $request): JsonResponse
    {
        $this->requireStaffPreview($request);
        $customers = Customer::query()->orderBy('name')->get(['id', 'name']);

        return response()->json([
            'customers' => $customers,
            'demo_customer_id' => Customer::query()->where('name', config('demo.customer_name'))->oldest('id')->value('id'),
            'measurements' => DB::table('customer_measurements')->orderByDesc('measured_on')->orderByDesc('id')->get(['id', 'customer_id', 'measured_on']),
            'offerings' => config('demo.offerings'),
            'consultations' => DB::table('consultations')->where('status', 'confirmed')
                ->whereNotExists(fn ($query) => $query->selectRaw('1')->from('orders')->whereColumn('orders.consultation_id', 'consultations.id'))
                ->orderByDesc('confirmedDate')->get(['id', 'purpose', 'confirmedDate', 'confirmedTime']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->requireStaffPreview($request);
        $data = $request->validate([
            'request_id' => ['required', 'uuid'],
            'category' => ['required', Rule::in(['Custom', 'Alterations'])],
            'customer_id' => ['required', 'integer', Rule::exists('customers', 'id')],
            'service_offering' => ['required_if:category,Custom', 'prohibited_unless:category,Custom', 'nullable', Rule::in(array_keys(config('demo.offerings')))],
            'consultation_id' => ['nullable', 'uuid', 'prohibited_unless:category,Custom'],
            'measurement_id' => ['nullable', 'integer', Rule::exists('customer_measurements', 'id')->where('customer_id', $request->integer('customer_id'))],
            'expected_completion_date' => ['nullable', 'date_format:Y-m-d'],
            'fulfilment_method' => ['nullable', Rule::in(['Collection', 'Delivery'])],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'list', 'min:1', 'max:20'],
            'items.*' => ['required', 'array:garment_name,wearer_name'],
            'items.*.garment_name' => ['required', 'string', 'max:150'],
            'items.*.wearer_name' => ['nullable', 'string', 'max:100'],
        ]);

        Gate::authorize($data['category'] === 'Alterations' ? 'staff.alterations.create' : 'staff.orders.manage');

        $source = $request->routeIs('demo.staff.studio.order-create') ? 'studio' : 'office';
        abort_if($source === 'studio' && $data['category'] !== 'Alterations', 403, 'Only alteration orders can be issued here.');

        if (! empty($data['consultation_id']) && ! $request->boolean('consultation_held')) {
            throw ValidationException::withMessages(['consultation_held' => 'Confirm the consultation took place before linking it.']);
        }

        if (! empty($data['consultation_id']) && (int) $data['customer_id'] !== (int) Customer::query()->where('name', config('demo.customer_name'))->oldest('id')->value('id')) {
            throw ValidationException::withMessages(['consultation_id' => 'Choose the consultation’s customer.']);
        }

        $prefix = $data['category'] === 'Custom' ? 'NY-CUS-' : 'NY-ALT-';
        $reference = $prefix.strtoupper(substr(str_replace('-', '', $data['request_id']), 0, 16));

        try {
            $order = DB::transaction(function () use ($data, $reference, $source): Order {
                $existing = Order::query()->where('reference', $reference)->first();
                if ($existing) {
                    return $existing;
                }

                $consultationId = $data['consultation_id'] ?? null;
                if ($consultationId && ! DB::table('consultations')->where('id', $consultationId)->where('status', 'confirmed')->exists()) {
                    throw ValidationException::withMessages(['consultation_id' => 'Choose a confirmed consultation.']);
                }

                $order = Order::query()->createOrFirst(['reference' => $reference], [
                    'customer_id' => $data['customer_id'],
                    'category' => $data['category'],
                    'source' => $source,
                    'status' => 'Order received', 'workflow_stage' => 'received',
                    'service_offering' => $data['service_offering'] ?? null,
                    'consultation_id' => $consultationId,
                    'measurement_id' => $data['measurement_id'] ?? null,
                    'expected_completion_date' => $data['expected_completion_date'] ?? null,
                    'fulfilment_method' => $data['fulfilment_method'] ?? null,
                ]);
                if ($order->wasRecentlyCreated) {
                    $order->items()->createMany(array_map(
                        fn (array $item, int $position): array => [...$item, 'status' => 'Order received', 'sort_order' => $position],
                        $data['items'], array_keys($data['items']),
                    ));
                    $order->events()->create([
                        'title' => 'Order received', 'stage_key' => 'received', 'action_type' => 'created', 'explanation' => $data['notes'] ?? null, 'occurred_at' => now(),
                    ]);
                }

                return $order;
            }, 3);
        } catch (UniqueConstraintViolationException $error) {
            if (empty($data['consultation_id']) || ! Order::query()->where('consultation_id', $data['consultation_id'])->exists()) {
                throw $error;
            }
            abort(409, 'This consultation is already linked to an order.');
        }

        return response()->json(['reference' => $order->reference], $order->wasRecentlyCreated ? 201 : 200);
    }

    private function requireStaffPreview(Request $request): void
    {
        abort_unless(config('demo.enabled') && in_array($request->ip(), ['127.0.0.1', '::1'], true), 404);
    }
}
