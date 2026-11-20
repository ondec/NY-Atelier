<?php

namespace App\Http\Controllers;

use App\CustomerSignIn;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Passkeys\Actions\GenerateRegistrationOptions;
use Laravel\Passkeys\Actions\GenerateVerificationOptions;
use Laravel\Passkeys\Actions\StorePasskey;
use Laravel\Passkeys\Actions\VerifyPasskey;
use Laravel\Passkeys\Support\WebAuthn;
use Throwable;
use Webauthn\PublicKeyCredential;
use Webauthn\PublicKeyCredentialCreationOptions;
use Webauthn\PublicKeyCredentialRequestOptions;

/**
 * Customer passkeys over Sanctum tokens. The WebAuthn options (and their challenge) stay on the
 * server in the cache under a single-use ceremony id, because the app has no web session.
 */
class CustomerPasskeyController extends Controller
{
    private const CEREMONY_MINUTES = 5;

    public function __construct(private CustomerSignIn $signIn) {}

    public function loginOptions(GenerateVerificationOptions $generate): JsonResponse
    {
        return response()->json($this->startCeremony('login', $generate()));
    }

    public function login(Request $request, VerifyPasskey $verify): JsonResponse
    {
        $data = $this->validateCeremony($request);
        /** @var PublicKeyCredentialRequestOptions $options */
        $options = $this->pullCeremony('login', $data['ceremonyId'], PublicKeyCredentialRequestOptions::class);
        $credential = $this->credential($data['credential']);

        try {
            $passkey = $verify($credential, $options);
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            report($exception);
            throw $this->invalid('We could not check that passkey. Try again or use your email or phone.');
        }

        $customer = $passkey->user;
        abort_unless($customer instanceof Customer, 422, 'We could not check that passkey. Try again or use your email or phone.');
        $customer->forceFill(['last_signed_in_at' => now()])->save();
        $this->signIn->record($customer, 'signed_in', 'passkey', ['passkeyId' => $passkey->id], $request->ip());

        return response()->json($this->signIn->session($customer, 'passkey'));
    }

    public function index(Request $request): JsonResponse
    {
        $passkeys = $this->customer($request)->passkeys()->latest('id')->get(['id', 'name', 'created_at', 'last_used_at']);

        return response()->json(['passkeys' => $passkeys->map(fn ($passkey) => [
            'id' => $passkey->id,
            'name' => $passkey->name,
            'createdAt' => $passkey->created_at?->toIso8601String(),
            'lastUsedAt' => $passkey->last_used_at?->toIso8601String(),
        ])]);
    }

    public function registrationOptions(Request $request, GenerateRegistrationOptions $generate): JsonResponse
    {
        $customer = $this->customer($request);

        return response()->json($this->startCeremony('register:'.$customer->id, $generate($customer)));
    }

    public function store(Request $request, StorePasskey $store): JsonResponse
    {
        $customer = $this->customer($request);
        $data = $this->validateCeremony($request, ['name' => ['nullable', 'string', 'max:80']]);
        /** @var PublicKeyCredentialCreationOptions $options */
        $options = $this->pullCeremony('register:'.$customer->id, $data['ceremonyId'], PublicKeyCredentialCreationOptions::class);
        $credential = $this->credential($data['credential']);

        try {
            $passkey = $store($customer, filled($data['name'] ?? null) ? trim($data['name']) : 'This phone', $credential, $options);
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            report($exception);
            throw $this->invalid('We could not save that passkey. Please try again.');
        }
        $this->signIn->record($customer, 'passkey_added', 'passkey', ['passkeyId' => $passkey->id], $request->ip());

        return response()->json(['customer' => $this->signIn->profile($customer)], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $customer = $this->customer($request);
        // A phone code alone must not be enough to remove a stronger sign-in method.
        abort_unless($customer->tokenCan('channel:email') || $customer->tokenCan('channel:passkey'), 403, 'For your security, sign in with your email or passkey to remove a passkey.');
        $passkey = $customer->passkeys()->whereKey($id)->firstOrFail();
        $passkey->delete();
        $this->signIn->record($customer, 'passkey_removed', 'passkey', ['passkeyId' => $id], $request->ip());

        return response()->json(['customer' => $this->signIn->profile($customer->refresh())]);
    }

    /** @return array{ceremonyId: string, options: array<string, mixed>} */
    private function startCeremony(string $purpose, PublicKeyCredentialCreationOptions|PublicKeyCredentialRequestOptions $options): array
    {
        $id = (string) Str::uuid();
        Cache::put($this->cacheKey($purpose, $id), WebAuthn::toJson($options), now()->addMinutes(self::CEREMONY_MINUTES));

        return ['ceremonyId' => $id, 'options' => WebAuthn::toBrowserArray($options)];
    }

    private function pullCeremony(string $purpose, string $id, string $class): PublicKeyCredentialCreationOptions|PublicKeyCredentialRequestOptions
    {
        $serialized = Cache::pull($this->cacheKey($purpose, $id));
        if (! is_string($serialized)) {
            throw $this->invalid('This passkey request expired. Try again.');
        }

        return WebAuthn::fromJson($serialized, $class);
    }

    private function cacheKey(string $purpose, string $id): string
    {
        return 'customer-passkey:'.$purpose.':'.$id;
    }

    /** @return array<string, mixed> */
    private function validateCeremony(Request $request, array $extra = []): array
    {
        return $request->validate([
            'ceremonyId' => ['required', 'uuid'],
            'credential' => ['required', 'array'],
            'credential.id' => ['required', 'string'],
            'credential.rawId' => ['required', 'string'],
            'credential.type' => ['required', 'string', 'in:public-key'],
            'credential.response' => ['required', 'array'],
            ...$extra,
        ]);
    }

    private function credential(array $credential): PublicKeyCredential
    {
        try {
            return WebAuthn::fromJson(json_encode($credential, JSON_THROW_ON_ERROR), PublicKeyCredential::class);
        } catch (Throwable) {
            throw $this->invalid('That passkey response could not be read. Please try again.');
        }
    }

    private function invalid(string $message): ValidationException
    {
        return ValidationException::withMessages(['credential' => $message]);
    }

    private function customer(Request $request): Customer
    {
        $customer = $request->user();
        abort_unless($customer instanceof Customer && $customer->tokenCan('customer'), 401, 'Please sign in again.');

        return $customer;
    }
}
