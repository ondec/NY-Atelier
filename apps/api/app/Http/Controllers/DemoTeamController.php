<?php

namespace App\Http\Controllers;

use App\StaffAccess;
use App\StaffInvitations;
use App\StaffTeam;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DemoTeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = StaffAccess::requireStaffToken($request);

        return response()->json(['members' => $this->members($request), 'emailDelivery' => StaffInvitations::delivers(),
            'invitableRoles' => collect(StaffAccess::INVITABLE_ROLES)->filter(fn (string $role): bool => StaffAccess::canAssign($actor, $role))
                ->values()->map(fn (string $role): array => ['id' => $role, 'label' => StaffAccess::ROLE_LABELS[$role]])]);
    }

    public function invite(Request $request, StaffInvitations $invitations): JsonResponse
    {
        $actor = StaffAccess::requireStaffToken($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', Rule::in(StaffAccess::INVITABLE_ROLES)],
        ]);
        abort_unless(StaffAccess::canAssign($actor, $data['role']), 403, 'You can only invite roles with no more access than your own.');
        // A pending invitation may be corrected by inviting again; never one above the actor's own access.
        $pending = DB::table('users')->where('email', mb_strtolower(trim($data['email'])))->where('staff_active', false)->whereIn('staff_role', StaffAccess::INVITABLE_ROLES)->value('staff_role');
        abort_if($pending && ! StaffAccess::canAssign($actor, $pending), 403, 'You can’t change this account.');

        return $this->invited($request, $invitations->invite($data['name'], $data['email'], $data['role']), 201);
    }

    public function resend(Request $request, StaffInvitations $invitations, int $member): JsonResponse
    {
        $actor = StaffAccess::requireStaffToken($request);
        $role = DB::table('staff_members')->join('users', 'users.id', '=', 'staff_members.user_id')->where('staff_members.id', $member)->value('users.staff_role');
        abort_if(in_array($role, StaffAccess::INVITABLE_ROLES, true) && ! StaffAccess::canAssign($actor, $role), 403, 'You can’t change this account.');

        return $this->invited($request, $invitations->resend($member));
    }

    public function role(Request $request, StaffTeam $team, int $member): JsonResponse
    {
        $owner = StaffAccess::requireStaffToken($request);
        $data = $request->validate(['role' => ['required', Rule::in(StaffAccess::INVITABLE_ROLES)]]);

        return $this->changed($request, $team->changeRole($owner, $member, $data['role'])->id);
    }

    public function deactivate(Request $request, StaffTeam $team, int $member): JsonResponse
    {
        return $this->changed($request, $team->deactivate(StaffAccess::requireStaffToken($request), $member)->id);
    }

    public function reactivate(Request $request, StaffTeam $team, int $member): JsonResponse
    {
        return $this->changed($request, $team->reactivate(StaffAccess::requireStaffToken($request), $member)->id);
    }

    private function changed(Request $request, int $userId): JsonResponse
    {
        return response()->json(['member' => collect($this->members($request))->firstWhere('user_id', $userId)])->header('Cache-Control', 'no-store');
    }

    private function invited(Request $request, array $result, int $status = 200): JsonResponse
    {
        return response()->json([
            'member' => collect($this->members($request))->firstWhere('user_id', $result['user']->id),
            'delivery' => $result['delivery'], 'setupUrl' => $result['setupUrl'], 'expiresAt' => $result['expiresAt']->toIso8601String(),
        ], $status)->header('Cache-Control', 'no-store');
    }

    private function members(Request $request): array
    {
        $actor = $request->user();
        $ownerId = $actor->id;

        return DB::table('staff_members')
            ->leftJoin('users', 'users.id', '=', 'staff_members.user_id')
            ->leftJoin('staff_activation_tokens', 'staff_activation_tokens.user_id', '=', 'staff_members.user_id')
            ->orderBy('staff_members.sort_order')->orderBy('staff_members.id')
            ->get(['staff_members.id', 'staff_members.name', 'staff_members.job_title', 'staff_members.salary_eligible', 'staff_members.user_id',
                'users.email', 'users.staff_role', 'users.staff_active', 'users.staff_deactivated_at', 'staff_activation_tokens.expires_at'])
            ->map(fn (object $member): array => [
                'id' => $member->id, 'name' => $member->name, 'job_title' => $member->job_title,
                'salary_eligible' => (bool) $member->salary_eligible, 'has_account' => $member->user_id !== null,
                'user_id' => $member->user_id, 'email' => $member->email, 'role' => $member->staff_role,
                'role_label' => StaffAccess::ROLE_LABELS[$member->staff_role] ?? null,
                'status' => match (true) {
                    $member->user_id === null => 'none',
                    $member->staff_deactivated_at !== null => 'deactivated',
                    (bool) $member->staff_active => 'active',
                    $member->expires_at && now()->lt($member->expires_at) => 'invited',
                    default => 'expired',
                },
                'invitation_expires_at' => $member->expires_at && ! $member->staff_active ? now()->parse($member->expires_at)->toIso8601String() : null,
                'is_self' => $member->user_id !== null && (int) $member->user_id === (int) $ownerId,
                'manageable' => $member->user_id !== null && (int) $member->user_id !== (int) $ownerId && StaffAccess::canAssign($actor, (string) $member->staff_role),
                'can_reinvite' => $member->user_id !== null && ! $member->staff_active && $member->staff_deactivated_at === null
                    && StaffAccess::canAssign($actor, (string) $member->staff_role),
            ])->all();
    }
}
