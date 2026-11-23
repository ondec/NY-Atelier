<?php

namespace App\Http\Controllers;

use App\StaffAccess;
use App\StaffInvitations;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DemoTeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        StaffAccess::requireStaffToken($request);

        return response()->json(['members' => $this->members(), 'emailDelivery' => StaffInvitations::delivers(),
            'invitableRoles' => collect(StaffAccess::INVITABLE_ROLES)->map(fn (string $role): array => ['id' => $role, 'label' => StaffAccess::ROLE_LABELS[$role]])]);
    }

    public function invite(Request $request, StaffInvitations $invitations): JsonResponse
    {
        StaffAccess::requireStaffToken($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', Rule::in(StaffAccess::INVITABLE_ROLES)],
        ]);

        return $this->invited($invitations->invite($data['name'], $data['email'], $data['role']), 201);
    }

    public function resend(Request $request, StaffInvitations $invitations, int $member): JsonResponse
    {
        StaffAccess::requireStaffToken($request);

        return $this->invited($invitations->resend($member));
    }

    private function invited(array $result, int $status = 200): JsonResponse
    {
        return response()->json([
            'member' => collect($this->members())->firstWhere('user_id', $result['user']->id),
            'delivery' => $result['delivery'], 'setupUrl' => $result['setupUrl'], 'expiresAt' => $result['expiresAt']->toIso8601String(),
        ], $status)->header('Cache-Control', 'no-store');
    }

    private function members(): array
    {
        return DB::table('staff_members')
            ->leftJoin('users', 'users.id', '=', 'staff_members.user_id')
            ->leftJoin('staff_activation_tokens', 'staff_activation_tokens.user_id', '=', 'staff_members.user_id')
            ->orderBy('staff_members.sort_order')->orderBy('staff_members.id')
            ->get(['staff_members.id', 'staff_members.name', 'staff_members.job_title', 'staff_members.salary_eligible', 'staff_members.user_id',
                'users.email', 'users.staff_role', 'users.staff_active', 'staff_activation_tokens.expires_at'])
            ->map(fn (object $member): array => [
                'id' => $member->id, 'name' => $member->name, 'job_title' => $member->job_title,
                'salary_eligible' => (bool) $member->salary_eligible, 'has_account' => $member->user_id !== null,
                'user_id' => $member->user_id, 'email' => $member->email, 'role' => $member->staff_role,
                'role_label' => StaffAccess::ROLE_LABELS[$member->staff_role] ?? null,
                'status' => $member->user_id === null ? 'none' : ($member->staff_active ? 'active'
                    : ($member->expires_at && now()->lt($member->expires_at) ? 'invited' : 'expired')),
                'invitation_expires_at' => $member->expires_at && ! $member->staff_active ? now()->parse($member->expires_at)->toIso8601String() : null,
                'can_reinvite' => $member->user_id !== null && ! $member->staff_active && in_array($member->staff_role, StaffAccess::INVITABLE_ROLES, true),
            ])->all();
    }
}
