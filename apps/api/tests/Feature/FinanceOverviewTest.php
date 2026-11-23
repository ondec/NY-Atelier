<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class FinanceOverviewTest extends TestCase
{
    use RefreshDatabase;

    private function sale(string $when, int $amount, string $method = 'cash'): void
    {
        $customer = Customer::query()->create(['name' => 'Finance test customer']);
        $order = Order::query()->create(['customer_id' => $customer->id, 'reference' => 'FIN-'.Str::uuid(), 'category' => 'Ready-to-Wear', 'status' => 'Collected']);
        DB::table('studio_sales')->insert(['id' => (string) Str::uuid(), 'order_id' => $order->id, 'request_hash' => str_repeat('a', 64), 'payment_method' => $method, 'total_minor' => $amount, 'receipt' => '{}', 'created_at' => $when, 'updated_at' => $when]);
    }

    private function salary(string $when, int $amount): void
    {
        $batch = (string) Str::uuid();
        DB::table('salary_batches')->insert(['id' => $batch, 'label' => 'Finance test salary', 'period_start' => '2026-10-01', 'period_end' => '2026-10-07', 'prepared_by' => 'Test manager', 'status' => 'approved', 'entries' => '[]', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('salary_payments')->insert(['id' => (string) Str::uuid(), 'batch_id' => $batch, 'entry_id' => (string) Str::uuid(), 'amount_minor' => $amount, 'paid_on' => $when, 'method' => 'Cash', 'reference' => 'Test payment', 'recorded_by' => 'Test manager', 'created_at' => now()]);
    }

    public function test_cash_summary_is_protected_by_staff_finance_permission(): void
    {
        config(['demo.enabled' => true]);
        $this->getJson('/api/demo/staff/finances/overview')->assertUnauthorized();
        $this->signInStaff('receptionist');
        $this->getJson('/api/demo/staff/finances/overview')->assertForbidden();
        $this->signInStaff('manager');
        $this->getJson('/api/demo/staff/finances/overview')->assertOk();
        $this->signInStaff('owner');
        $this->getJson('/api/demo/staff/finances/overview')->assertOk();
    }

    public function test_empty_summary_has_zero_cash_but_unknown_sources_are_not_reported_as_zero(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->travelTo(Carbon::parse('2026-11-21 14:30:00', 'Africa/Accra'));
        $this->getJson('/api/demo/staff/finances/overview')->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('period', 'year')->assertJsonPath('currency', 'GHS')
            ->assertJsonPath('received_minor', 0)->assertJsonPath('spent_minor', 0)->assertJsonPath('net_minor', 0)
            ->assertJsonPath('received_count', 0)->assertJsonPath('spent_count', 0)
            ->assertJsonPath('income_sources.0.connected', true)->assertJsonPath('income_sources.0.total_minor', 0)
            ->assertJsonPath('income_sources.1.connected', false)->assertJsonPath('income_sources.1.total_minor', null)
            ->assertJsonPath('income_sources.2.total_minor', null)->assertJsonCount(11, 'series')
            ->assertJsonCount(0, 'recent_activity')->assertJsonCount(0, 'payment_methods')
            ->assertJsonMissingPath('profit_minor')->assertJsonMissingPath('cash_balance_minor');
    }

    public function test_month_cash_totals_use_confirmed_receipts_and_payment_dates_and_preserve_negative_movement(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->travelTo(Carbon::parse('2026-11-21 14:30:00', 'Africa/Accra'));
        $this->sale('2026-11-12 12:00:00', 12345);
        $this->sale('2026-11-21 12:00:00', 19995, 'mobile-money');
        $this->sale('2026-10-31 23:59:59', 99000);
        $this->sale('2026-11-22 00:00:00', 85000);
        $this->salary('2026-11-05', 50001);
        $this->salary('2026-10-30', 5000);
        $this->salary('2026-11-22', 8000);
        $customer = Customer::query()->create(['name' => 'Unpaid order test']);
        Order::query()->create(['customer_id' => $customer->id, 'reference' => 'UNPAID-1', 'category' => 'Custom', 'status' => 'Received', 'payment_status' => 'Deposit requested']);

        $response = $this->getJson('/api/demo/staff/finances/overview?period=month')->assertOk()
            ->assertJsonPath('from', '2026-11-01')->assertJsonPath('to', '2026-11-21')
            ->assertJsonPath('received_minor', 32340)->assertJsonPath('spent_minor', 50001)->assertJsonPath('net_minor', -17661)
            ->assertJsonPath('received_count', 2)->assertJsonPath('spent_count', 1)
            ->assertJsonPath('series.0.received_minor', 0)->assertJsonPath('series.4.cumulative_minor', -50001)
            ->assertJsonPath('series.11.cumulative_minor', -37656)->assertJsonPath('series.20.cumulative_minor', -17661)
            ->assertJsonPath('income_sources.0.total_minor', 32340)->assertJsonPath('expense_categories.0.total_minor', 50001)
            ->assertJsonPath('payment_methods.0.total_minor', 12345)->assertJsonPath('payment_methods.1.total_minor', 19995)
            ->assertJsonCount(3, 'recent_activity');
        $this->assertSame(32340, array_sum(array_column($response->json('series'), 'received_minor')));
        $this->assertSame(50001, array_sum(array_column($response->json('series'), 'spent_minor')));
    }

    public function test_year_buckets_and_rolling_period_use_calendar_boundaries_in_accra(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->travelTo(Carbon::parse('2026-01-15 09:00:00', 'Africa/Accra'));
        $this->sale('2025-12-16 23:59:59', 90000);
        $this->sale('2025-12-17 00:00:00', 1234);
        $this->sale('2025-12-31 23:59:59', 5678);
        $this->sale('2026-01-01 00:00:00', 9101);
        $this->salary('2025-12-20', 5000);
        $this->salary('2026-01-03', 101);
        $this->getJson('/api/demo/staff/finances/overview?period=year')->assertOk()
            ->assertJsonPath('from', '2026-01-01')->assertJsonCount(1, 'series')
            ->assertJsonPath('received_minor', 9101)->assertJsonPath('spent_minor', 101)
            ->assertJsonPath('series.0.cumulative_minor', 9000);
        $this->getJson('/api/demo/staff/finances/overview?period=30days')->assertOk()
            ->assertJsonPath('from', '2025-12-17')->assertJsonCount(30, 'series')
            ->assertJsonPath('received_minor', 16013)->assertJsonPath('spent_minor', 5101)->assertJsonPath('net_minor', 10912);
    }

    public function test_summary_uses_all_transactions_while_activity_is_limited_and_sorted(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->travelTo(Carbon::parse('2026-11-21 14:30:00', 'Africa/Accra'));
        for ($index = 0; $index < 25; $index++) {
            $this->sale('2026-11-15 12:00:00', 101);
        }
        $this->salary('2026-11-20', 1000);
        $this->getJson('/api/demo/staff/finances/overview')->assertOk()
            ->assertJsonPath('received_minor', 2525)->assertJsonPath('received_count', 25)
            ->assertJsonPath('spent_minor', 1000)->assertJsonPath('series.10.cumulative_minor', 1525)
            ->assertJsonCount(6, 'recent_activity')->assertJsonPath('recent_activity.0.direction', 'out')
            ->assertJsonPath('recent_activity.0.register', 'salaries');
    }

    public function test_invalid_period_is_rejected_and_hosted_staff_can_read_the_overview(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->getJson('/api/demo/staff/finances/overview?period=all')->assertUnprocessable()->assertJsonValidationErrors('period');
        $this->getJson('/api/demo/staff/finances/overview?period[]=year')->assertUnprocessable()->assertJsonValidationErrors('period');
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])->getJson('/api/demo/staff/finances/overview')->assertOk();
        config(['demo.enabled' => false]);
        $this->getJson('/api/demo/staff/finances/overview')->assertOk();
    }
}
