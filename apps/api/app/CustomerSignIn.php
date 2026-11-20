<?php

namespace App;

use App\Mail\CustomerSignInAlertMail;
use App\Mail\CustomerSignInCodeMail;
use App\Models\Customer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CustomerSignIn
{
    public function __construct(private CustomerSms $sms) {}

    /** Normalizes a phone number to +E.164, treating local numbers as Ghanaian. */
    public static function normalizePhone(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }
        $trimmed = trim($phone);
        $digits = preg_replace('/\D+/', '', $trimmed);
        $country = config('customer_auth.default_country_code', '233');
        if ($digits === '' || $digits === null) {
            return null;
        }
        if (str_starts_with($trimmed, '+')) {
            $normalized = $digits;
        } elseif (str_starts_with($digits, '00')) {
            $normalized = substr($digits, 2);
        } elseif (str_starts_with($digits, '0') && strlen($digits) === 10) {
            $normalized = $country.substr($digits, 1);
        } elseif (str_starts_with($digits, $country) && strlen($digits) === 12) {
            $normalized = $digits;
        } elseif (strlen($digits) === 9) {
            $normalized = $country.$digits;
        } else {
            return null;
        }

        return strlen($normalized) >= 8 && strlen($normalized) <= 15 ? '+'.$normalized : null;
    }

    public static function normalizeDestination(string $channel, string $destination): ?string
    {
        if ($channel === 'phone') {
            return self::normalizePhone($destination);
        }
        $email = Str::lower(trim($destination));

        return filter_var($email, FILTER_VALIDATE_EMAIL) && strlen($email) <= 254 ? $email : null;
    }

    /** @return array{challengeId: string, channel: string, destination: string, expiresAt: string} */
    public function start(string $channel, string $destination, ?string $ip): array
    {
        $normalized = self::normalizeDestination($channel, $destination);
        if (! $normalized) {
            throw ValidationException::withMessages(['destination' => $channel === 'phone' ? 'Enter a valid phone number.' : 'Enter a valid email address.']);
        }
        $key = 'customer-sign-in:'.hash('sha256', $normalized);
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages(['destination' => 'Too many codes were requested. Please wait a few minutes and try again.']);
        }
        RateLimiter::hit($key, 15 * 60);

        $minutes = (int) config('customer_auth.code_minutes', 15);
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $linkToken = $channel === 'email' ? bin2hex(random_bytes(32)) : null;
        $id = (string) Str::uuid();
        $expiresAt = now()->addMinutes($minutes);

        DB::transaction(function () use ($id, $channel, $normalized, $code, $linkToken, $expiresAt, $ip) {
            // A new request replaces any earlier unused code for the same destination.
            DB::table('customer_sign_in_challenges')->where('destination', $normalized)->whereNull('consumed_at')->update(['consumed_at' => now()]);
            DB::table('customer_sign_in_challenges')->insert([
                'id' => $id,
                'channel' => $channel,
                'destination' => $normalized,
                'code_hash' => $this->hash($id.'|code|'.$code),
                'link_hash' => $linkToken ? $this->hash($id.'|link|'.$linkToken) : null,
                'expires_at' => $expiresAt,
                'ip' => $ip,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        if ($channel === 'email') {
            $link = config('customer_auth.link_base').'?'.http_build_query(['challenge' => $id, 'token' => $linkToken]);
            Mail::to($normalized)->send(new CustomerSignInCodeMail($code, $link, $minutes));
        } else {
            $this->sms->send($normalized, "Your NY Atelier sign-in code is {$code}. It expires in {$minutes} minutes. Never share it with anyone, including NY Atelier staff.");
        }

        return ['challengeId' => $id, 'channel' => $channel, 'destination' => self::mask($channel, $normalized), 'expiresAt' => $expiresAt->toIso8601String()];
    }

    /** Verifies a code or magic-link token once, then signs the customer in. */
    public function verify(string $challengeId, ?string $code, ?string $linkToken, ?string $name, ?string $ip): array
    {
        [$customer, $result] = DB::transaction(function () use ($challengeId, $code, $linkToken, $name, $ip) {
            $row = DB::table('customer_sign_in_challenges')->where('id', $challengeId)->lockForUpdate()->first();
            $invalid = fn (string $message) => ValidationException::withMessages(['code' => $message]);
            if (! $row || $row->consumed_at || Carbon::parse($row->expires_at)->isPast()) {
                throw $invalid('This code has expired or was already used. Request a new one.');
            }
            if ($row->attempts >= (int) config('customer_auth.max_attempts', 5)) {
                throw $invalid('Too many incorrect attempts. Request a new code.');
            }
            $matches = $code !== null
                ? hash_equals($row->code_hash, $this->hash($row->id.'|code|'.$code))
                : ($linkToken !== null && $row->link_hash !== null && hash_equals($row->link_hash, $this->hash($row->id.'|link|'.$linkToken)));
            if (! $matches) {
                DB::table('customer_sign_in_challenges')->where('id', $row->id)->increment('attempts');

                // Throw after the transaction commits the attempt count.
                return [null, $row->attempts + 1];
            }
            DB::table('customer_sign_in_challenges')->where('id', $row->id)->update(['consumed_at' => now(), 'updated_at' => now()]);

            $customer = $this->findOrCreate($row->channel, $row->destination, $name);
            $customer->forceFill([
                $row->channel === 'email' ? 'email_verified_at' : 'phone_verified_at' => now(),
                'first_signed_in_at' => $customer->first_signed_in_at ?? now(),
                'last_signed_in_at' => now(),
            ])->save();
            $this->record($customer, 'signed_in', $row->channel, ['method' => $code !== null ? 'code' : 'link'], $ip);

            return [$customer, $row->channel];
        }, 3);

        if (! $customer instanceof Customer) {
            $left = max(0, (int) config('customer_auth.max_attempts', 5) - $result);
            throw ValidationException::withMessages(['code' => $left > 0 ? "That code is not right. You have {$left} more ".Str::plural('try', $left).'.' : 'Too many incorrect attempts. Request a new code.']);
        }

        if ($customer->hasPasskeysEnabled()) {
            $this->alertFallbackSignIn($customer, $result, $ip);
        }

        return $this->session($customer, $result);
    }

    /** Issues a device session token. The channel ability records how the customer proved who they are. */
    public function session(Customer $customer, string $channel): array
    {
        $token = $customer->createToken('NY customer · '.$channel, ['customer', 'channel:'.$channel], now()->addDays((int) config('customer_auth.session_days', 60)));

        return ['token' => $token->plainTextToken, 'expiresAt' => $token->accessToken->expires_at?->toIso8601String(), 'customer' => $this->profile($customer)];
    }

    /** A one-time code was used although the customer has a passkey: log it and tell them by email. Never blocks sign-in. */
    private function alertFallbackSignIn(Customer $customer, string $channel, ?string $ip): void
    {
        $this->record($customer, 'fallback_sign_in', $channel, [], $ip);
        if (blank($customer->email)) {
            return;
        }
        try {
            Mail::to($customer->email)->send(new CustomerSignInAlertMail($channel));
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    public function profile(Customer $customer): array
    {
        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'phone' => $customer->phone,
            'emailVerified' => $customer->email_verified_at !== null,
            'phoneVerified' => $customer->phone_verified_at !== null,
            'firstSignedInAt' => $customer->first_signed_in_at?->toIso8601String(),
            'passkey' => $this->passkeyStatus($customer),
        ];
    }

    /** offer after the first order; required once the configured number of days has passed since first sign-in. */
    public function passkeyStatus(Customer $customer): array
    {
        $requiredFrom = $customer->first_signed_in_at?->copy()->addDays((int) config('customer_auth.passkey_required_after_days', 30));
        $enrolled = $customer->hasPasskeysEnabled();
        $status = match (true) {
            $enrolled => 'enrolled',
            $requiredFrom !== null && $requiredFrom->isPast() => 'required',
            $customer->orders()->exists() => 'offer',
            default => 'not_yet',
        };

        return ['status' => $status, 'requiredFrom' => $requiredFrom?->toIso8601String()];
    }

    public function record(?Customer $customer, string $type, ?string $channel, array $details, ?string $ip): void
    {
        DB::table('customer_auth_events')->insert([
            'customer_id' => $customer?->id,
            'type' => $type,
            'channel' => $channel,
            'details' => json_encode($details),
            'ip' => $ip,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function findOrCreate(string $channel, string $destination, ?string $name): Customer
    {
        $existing = $channel === 'email'
            ? Customer::query()->whereRaw('LOWER(email) = ?', [$destination])->oldest('id')->lockForUpdate()->first()
            : Customer::query()->where('phone_e164', $destination)->oldest('id')->lockForUpdate()->first();
        if ($existing) {
            if (blank($existing->name) && filled($name)) {
                $existing->name = Str::limit(trim($name), 150, '');
            }

            return $existing;
        }

        $customer = new Customer;
        $customer->name = filled($name) ? Str::limit(trim($name), 150, '') : 'New customer';
        $channel === 'email' ? $customer->email = $destination : $customer->phone = $destination;
        $customer->save();

        return $customer;
    }

    private function hash(string $value): string
    {
        return hash_hmac('sha256', $value, (string) config('app.key'));
    }

    private static function mask(string $channel, string $destination): string
    {
        if ($channel === 'phone') {
            return substr($destination, 0, 4).str_repeat('•', max(0, strlen($destination) - 7)).substr($destination, -3);
        }
        [$local, $domain] = explode('@', $destination, 2);

        return Str::substr($local, 0, 1).str_repeat('•', max(1, Str::length($local) - 1)).'@'.$domain;
    }
}
