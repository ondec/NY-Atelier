<?php

namespace App;

use App\Models\User;

class StaffAccess
{
    public const PERMISSIONS = [
        'owner' => ['office', 'studio', 'customers', 'consultations', 'orders.read', 'orders.manage', 'alterations.create', 'catalogue.manage', 'finances', 'team'],
        'manager' => ['office', 'studio', 'customers', 'consultations', 'orders.read', 'orders.manage', 'alterations.create', 'catalogue.manage', 'finances'],
        'receptionist' => ['office', 'studio', 'customers', 'consultations', 'orders.read', 'alterations.create'],
    ];

    public static function allows(User $user, string $permission): bool
    {
        return $user->staff_active && $user->tokenCan('staff') && in_array($permission, self::PERMISSIONS[$user->staff_role] ?? [], true);
    }

    public static function profile(User $user): array
    {
        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $user->staff_role,
            'permissions' => self::PERMISSIONS[$user->staff_role] ?? [], 'officeHref' => '/office/'.$user->staff_role];
    }
}
