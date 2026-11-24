<?php

namespace App\Http\Controllers;

use App\CustomerSignIn;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class CustomerAuthController extends Controller
{
    public function __construct(private CustomerSignIn $signIn) {}

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'channel' => ['required', 'in:email,phone'],
            'destination' => ['required', 'string', 'max:254'],
            // Creating an account or resetting a password: applied after the emailed code or link.
            'password' => ['nullable', 'string', 'max:128', $this->passwordRule()],
        ]);

        return response()->json($this->signIn->start($data['channel'], $data['destination'], $request->ip(), $data['password'] ?? null), 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'max:254'],
            'password' => ['required', 'string', 'max:128'],
        ]);

        return response()->json($this->signIn->passwordSignIn($data['email'], $data['password'], $request->ip()));
    }

    public function password(Request $request): JsonResponse
    {
        $customer = $this->customer($request);
        $data = $request->validate([
            'currentPassword' => ['nullable', 'string', 'max:128'],
            'password' => ['required', 'string', 'max:128', $this->passwordRule()],
        ]);
        $this->signIn->changePassword($customer, $data['currentPassword'] ?? null, $data['password'], $request->ip());

        return response()->json(['customer' => $this->signIn->profile($customer->fresh())]);
    }

    private function passwordRule(): Password
    {
        return Password::min(8)->letters()->numbers();
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

    /**
     * Magic link page. The sign-in email links here (https), and this page opens the app with the
     * same challenge and token. It never signs anyone in itself, so link scanners in email apps
     * cannot use up the link; only the app verifies it.
     */
    public function link(Request $request): Response
    {
        $challenge = (string) $request->query('challenge', '');
        $token = (string) $request->query('token', '');
        $valid = Str::isUuid($challenge) && preg_match('/^[a-f0-9]{64}$/', $token) === 1;
        $appUrl = $valid ? config('customer_auth.app_link_base').'?'.http_build_query(['challenge' => $challenge, 'token' => $token]) : null;

        return response()->view('customer-sign-in-link', ['appUrl' => $appUrl], $valid ? 200 : 404)
            ->header('Cache-Control', 'no-store')
            ->header('Referrer-Policy', 'no-referrer')
            ->header('X-Robots-Tag', 'noindex');
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
