<?php

namespace App;

use App\Mail\StaffPasswordResetMail;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Throwable;

class StaffPasswordReset
{
    public const REQUEST_MESSAGE = 'If this email belongs to an active staff account, a password reset link will arrive shortly. Check your inbox and spam folder.';

    public const INVALID_MESSAGE = 'This password reset link is invalid or expired. Request a new link.';

    public function request(string $email, string $destination): void
    {
        // Never write a usable recovery link into a log or return it to an anonymous caller.
        if (! StaffInvitations::delivers()) {
            return;
        }
        try {
            $delivery = DB::transaction(function () use ($email, $destination): ?array {
                $user = $this->account($email)->lockForUpdate()->first();
                if (! $user) {
                    return null;
                }
                $mail = null;
                Password::broker('staff')->sendResetLink(['email' => $user->email], function (User $account, string $token) use ($destination, &$mail): void {
                    $url = config('staff.portal_url').'/staff/reset-password?next='.$destination.'#'.http_build_query([
                        'token' => $token, 'email' => $account->email,
                    ], '', '&', PHP_QUERY_RFC3986);
                    $mail = new StaffPasswordResetMail($account->email, $url, (int) config('auth.passwords.staff.expire'));
                });

                return $mail ? ['email' => $user->email, 'mail' => $mail] : null;
            }, 3);
            if ($delivery) {
                Mail::to($delivery['email'])->send($delivery['mail']);
            }
        } catch (Throwable $failure) {
            // Provider errors may contain URLs. Keep tokens and addresses out of application logs.
            Log::warning('Staff password reset email could not be sent.', ['exception' => $failure::class]);
        }
    }

    public function reset(string $email, #[\SensitiveParameter] string $token, #[\SensitiveParameter] string $password): bool
    {
        $resetUser = null;
        $status = DB::transaction(function () use ($email, $token, $password, &$resetUser): string {
            // Serialize reset, deactivation and replacement-link requests for this staff account.
            $user = $this->account($email)->lockForUpdate()->first();
            if (! $user) {
                return Password::InvalidUser;
            }

            return Password::broker('staff')->reset(['email' => $user->email, 'token' => $token, 'password' => $password], function (User $account, string $newPassword) use (&$resetUser): void {
                $account->forceFill(['password' => $newPassword, 'remember_token' => Str::random(60)])->save();
                $account->tokens()->delete();
                DB::table('staff_activation_tokens')->where('user_id', $account->id)->delete();
                $resetUser = $account;
            });
        }, 3);
        if ($status !== Password::PasswordReset) {
            return false;
        }
        event(new PasswordReset($resetUser));

        return true;
    }

    /** @return Builder<User> */
    private function account(string $email): Builder
    {
        return User::query()->whereRaw('LOWER(email) = ?', [Str::lower($email)])
            ->where('staff_active', true)->whereNull('staff_deactivated_at')
            ->whereIn('staff_role', array_keys(StaffAccess::PERMISSIONS));
    }
}
