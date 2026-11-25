<?php

namespace App;

use App\Models\User;
use Illuminate\Http\Request;

class StaffAccess
{
    public const PERMISSIONS = [
        'owner' => ['office', 'studio', 'sales', 'customers', 'consultations', 'orders.read', 'orders.manage', 'alterations.create', 'catalogue.manage', 'finances', 'team', 'production', 'production.manage'],
        'manager' => ['office', 'studio', 'sales', 'customers', 'consultations', 'orders.read', 'orders.manage', 'alterations.create', 'catalogue.manage', 'finances', 'production', 'production.manage'],
        'receptionist' => ['office', 'studio', 'sales', 'customers', 'consultations', 'orders.read', 'alterations.create'],
        // Customer records only: names, contact details, measurements and fitting history in NY Studio.
        'records' => ['studio', 'customers'],
        // Production manager: every custom and alteration order with its fitting and inspiration; moves orders
        // through their stages and assigns tailors. No prices, payments, sales or customer records.
        'production' => ['production', 'production.manage'],
        // Tailor: only the orders assigned to them, read-only.
        'tailor' => ['production'],
    ];

    /** Roles the owner may assign from NY Office → Team. Owners are never created from the web. */
    public const INVITABLE_ROLES = ['manager', 'receptionist', 'records', 'production', 'tailor'];

    public const ROLE_LABELS = ['owner' => 'Owner', 'manager' => 'Manager', 'receptionist' => 'Receptionist', 'records' => 'Customer records', 'production' => 'Production manager', 'tailor' => 'Tailor'];

    public static function homeHref(string $role): string
    {
        $permissions = self::PERMISSIONS[$role] ?? [];

        return in_array('office', $permissions, true) ? '/office/'.$role : (in_array('production', $permissions, true) ? '/production' : '/showroom?view=fittings');
    }

    public static function allows(User $user, string $permission): bool
    {
        return $user->staff_active && $user->tokenCan('staff') && in_array($permission, self::PERMISSIONS[$user->staff_role] ?? [], true);
    }

    /**
     * Staff endpoints are protected by an active staff account and a staff-ability Sanctum token, plus the
     * route's can:staff.* gate. This replaces the old local-only (127.0.0.1) preview check so NY Studio can be hosted.
     */
    public static function requireStaffToken(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->staff_active && $user->tokenCan('staff') && isset(self::PERMISSIONS[$user->staff_role]), 403, 'Sign in with your staff account.');

        return $user;
    }

    public static function profile(User $user): array
    {
        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $user->staff_role,
            'permissions' => self::PERMISSIONS[$user->staff_role] ?? [], 'officeHref' => self::homeHref((string) $user->staff_role)];
    }
}
