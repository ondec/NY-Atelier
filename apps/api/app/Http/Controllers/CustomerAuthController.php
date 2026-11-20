<?php

namespace App\Http\Controllers;

use App\CustomerSignIn;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerAuthController extends Controller
{
    public function __construct(private CustomerSignIn $signIn) {}

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'channel' => ['required', 'in:email,phone'],
            'destination' => ['required', 'string', 'max:254'],
        ]);

        return response()->json($this->signIn->start($data['channel'], $data['destination'], $request->ip()), 201);
    }

    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challengeId' => ['required', 'uuid'],
            'code' => ['nullable', 'required_without:token', 'string', 'regex:/^\d{6}$/'],
            'token' => ['nullable', 'required_without:code', 'string', 'regex:/^[a-f0-9]{64}$/'],
            'name' => ['nullable', 'string', 'max:150'],
        ]);

        return response()->json($this->signIn->verify($data['challengeId'], $data['code'] ?? null, $data['token'] ?? null, $data['name'] ?? null, $request->ip()));
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['customer' => $this->signIn->profile($this->customer($request))]);
    }

    public function update(Request $request): JsonResponse
    {
        $customer = $this->customer($request);
        $data = $request->validate(['name' => ['required', 'string', 'min:2', 'max:150']]);
        $customer->forceFill(['name' => trim($data['name'])])->save();

        return response()->json(['customer' => $this->signIn->profile($customer)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $customer = $this->customer($request);
        $customer->currentAccessToken()->delete();
        $this->signIn->record($customer, 'signed_out', null, [], $request->ip());

        return response()->json(['signedOut' => true]);
    }

    private function customer(Request $request): Customer
    {
        $customer = $request->user();
        abort_unless($customer instanceof Customer && $customer->tokenCan('customer'), 401, 'Please sign in again.');

        return $customer;
    }
}
