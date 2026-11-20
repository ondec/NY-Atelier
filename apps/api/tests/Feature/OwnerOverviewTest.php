<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class OwnerOverviewTest extends TestCase
{
    use RefreshDatabase;

    private function sale(string $when, int $amount): void
    {
        $customer = Customer::query()->create(['name' => 'Overview customer']);
        $order = Order::query()->create(['customer_id' => $customer->id, 'reference' => 'SALE-'.Str::uuid(), 'category' => 'Ready-to-Wear', 'status' => 'Ready for collection']);
        DB::table('studio_sales')->insert(['id' => (string) Str::uuid(), 'order_id' => $order->id, 'request_hash' => str_repeat('a', 64), 'payment_method' => 'cash', 'total_minor' => $amount, 'receipt' => '{}', 'created_at' => $when, 'updated_at' => $when]);
    }

    private function salary(string $status, int $amount, int $adjustment = 0): string
    {
        $id = (string) Str::uuid();
        DB::table('salary_batches')->insert(['id' => $id, 'label' => 'Overview salary', 'period_start' => '2026-11-01', 'period_end' => '2026-11-07', 'prepared_by' => 'Test manager', 'status' => $status, 'entries' => json_encode([['id' => (string) Str::uuid(), 'name' => 'Test tailor', 'lines' => [['amount_minor' => $amount]], 'adjustment_minor' => $adjustment]]), 'created_at' => now(), 'updated_at' => now()]);

        return $id;
    }

    private function payment(string $batch, string $date, int $amount): void
    {
        DB::table('salary_payments')->insert(['id' => (string) Str::uuid(), 'batch_id' => $batch, 'entry_id' => (string) Str::uuid(), 'amount_minor' => $amount, 'paid_on' => $date, 'method' => 'Cash', 'reference' => 'Test payment', 'recorded_by' => 'Test manager', 'created_at' => now()]);
    }

    public function test_guests_cannot_read_owner_performance(): void
    {
        $this->getJson('/api/demo/staff/overview')->assertUnauthorized();
    }

    public static function otherRoles(): array
    {
        return ['manager' => ['manager'], 'receptionist' => ['receptionist']];
    }

    #[DataProvider('otherRoles')]
    public function test_other_staff_roles_cannot_read_the_owner_report(string $role): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff($role);

        $this->getJson('/api/demo/staff/overview')->assertForbidden();
    }

    public function test_empty_records_report_zero_totals_without_inventing_average_sales_or_profit(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->travelTo(Carbon::parse('2026-11-19 14:30:00', 'Africa/Accra'));

        $this->getJson('/api/demo/staff/overview')->assertOk()
            ->assertJsonPath('sales_minor', 0)->assertJsonPath('sales_count', 0)->assertJsonPath('average_sale_minor', null)
            ->assertJsonPath('payroll_outstanding_minor', 0)->assertJsonPath('payroll_paid_minor', 0)->assertJsonPath('salary_approvals', 0)
            ->assertJsonCount(19, 'series')->assertJsonMissingPath('profit_minor');
    }

    public static function periods(): array
    {
        return [
            'month to date' => ['month', '2026-11-01', 2999, 2, 19],
            'rolling 30 days' => ['30days', '2026-10-21', 3699, 3, 30],
            'year to date' => ['year', '2026-01-01', 12199, 5, 11],
        ];
    }

    #[DataProvider('periods')]
    public function test_reports_sum_receipts_in_the_selected_period_and_exclude_future_dates(string $period, string $from, int $total, int $count, int $buckets): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->travelTo(Carbon::parse('2026-11-19 14:30:00', 'Africa/Accra'));
        $this->sale('2026-11-01 00:00:00', 1000);
        $this->sale('2026-11-19 12:00:00', 1999);
        $this->sale('2026-11-20 00:00:00', 90000);
        $this->sale('2026-10-30 13:00:00', 700);
        $this->sale('2026-10-12 23:59:59', 8000);
        $this->sale('2026-01-12 12:00:00', 500);

        $response = $this->getJson('/api/demo/staff/overview?period='.$period)->assertOk()
            ->assertJsonPath('from', $from)->assertJsonPath('to', '2026-11-19')->assertJsonPath('sales_minor', $total)
            ->assertJsonPath('sales_count', $count)->assertJsonCount($buckets, 'series');
        $this->assertSame($total, array_sum(array_column($response->json('series'), 'total_minor')));
    }

    public function test_comparison_uses_an_equal_length_previous_period_and_totals_more_than_one_register_page(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->travelTo(Carbon::parse('2026-11-19 14:30:00', 'Africa/Accra'));
        for ($index = 0; $index < 21; $index++) {
            $this->sale('2026-11-19 12:00:00', 101);
        }
        $this->sale('2026-10-13 00:00:00', 750);
        $this->sale('2026-10-12 23:59:59', 12000);

        $this->getJson('/api/demo/staff/overview')->assertOk()
            ->assertJsonPath('sales_minor', 2121)->assertJsonPath('sales_count', 21)->assertJsonPath('average_sale_minor', 101)
            ->assertJsonPath('previous_from', '2026-10-13')->assertJsonPath('previous_to', '2026-10-31')
            ->assertJsonPath('previous_sales_minor', 750)->assertJsonPath('previous_sales_count', 1);
    }

    public function test_payroll_balances_include_adjustments_and_all_prior_payments_but_paid_period_uses_payment_dates(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->travelTo(Carbon::parse('2026-11-19 14:30:00', 'Africa/Accra'));
        $approved = $this->salary('approved', 70000, -5000);
        $this->payment($approved, '2026-11-05', 25000);
        $this->payment($approved, '2026-10-30', 5000);
        $fullyPaid = $this->salary('approved', 10000);
        $this->payment($fullyPaid, '2026-10-20', 10000);
        $this->salary('submitted', 90000);
        $this->salary('draft', 40000);
        $this->salary('returned', 30000);

        $this->getJson('/api/demo/staff/overview')->assertOk()
            ->assertJsonPath('payroll_outstanding_minor', 35000)->assertJsonPath('payroll_paid_minor', 25000)
            ->assertJsonPath('salary_approvals', 1);
    }

    public function test_invalid_report_period_is_rejected_and_disabled_preview_remains_unavailable(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->getJson('/api/demo/staff/overview?period=all-time')->assertUnprocessable()->assertJsonValidationErrors('period');
        config(['demo.enabled' => false]);

        $this->getJson('/api/demo/staff/overview')->assertNotFound();
    }
}
