<?php

namespace App;

use App\Mail\StaffInvitationMail;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

/**
 * Owner-issued staff invitations. Uses the same one-use, hashed staff_activation_tokens as `staff:invite`,
 * so the existing /staff/activate page and StaffAuthController::activate finish the setup.
 * Active accounts are never changed: inviting an email that already has an active account is refused.
 */
class StaffInvitations
{
    /** Mailers that never deliver. Invitations are not sent through them, so setup links stay out of logs. */
    private const NON_DELIVERING = ['log', 'array'];

    /** @return array{user: User, setupUrl: ?string, delivery: string, expiresAt: Carbon} */
    public function invite(string $name, string $email, string $role): array
    {
        $email = Str::lower(trim($email));
        $name = trim($name);
        abort_unless(in_array($role, StaffAccess::INVITABLE_ROLES, true), 422, 'Choose a role that can be invited.');
        $token = bin2hex(random_bytes(32));
        $expiresAt = now()->addHours(config('staff.invitation_hours'));

        $user = DB::transaction(function () use ($name, $email, $role, $token, $expiresAt): User {
            $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->lockForUpdate()->first();
            if ($user && $user->staff_deactivated_at !== null) {
                throw new HttpException(409, 'This person’s account is deactivated. Reactivate it from Team instead.');
            }
            if ($user && $user->staff_active) {
                throw new HttpException(409, 'Someone with this email already has an active staff account. Their access was not changed.');
            }
            if ($user && ! in_array($user->staff_role, StaffAccess::INVITABLE_ROLES, true)) {
                throw new HttpException(409, 'This email belongs to another kind of account. No access was changed.');
            }
            $user ??= new User(['email' => $email, 'password' => Str::random(64)]);
            $user->name = $name;
            $user->staff_role = $role;
            $user->staff_active = false;
            $user->save();
            $this->syncMember($user);
            $this->storeToken($user, $token, $expiresAt);

            return $user;
        }, 3);

        return $this->deliver($user, $token, $expiresAt);
    }

    /** @return array{user: User, setupUrl: ?string, delivery: string, expiresAt: Carbon} */
    public function resend(int $memberId): array
    {
        $token = bin2hex(random_bytes(32));
        $expiresAt = now()->addHours(config('staff.invitation_hours'));
        $user = DB::transaction(function () use ($memberId, $token, $expiresAt): User {
            $userId = DB::table('staff_members')->where('id', $memberId)->value('user_id');
            $user = $userId ? User::query()->lockForUpdate()->find($userId) : null;
            abort_unless($user, 404, 'This team member has no staff account to invite.');
            abort_if($user->staff_active, 409, 'This account is already active. Their access was not changed.');
            abort_if($user->staff_deactivated_at !== null, 409, 'Reactivate this account before sending a new invitation.');
            abort_unless(in_array($user->staff_role, StaffAccess::INVITABLE_ROLES, true), 409, 'This account cannot be invited from NY Office.');
            $this->storeToken($user, $token, $expiresAt);

            return $user;
        }, 3);

        return $this->deliver($user, $token, $expiresAt);
    }

    public static function delivers(): bool
    {
        return ! in_array(config('mail.default'), self::NON_DELIVERING, true);
    }

    private function syncMember(User $user): void
    {
        $label = StaffAccess::ROLE_LABELS[$user->staff_role];
        $existing = DB::table('staff_members')->where('user_id', $user->id)->first();
        if ($existing) {
            DB::table('staff_members')->where('id', $existing->id)->update(['name' => $user->name, 'job_title' => $label, 'updated_at' => now()]);

            return;
        }
        DB::table('staff_members')->insert(['user_id' => $user->id, 'name' => $user->name, 'job_title' => $label, 'salary_eligible' => false,
            'sort_order' => 200, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function storeToken(User $user, string $token, Carbon $expiresAt): void
    {
        // One outstanding link per account: a new invitation replaces (and invalidates) the previous one.
        DB::table('staff_activation_tokens')->where('user_id', $user->id)->delete();
        DB::table('staff_activation_tokens')->insert(['user_id' => $user->id, 'hash' => hash('sha256', $token), 'expires_at' => $expiresAt]);
    }

    /** @return array{user: User, setupUrl: ?string, delivery: string, expiresAt: Carbon} */
    private function deliver(User $user, string $token, Carbon $expiresAt): array
    {
        $url = config('staff.portal_url').'/staff/activate#token='.$token;
        $delivery = 'not_configured';
        if (self::delivers()) {
            try {
                Mail::to($user->email, $user->name)->send(new StaffInvitationMail($user->name, StaffAccess::ROLE_LABELS[$user->staff_role], $url, $expiresAt));
                $delivery = 'sent';
            } catch (Throwable $failure) {
                Log::warning('Staff invitation email could not be sent.', ['user_id' => $user->id, 'error' => $failure::class, 'reason' => Str::limit($failure->getMessage(), 400)]);
                $delivery = 'failed';
            }
        }

        // The owner only receives the link when email did not go out, so it can be shared another way.
        return ['user' => $user, 'setupUrl' => $delivery === 'sent' ? null : $url, 'delivery' => $delivery, 'expiresAt' => $expiresAt];
    }
}
