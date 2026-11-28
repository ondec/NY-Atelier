<?php

namespace App;

use App\Models\User;
use Illuminate\Http\Request;

class StaffAccess
{
    public const PERMISSIONS = [
        // Owner and general manager: everything, including Team, finances, payroll and NY Production.
        'owner' => ['office', 'studio', 'sales', 'customers', 'consultations', 'orders.read', 'orders.manage', 'alterations.create', 'catalogue.manage', 'finances', 'team', 'production', 'production.manage', 'deliveries'],
        'manager' => ['office', 'studio', 'sales', 'customers', 'consultations', 'orders.read', 'orders.manage', 'alterations.create', 'catalogue.manage', 'finances', 'team', 'production', 'production.manage', 'deliveries'],
        // Operations manager: everything except finances and payroll.
        'operations' => ['office', 'studio', 'sales', 'customers', 'consultations', 'orders.read', 'orders.manage', 'alterations.create', 'catalogue.manage', 'team', 'production', 'production.manage', 'deliveries'],
        // Receptionist (front desk): NY Studio only — sales, customers, consultations, orders and alterations.
        'receptionist' => ['studio', 'sales', 'customers', 'consultations', 'orders.read', 'alterations.create'],
        // Customer records only: names, contact details, measurements and fitting history in NY Studio.
        'records' => ['studio', 'customers'],
        // Production manager: every custom and alteration order with its fitting and inspiration; moves orders
        // through their stages and assigns tailors. No prices, payments, sales or customer records.
        'production' => ['production', 'production.manage'],
        // Tailor: only the orders assigned to them, read-only.
        'tailor' => ['production'],
        // Catalogue manager: Ready-to-Wear products, stock, collections and size charts in NY Office. No sales,
        // orders, customers, finances, payroll, Team or production.
        'catalogue' => ['office', 'catalogue.manage'],
        // Delivery courier: only the deliveries assigned to them; marks each one delivered.
        'courier' => ['deliveries'],
    ];

    /** Roles that may be assigned from NY Office → Team. Owners are never created from the web. */
    public const INVITABLE_ROLES = ['manager', 'operations', 'receptionist', 'records', 'production', 'tailor', 'courier', 'catalogue'];

    public const ROLE_LABELS = ['owner' => 'Owner', 'manager' => 'General manager', 'operations' => 'Operations manager', 'receptionist' => 'Receptionist',
        'records' => 'Customer records', 'production' => 'Production manager', 'tailor' => 'Tailor', 'courier' => 'Delivery courier', 'catalogue' => 'Catalogue manager'];

    /**
     * Team access never grants more than the person already has: a role can be assigned or managed only when
     * all of its permissions are the actor's own (so an operations manager can't create a general manager).
     */
    public static function canAssign(User $actor, string $role): bool
    {
        return in_array($role, self::INVITABLE_ROLES, true)
            && array_diff(self::PERMISSIONS[$role] ?? ['?'], self::PERMISSIONS[$actor->staff_role] ?? []) === [];
    }

    public static function homeHref(string $role): string
    {
        $permissions = self::PERMISSIONS[$role] ?? [];

        return match (true) {
            in_array('catalogue.manage', $permissions, true) && ! in_array('orders.read', $permissions, true) => '/ready-to-wear',
            in_array('office', $permissions, true) => '/office/'.$role,
            in_array('production', $permissions, true) => '/production',
            in_array('deliveries', $permissions, true) => '/deliveries',
            in_array('sales', $permissions, true) => '/showroom',
            default => '/showroom?view=fittings',
        };
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
            'permissions' => self::PERMISSIONS[$user->staff_role] ?? [], 'location' => $user->staff_location, 'officeHref' => self::homeHref((string) $user->staff_role)];
    }
}
