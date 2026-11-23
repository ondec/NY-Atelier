<?php

namespace App;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;

/**
 * Owner-only changes to existing staff accounts from NY Office → Team.
 * Owner accounts (including the signed-in owner's own) are never changed here.
 */
class StaffTeam
{
    public function changeRole(User $owner, int $memberId, string $role): User
    {
        abort_unless(in_array($role, StaffAccess::INVITABLE_ROLES, true), 422, 'Choose a role that can be assigned.');

        return DB::transaction(function () use ($owner, $memberId, $role): User {
            $user = $this->manageable($owner, $memberId);
            $user->staff_role = $role;
            $user->save();
            DB::table('staff_members')->where('user_id', $user->id)->update(['job_title' => StaffAccess::ROLE_LABELS[$role], 'updated_at' => now()]);

            // Permissions are read from the role on every request, so the change applies to open sessions immediately.
            return $user;
        }, 3);
    }

    public function deactivate(User $owner, int $memberId): User
    {
        return DB::transaction(function () use ($owner, $memberId): User {
            $user = $this->manageable($owner, $memberId);
            abort_if($user->staff_deactivated_at !== null, 409, 'This account is already deactivated.');
            // Remember that a working account finished setup, so reactivation can restore sign-in without a new invitation.
            if ($user->staff_active && $user->email_verified_at === null) {
                $user->email_verified_at = now();
            }
            $user->staff_active = false;
            $user->staff_deactivated_at = now();
            $user->save();
            $user->tokens()->delete();
            Password::broker('staff')->deleteToken($user);
            DB::table('staff_activation_tokens')->where('user_id', $user->id)->delete();

            return $user;
        }, 3);
    }

    public function reactivate(User $owner, int $memberId): User
    {
        return DB::transaction(function () use ($owner, $memberId): User {
            $user = $this->manageable($owner, $memberId);
            abort_if($user->staff_deactivated_at === null, 409, 'This account is not deactivated.');
            $user->staff_deactivated_at = null;
            // People who had finished setup sign in again with their existing password; pending invitees need a new invitation.
            $user->staff_active = $user->email_verified_at !== null;
            $user->save();

            return $user;
        }, 3);
    }

    private function manageable(User $owner, int $memberId): User
    {
        $userId = DB::table('staff_members')->where('id', $memberId)->value('user_id');
        $user = $userId ? User::query()->lockForUpdate()->find($userId) : null;
        abort_unless($user, 404, 'This team member has no staff account.');
        abort_if($user->id === $owner->id, 409, 'You can’t change your own access.');
        abort_unless(in_array($user->staff_role, StaffAccess::INVITABLE_ROLES, true), 409, 'Owner accounts can’t be changed from NY Office.');

        return $user;
    }
}
