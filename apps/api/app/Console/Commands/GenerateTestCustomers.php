<?php

namespace App\Console\Commands;

use App\CustomerSignIn;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

#[Signature('customers:generate-test {count=10000 : How many made-up customers to add} {--remove : Delete every customer this command made instead}')]
#[Description('Local only: add (or remove) made-up customers to test how the portal handles a large directory')]
class GenerateTestCustomers extends Command
{
    /** Made-up customers are tagged with this reference prefix so they can be found and removed again. */
    public const PREFIX = 'LOADTEST-';

    public function handle(): int
    {
        if (! app()->environment('local', 'testing')) {
            $this->error('Made-up customers can only be generated on a local copy, never on a hosted preview or production.');

            return self::FAILURE;
        }

        $tagged = DB::table('customers')->where('account_reference', 'like', self::PREFIX.'%');
        if ($this->option('remove')) {
            $removed = (clone $tagged)->delete();
            $this->info("Removed {$removed} made-up customers and their fittings.");

            return self::SUCCESS;
        }

        $count = (int) $this->argument('count');
        if ($count < 1 || $count > 50000) {
            $this->error('Choose between 1 and 50000 customers.');

            return self::FAILURE;
        }

        $start = (int) (clone $tagged)->count();
        $faker = fake();
        foreach (array_chunk(range($start + 1, $start + $count), 500) as $numbers) {
            DB::transaction(function () use ($numbers, $faker): void {
                $now = now();
                $rows = array_map(function (int $number) use ($faker, $now): array {
                    $phone = sprintf('+233 24 %03d %04d', intdiv($number, 10000) % 1000, $number % 10000);

                    return ['name' => $faker->name(), 'email' => "loadtest{$number}@example.test", 'phone' => $phone,
                        'phone_e164' => CustomerSignIn::normalizePhone($phone), 'account_reference' => self::PREFIX.str_pad((string) $number, 6, '0', STR_PAD_LEFT),
                        'created_at' => $now, 'updated_at' => $now];
                }, $numbers);
                DB::table('customers')->insert($rows);
                $ids = DB::table('customers')->whereIn('account_reference', array_column($rows, 'account_reference'))->pluck('id');
                DB::table('customer_measurements')->insert($ids->filter(fn (int $id): bool => $id % 3 === 0)->map(fn (int $id): array => [
                    'request_id' => (string) Str::uuid(), 'customer_id' => $id, 'measured_on' => $now->copy()->subDays($id % 400)->toDateString(),
                    'values' => json_encode(['chest' => 90 + $id % 30, 'waist' => 75 + $id % 25, 'hips' => 95 + $id % 20], JSON_THROW_ON_ERROR),
                    'created_at' => $now, 'updated_at' => $now,
                ])->values()->all());
            });
        }

        $this->info("Added {$count} made-up customers (references ".self::PREFIX.'…). Remove them with: php artisan customers:generate-test --remove');

        return self::SUCCESS;
    }
}
