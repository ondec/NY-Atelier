<?php

namespace Tests\Feature;

use Database\Seeders\TailorTeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoTeamTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_salary_sheet_tailors_are_seeded_once_and_read_from_the_team_directory(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->seed(TailorTeamSeeder::class);
        DB::table('staff_members')->where('name', 'Joe')->update(['job_title' => 'Senior tailor']);
        $this->seed(TailorTeamSeeder::class);

        $this->getJson('/api/demo/staff/team')->assertOk()->assertJsonCount(14, 'members')
            ->assertJsonPath('members.0.name', 'Mr Seth')
            ->assertJsonPath('members.1.name', 'Joe')
            ->assertJsonPath('members.1.job_title', 'Senior tailor')
            ->assertJsonPath('members.13.name', 'Abba')
            ->assertJsonPath('members.0.salary_eligible', true)
            ->assertJsonPath('members.0.has_account', false);
        $this->assertDatabaseCount('staff_members', 14);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_team_records_are_restricted_to_owner_staff_tokens(): void
    {
        $this->signInStaff();
        config(['demo.enabled' => false]);
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.1'])->getJson('/api/demo/staff/team')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->signInStaff('receptionist');
        $this->getJson('/api/demo/staff/team')->assertForbidden();
    }
}
