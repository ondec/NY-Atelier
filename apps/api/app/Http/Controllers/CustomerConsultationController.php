<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Consultations booked in the app by a signed-in customer. They join the same queue NY Office
 * works from, under the customer's own account, so staff see who asked and can reach them.
 * Unlike the demo endpoints, these work whether or not demo mode is on.
 */
class CustomerConsultationController extends DemoConsultationController
{
    public function mine(Request $request): JsonResponse
    {
        $customer = $this->signedIn($request);

        return response()->json($this->records()->where('consultations.customer_id', $customer->id)
            ->orderByDesc('consultations.created_at')->orderByDesc('consultations.id')->get()
            ->map(fn (object $row): array => $this->present($row)));
    }

    public function book(Request $request): JsonResponse
    {
        $customer = $this->signedIn($request);
        $data = $request->validate([
            'id' => ['required', 'uuid'],
            'method' => ['required', 'in:in-person,virtual'],
            'purpose' => ['required', 'string', 'max:150'],
            'preferredDate' => ['required', 'date_format:Y-m-d'],
            'preferredTime' => ['required', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        // A retried request returns the booking it already made; another customer's id is refused.
        $existing = DB::table('consultations')->where('id', $data['id'])->first();
        if ($existing) {
            abort_unless((int) $existing->customer_id === $customer->id, 409, 'This request could not be saved. Try again.');

            return response()->json($this->present($this->records()->where('consultations.id', $existing->id)->first()));
        }

        $this->requireFuture($data['preferredDate'], $data['preferredTime']);
        DB::table('consultations')->insert([
            ...$data, 'customer_id' => $customer->id, 'source' => 'app', 'status' => 'awaiting-confirmation',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return response()->json($this->present($this->records()->where('consultations.id', $data['id'])->first()), 201);
    }

    public function reply(Request $request, string $id): JsonResponse
    {
        $customer = $this->signedIn($request);
        $row = DB::table('consultations')->where('id', $id)->first();
        abort_unless($row && (int) $row->customer_id === $customer->id, 404);

        $data = $request->validate([
            'action' => ['required', 'in:accept,decline'],
            'version' => ['required', 'integer', 'min:1'],
            'option' => ['required_if:action,accept', 'integer', 'min:0', 'max:2'],
        ]);
        $row = $this->current($id, $data['version'], ['awaiting-customer']);
        if ($data['action'] === 'decline') {
            return $this->update($row, ['status' => 'needs-alternatives', 'options' => null]);
        }

        $option = json_decode($row->options, true, 512, JSON_THROW_ON_ERROR)[$data['option']] ?? null;
        abort_unless($option, 422, 'Choose one of the proposed times.');
        $this->requireFuture($option['date'], $option['time']);

        return $this->update($row, ['status' => 'confirmed', 'confirmedDate' => $option['date'], 'confirmedTime' => $option['time']]);
    }

    private function signedIn(Request $request): Customer
    {
        $customer = $request->user();
        abort_unless($customer instanceof Customer && $customer->tokenCan('customer'), 401, 'Please sign in again.');

        return $customer;
    }
}
