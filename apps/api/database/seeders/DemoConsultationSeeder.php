<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoConsultationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (! config('demo.enabled')) {
            return;
        }

        $customer = Customer::query()->firstOrCreate(['name' => config('demo.customer_name')]);
        DB::table('consultations')->whereNull('customer_id')->update(['customer_id' => $customer->id]);
        $samples = [
            ['Couture Experience', 'in-person', 'awaiting-confirmation', 1, '10:00', 'Discuss a handcrafted outfit for an upcoming celebration.'],
            ['Bespoke Tailor-Made Clothing', 'in-person', 'confirmed', 2, '14:00', 'Review suit fabrics, fit and finishing details.'],
            ['Wardrobe Revamping', 'virtual', 'awaiting-customer', 3, '11:00', 'Suggested times have been sent for Ama to choose.'],
            ['Custom Fabric Selection', 'in-person', 'awaiting-confirmation', 4, '15:00', 'Ama turned down the suggested times; confirm her time or suggest new ones.'],
            ['Personalized Accessories Design', 'virtual', 'awaiting-confirmation', 7, '09:30', 'Explore accessories to complement the new outfit.'],
            ['Consultancy Services', 'virtual', 'confirmed', -3, '12:00', 'Previous consultation about styling and wardrobe planning.'],
        ];
        foreach ($samples as $index => [$purpose, $method, $status, $offset, $time, $notes]) {
            $date = now('Africa/Accra')->addDays($offset)->toDateString();
            $options = $status === 'awaiting-customer' ? [
                ['date' => $date, 'time' => '13:00'],
                ['date' => now('Africa/Accra')->addDays($offset + 1)->toDateString(), 'time' => '10:30'],
            ] : null;
            DB::table('consultations')->insertOrIgnore([
                'id' => sprintf('c0115a00-0000-4000-8000-%012d', $index + 1),
                'customer_id' => $customer->id, 'purpose' => $purpose, 'method' => $method,
                'status' => $status, 'preferredDate' => $date, 'preferredTime' => $time,
                'notes' => 'Sample consultation · '.$notes,
                'confirmedDate' => $status === 'confirmed' ? $date : null,
                'confirmedTime' => $status === 'confirmed' ? $time : null,
                'options' => $options ? json_encode($options, JSON_THROW_ON_ERROR) : null,
                'version' => 1, 'created_at' => now()->subHours($index + 1), 'updated_at' => now(),
            ]);
        }
    }
}
