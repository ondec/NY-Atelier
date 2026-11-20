<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TailorTeamSeeder extends Seeder
{
    public function run(): void
    {
        $names = [
            'Mr Seth', 'Joe', 'David', 'Solomon', 'Legacy', 'Miracle', 'Prosper',
            'Mohammed', 'Raymond', 'Victor', 'Alhaji Saani', 'Augustine', 'Ola', 'Abba',
        ];
        foreach ($names as $index => $name) {
            DB::table('staff_members')->insertOrIgnore([
                'name' => $name, 'job_title' => 'Tailor', 'salary_eligible' => true,
                'sort_order' => $index, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }
}
