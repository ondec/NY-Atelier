<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    protected function signInStaff(string $role = 'owner'): User
    {
        $user = User::factory()->create();
        $user->forceFill(['staff_role' => $role, 'staff_active' => true])->save();
        Sanctum::actingAs($user, ['staff']);

        return $user;
    }
}
