<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\OrderCustomerNotice;
use App\OrderInspiration;
use App\OrderWorkflow;
use App\StaffAccess;
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

        // Clients and their fittings are searched separately (customers endpoint), so this stays small at any size.
        return response()->json([
            'customer_count' => Customer::query()->count(),
            'demo_customer_id' => Customer::query()->where('name', config('demo.customer_name'))->oldest('id')->value('id'),
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
            'delivery' => ['nullable', 'array:recipient_name,phone,address,area,gps_code,directions,latitude,longitude', 'prohibited_unless:fulfilment_method,Delivery'],
            'delivery.recipient_name' => ['nullable', 'string', 'max:100'],
            'delivery.phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+()\-\s]{7,30}$/'],
            'delivery.address' => ['required_with:delivery', 'string', 'max:255'],
            'delivery.area' => ['nullable', 'string', 'max:100'],
            'delivery.gps_code' => ['nullable', 'string', 'max:20', 'regex:/^[A-Za-z]{2}-?\d{3,4}-?\d{4}$/'],
            'delivery.directions' => ['nullable', 'string', 'max:1000'],
            'delivery.latitude' => ['nullable', 'required_with:delivery.longitude', 'numeric', 'between:-90,90'],
            'delivery.longitude' => ['nullable', 'required_with:delivery.latitude', 'numeric', 'between:-180,180'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'specifications' => ['nullable', 'string', 'max:3000'],
            'items' => ['required', 'array', 'list', 'min:1', 'max:20'],
            'items.*' => ['required', 'array:garment_name,wearer_name'],
            'items.*.garment_name' => ['required', 'string', 'max:150'],
            'items.*.wearer_name' => ['nullable', 'string', 'max:100'],
        ]);

        Gate::authorize($data['category'] === 'Alterations' ? 'staff.alterations.create' : 'staff.orders.manage');

        $source = $request->routeIs('demo.staff.studio.order-create') ? 'studio' : 'office';

        if (! empty($data['consultation_id']) && ! $request->boolean('consultation_held')) {
            throw ValidationException::withMessages(['consultation_held' => 'Confirm the consultation took place before linking it.']);
        }

        if (! empty($data['consultation_id']) && (int) $data['customer_id'] !== (int) Customer::query()->where('name', config('demo.customer_name'))->oldest('id')->value('id')) {
            throw ValidationException::withMessages(['consultation_id' => 'Choose the consultation’s customer.']);
        }

        $prefix = $data['category'] === 'Custom' ? 'NY-CUS-' : 'NY-ALT-';
        $reference = $prefix.strtoupper(substr(str_replace('-', '', $data['request_id']), 0, 16));

        try {
            $creator = $request->user()->id;
            $order = DB::transaction(function () use ($data, $reference, $source, $creator): Order {
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
                    'created_by_id' => $creator,
                    'status' => 'Order created', 'workflow_stage' => 'received',
                    'service_offering' => $data['service_offering'] ?? null,
                    'consultation_id' => $consultationId,
                    'measurement_id' => $data['measurement_id'] ?? null,
                    'expected_completion_date' => $data['expected_completion_date'] ?? null,
                    'fulfilment_method' => $data['fulfilment_method'] ?? null,
                    ...$this->deliveryColumns($data['delivery'] ?? null),
                    'specifications' => filled($data['specifications'] ?? null) ? trim($data['specifications']) : null,
                ]);
                if ($order->wasRecentlyCreated) {
                    $order->items()->createMany(array_map(
                        fn (array $item, int $position): array => [...$item, 'status' => 'Order created', 'sort_order' => $position],
                        $data['items'], array_keys($data['items']),
                    ));
                    $order->events()->create([
                        'title' => 'Order created', 'stage_key' => 'received', 'action_type' => 'created', 'explanation' => $data['notes'] ?? null, 'occurred_at' => now(),
                        'notified_at' => now(), 'external_status' => 'pending',
                    ]);
                    if ($order->measurement_id) {
                        OrderInspiration::moveFromFitting($order);
                        // A linked fitting confirms the measurements straight away.
                        if ($order->category === 'Custom') {
                            app(OrderWorkflow::class)->autoAdvance($order, ['measurements']);
                        }
                    }
                }

                return $order;
            }, 3);
        } catch (UniqueConstraintViolationException $error) {
            if (empty($data['consultation_id']) || ! Order::query()->where('consultation_id', $data['consultation_id'])->exists()) {
                throw $error;
            }
            abort(409, 'This consultation is already linked to an order.');
        }

        if ($order->wasRecentlyCreated && ($created = $order->events()->where('action_type', 'created')->whereNotNull('notified_at')->first())) {
            app(OrderCustomerNotice::class)->send($created);
        }

        return response()->json(['reference' => $order->reference], $order->wasRecentlyCreated ? 201 : 200);
    }

    private function requireStaffPreview(Request $request): void
    {
        StaffAccess::requireStaffToken($request);
    }

    /**
     * @param  array{recipient_name?: ?string, phone?: ?string, address?: string, area?: ?string, gps_code?: ?string, directions?: ?string, latitude?: float|string|null, longitude?: float|string|null}|null  $delivery
     * @return array<string, mixed>
     */
    private function deliveryColumns(?array $delivery): array
    {
        if (! $delivery) {
            return [];
        }
        $text = fn (string $key): ?string => filled($delivery[$key] ?? null) ? trim((string) $delivery[$key]) : null;
        $gps = $text('gps_code');

        return [
            'delivery_recipient_name' => $text('recipient_name'),
            'delivery_phone' => $text('phone'),
            'delivery_address' => $text('address'),
            'delivery_area' => $text('area'),
            'delivery_gps_code' => $gps ? strtoupper(preg_replace('/^([A-Za-z]{2})-?(\d{3,4})-?(\d{4})$/', '$1-$2-$3', $gps)) : null,
            'delivery_directions' => $text('directions'),
            'delivery_latitude' => isset($delivery['latitude']) ? round((float) $delivery['latitude'], 6) : null,
            'delivery_longitude' => isset($delivery['longitude']) ? round((float) $delivery['longitude'], 6) : null,
        ];
    }
}
