<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\StaffAccess;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DemoConsultationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Staff always see consultations; the customer demo list exists only while the demo API is enabled.
        abort_unless(config('demo.enabled') || $request->user()?->can('staff.consultations'), 404);

        return response()->json($this->records()
            ->when(! $request->user()?->can('staff.consultations'), fn ($query) => $query->where('consultations.customer_id', Customer::query()->where('name', config('demo.customer_name'))->oldest('id')->value('id')))
            ->orderByDesc('consultations.created_at')->orderByDesc('consultations.id')->get()
            ->map(fn (object $row): array => $this->present($row)));
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless(config('demo.enabled'), 404);
        $data = $request->validate([
            'id' => ['required', 'uuid'],
            'method' => ['required', 'in:in-person,virtual'],
            'purpose' => ['required', 'string', 'max:150'],
            'preferredDate' => ['required', 'date_format:Y-m-d'],
            'preferredTime' => ['required', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $row = DB::table('consultations')->where('id', $data['id'])->first();
        if ($row) {
            return response()->json($this->present($this->records()->where('consultations.id', $row->id)->first()));
        }

        $this->requireFuture($data['preferredDate'], $data['preferredTime']);
        $customer = Customer::query()->firstOrCreate(['name' => config('demo.customer_name')]);
        DB::table('consultations')->upsert([
            ...$data, 'customer_id' => $customer->id, 'status' => 'awaiting-confirmation', 'created_at' => now(), 'updated_at' => now(),
        ], ['id'], ['id']);

        return response()->json($this->present($this->records()->where('consultations.id', $data['id'])->first()), 201);
    }

    public function staff(Request $request, string $id): JsonResponse
    {
        StaffAccess::requireStaffToken($request);
        $data = $request->validate([
            'action' => ['required', 'in:confirm,propose'],
            'version' => ['required', 'integer', 'min:1'],
            'options' => ['required_if:action,propose', 'array', 'min:1', 'max:3'],
            'options.*' => ['required', 'array:date,time'],
            'options.*.date' => ['required', 'date_format:Y-m-d'],
            'options.*.time' => ['required', 'date_format:H:i'],
        ]);

        $row = $this->current($id, $data['version'], ['awaiting-confirmation', 'needs-alternatives']);
        if ($data['action'] === 'confirm') {
            abort_unless($row->status === 'awaiting-confirmation', 409, 'The customer asked for other options.');
            $this->requireFuture($row->preferredDate, $row->preferredTime);

            return $this->update($row, [
                'status' => 'confirmed', 'confirmedDate' => $row->preferredDate, 'confirmedTime' => $row->preferredTime,
            ]);
        }

        $options = array_values($data['options']);
        if (count(array_unique(array_map(fn (array $option): string => implode(' ', [$option['date'], $option['time']]), $options))) !== count($options)) {
            throw ValidationException::withMessages(['options' => 'Choose different dates or times for each option.']);
        }
        foreach ($options as $option) {
            $this->requireFuture($option['date'], $option['time']);
        }

        return $this->update($row, ['status' => 'awaiting-customer', 'options' => json_encode($options, JSON_THROW_ON_ERROR)]);
    }

    public function customer(Request $request, string $id): JsonResponse
    {
        abort_unless(config('demo.enabled'), 404);
        $data = $request->validate([
            'action' => ['required', 'in:accept,decline'],
            'version' => ['required', 'integer', 'min:1'],
            'option' => ['required_if:action,accept', 'integer', 'min:0', 'max:2'],
        ]);
        $row = $this->current($id, $data['version'], ['awaiting-customer']);
        abort_unless($row->customer_id !== null, 404);
        if ($data['action'] === 'decline') {
            return $this->update($row, ['status' => 'needs-alternatives', 'options' => null]);
        }

        $option = json_decode($row->options, true, 512, JSON_THROW_ON_ERROR)[$data['option']] ?? null;
        abort_unless($option, 422, 'Choose one of the proposed times.');
        $this->requireFuture($option['date'], $option['time']);

        return $this->update($row, [
            'status' => 'confirmed', 'confirmedDate' => $option['date'], 'confirmedTime' => $option['time'],
        ]);
    }

    /** @param list<string> $statuses */
    protected function current(string $id, int $version, array $statuses): object
    {
        $row = DB::table('consultations')->where('id', $id)->first();
        abort_unless($row, 404);
        abort_unless((int) $row->version === $version && in_array($row->status, $statuses, true), 409, 'The request changed. Refresh and try again.');

        return $row;
    }

    /** @param array<string, string|null> $changes */
    protected function update(object $row, array $changes): JsonResponse
    {
        $affected = DB::table('consultations')->where('id', $row->id)->where('version', $row->version)
            ->update([...$changes, 'version' => $row->version + 1, 'updated_at' => now()]);
        abort_unless($affected === 1, 409, 'The request changed. Refresh and try again.');

        return response()->json($this->present($this->records()->where('consultations.id', $row->id)->first()));
    }

    protected function records(): Builder
    {
        return DB::table('consultations')
            ->leftJoin('customers', 'customers.id', '=', 'consultations.customer_id')
            ->leftJoin('orders', 'orders.consultation_id', '=', 'consultations.id')
            ->select('consultations.*', 'orders.reference as order_reference')
            ->selectRaw('COALESCE(customers.name, consultations.contact_name) as customer_name')
            ->selectRaw('COALESCE(customers.email, consultations.contact_email) as customer_email')
            ->selectRaw('COALESCE(customers.phone, consultations.contact_phone) as customer_phone');
    }

    protected function requireFuture(string $date, string $time): void
    {
        if ("$date $time" <= now('Africa/Accra')->format('Y-m-d H:i')) {
            throw ValidationException::withMessages(['time' => 'Choose a future time in Accra.']);
        }
    }

    /** @return array<string, mixed> */
    protected function present(object $row): array
    {
        $result = (array) $row;
        $result['order_reference'] ??= null;
        $result['options'] = $row->options ? json_decode($row->options, true, 512, JSON_THROW_ON_ERROR) : [];

        return $result;
    }
}
