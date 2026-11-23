<?php

namespace Tests\Feature;

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CustomerSearchTest extends TestCase
{
    use RefreshDatabase;

    private const LIST = '/api/demo/staff/customers';

    protected function setUp(): void
    {
        parent::setUp();
        config(['demo.enabled' => false]);
    }

    public function test_the_directory_returns_one_page_in_name_order_with_the_total(): void
    {
        Customer::factory()->count(120)->create();
        $this->signInStaff('receptionist');

        $first = $this->getJson(self::LIST)->assertOk()->assertJsonCount(50, 'customers')
            ->assertJsonPath('total', 120)->assertJsonPath('page', 1)->assertJsonPath('has_more', true)->json();
        $this->assertArrayHasKey('chest', $first['fields']);
        $names = array_column($first['customers'], 'name');
        $sorted = $names;
        sort($sorted, SORT_STRING);
        $this->assertSame($sorted, $names);

        $this->getJson(self::LIST.'?page=3')->assertJsonCount(20, 'customers')->assertJsonPath('has_more', false);
        $this->getJson(self::LIST.'?page=9')->assertJsonCount(0, 'customers')->assertJsonPath('total', 120);
        $seen = collect([1, 2, 3])->flatMap(fn (int $page): array => array_column($this->getJson(self::LIST.'?page='.$page)->json('customers'), 'id'));
        $this->assertSame(120, $seen->unique()->count());
    }

    public function test_search_matches_every_word_across_name_email_phone_and_reference(): void
    {
        $ama = Customer::query()->create(['name' => 'Ama Owusu Mensah', 'email' => 'ama@example.test', 'phone' => '+233 24 123 4567', 'account_reference' => 'NY-0042']);
        Customer::query()->create(['name' => 'Ama Boateng', 'email' => 'boateng@example.test', 'phone' => '+233 20 555 0000']);
        Customer::query()->create(['name' => 'Kofi Mensah', 'email' => 'KOFI@Example.test', 'phone' => null]);
        $this->signInStaff('records');

        $ids = fn (string $search): array => array_column($this->getJson(self::LIST.'?q='.urlencode($search))->assertOk()->json('customers'), 'id');
        $this->assertSame([$ama->id], $ids('ama mensah'));
        $this->assertSame([$ama->id], $ids('024 123'));
        $this->assertSame([$ama->id], $ids('+233 24 123 4567'));
        $this->assertSame([], $ids('020 123'));
        $this->assertCount(2, $ids('ama 0'));
        $this->assertSame([$ama->id], $ids('ny-0042'));
        $this->assertCount(2, $ids('MENSAH'));
        $this->assertCount(1, $ids('kofi@example'));
        $this->assertSame([], $ids('100%'));
        $this->getJson(self::LIST.'?q=ama')->assertJsonPath('total', 2);
    }

    public function test_paging_and_search_input_are_validated(): void
    {
        $this->signInStaff();
        $this->getJson(self::LIST.'?per_page=101')->assertUnprocessable()->assertJsonValidationErrors('per_page');
        $this->getJson(self::LIST.'?page=0')->assertUnprocessable()->assertJsonValidationErrors('page');
        $this->getJson(self::LIST.'?q='.str_repeat('a', 101))->assertUnprocessable()->assertJsonValidationErrors('q');
    }

    public function test_order_options_no_longer_send_every_client_or_fitting(): void
    {
        Customer::factory()->count(3)->create();
        $customer = Customer::query()->firstOrFail();
        DB::table('customer_measurements')->insert(['customer_id' => $customer->id, 'request_id' => fake()->uuid(), 'measured_on' => now()->toDateString(),
            'values' => '{}', 'created_at' => now(), 'updated_at' => now()]);
        $this->signInStaff('manager');

        $this->getJson('/api/demo/staff/orders/options')->assertOk()->assertJsonPath('customer_count', 3)
            ->assertJsonMissingPath('customers')->assertJsonMissingPath('measurements');
    }

    public function test_made_up_customers_can_be_generated_and_removed_without_touching_real_ones(): void
    {
        $real = Customer::query()->create(['name' => 'Real Customer', 'phone' => '+233 20 000 0000']);
        $this->artisan('customers:generate-test', ['count' => 6])->assertSuccessful();
        $this->assertSame(7, Customer::query()->count());
        $this->assertSame(2, DB::table('customer_measurements')->count());
        $this->artisan('customers:generate-test', ['--remove' => true])->assertSuccessful();
        $this->assertSame([$real->id], Customer::query()->pluck('id')->all());
        $this->assertSame(0, DB::table('customer_measurements')->count());

        $this->app['env'] = 'production';
        $this->artisan('customers:generate-test', ['count' => 1])->assertFailed();
        $this->assertSame(1, Customer::query()->count());
    }

    public function test_a_phone_number_already_on_file_is_flagged_before_a_second_customer_is_created(): void
    {
        $ama = Customer::query()->create(['name' => 'Ama Mensah', 'phone' => '+233 24 123 4567']);
        $this->signInStaff('records');

        $this->postJson(self::LIST, ['name' => 'Ama M.', 'phone' => '024 123 4567'])->assertConflict()
            ->assertJsonPath('duplicate.id', $ama->id)->assertJsonPath('duplicate.name', 'Ama Mensah');
        $this->assertSame(1, Customer::query()->count());

        $this->postJson(self::LIST, ['name' => 'Ama Junior', 'phone' => '024 123 4567', 'allow_duplicate' => true])->assertCreated();
        $this->assertSame(2, Customer::query()->count());

        // Editing a record without changing its number, or giving a new number, is never blocked.
        $this->patchJson(self::LIST.'/'.$ama->id, ['name' => 'Ama Owusu Mensah', 'phone' => '+233 24 123 4567'])->assertOk();
        $this->postJson(self::LIST, ['name' => 'Kofi', 'phone' => '020 000 1111'])->assertCreated();
    }

    public function test_a_repeated_email_always_points_to_the_existing_customer(): void
    {
        $kofi = Customer::query()->create(['name' => 'Kofi Boateng', 'email' => 'kofi@example.test']);
        $this->signInStaff('records');

        foreach ([false, true] as $allowDuplicate) {
            $this->postJson(self::LIST, ['name' => 'K. Boateng', 'email' => ' KOFI@Example.test ', 'allow_duplicate' => $allowDuplicate])->assertConflict()
                ->assertJsonPath('field', 'email')->assertJsonPath('can_save_anyway', false)->assertJsonPath('duplicate.id', $kofi->id);
        }
        $other = Customer::query()->create(['name' => 'Efua', 'phone' => '020 111 2222']);
        $this->patchJson(self::LIST.'/'.$other->id, ['name' => 'Efua', 'email' => 'kofi@example.test', 'phone' => '020 111 2222'])->assertConflict();
        $this->patchJson(self::LIST.'/'.$kofi->id, ['name' => 'Kofi B.', 'email' => 'kofi@example.test'])->assertOk();
        $this->assertSame(2, Customer::query()->count());
    }

    public function test_staff_without_customer_access_cannot_search(): void
    {
        $this->getJson(self::LIST.'?q=ama')->assertUnauthorized();
    }
}
