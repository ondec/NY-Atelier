<?php

namespace Tests\Feature;

use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class DemoSalaryTest extends TestCase
{
    use RefreshDatabase;

    private function draft(): array
    {
        return [
            'request_id' => (string) Str::uuid(), 'label' => 'Test week', 'period_start' => '2026-11-02', 'period_end' => '2026-11-06', 'prepared_by' => 'Test preparer',
            'entries' => [['id' => (string) Str::uuid(), 'name' => 'Test tailor', 'lines' => [
                ['description' => 'Shirts', 'quantity' => 4, 'amount_minor' => 50000, 'order_reference' => null],
                ['description' => 'Trousers', 'quantity' => 2, 'amount_minor' => 20000, 'order_reference' => null],
            ], 'adjustment_minor' => -5000, 'adjustment_reason' => 'Agreed advance repayment']],
        ];
    }

    private function action(string $id, int $version, string $action, array $extra = []): TestResponse
    {
        return $this->patchJson("/api/demo/staff/salaries/$id", ['request_id' => (string) Str::uuid(), 'version' => $version, 'action' => $action, 'actor' => 'Test manager', ...$extra]);
    }

    public function test_approval_locks_figures_and_partial_payments_are_idempotent_and_cannot_exceed_balance(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $this->travelTo(Carbon::parse('2026-11-16 10:00:00', 'Africa/Accra'));
        $draft = $this->draft();
        $url = '/api/demo/staff/salaries';
        $id = $this->postJson($url, $draft)->assertCreated()->assertJsonPath('total_minor', 65000)->json('id');
        $this->postJson($url, [...$draft, 'label' => 'Retry must not edit'])->assertCreated()->assertJsonPath('label', 'Test week');
        $this->assertDatabaseCount('salary_batches', 1);
        unset($draft['request_id']);
        $this->action($id, 1, 'approve')->assertUnprocessable();
        $this->action($id, 1, 'submit')->assertOk()->assertJsonPath('status', 'submitted');
        $this->action($id, 1, 'approve')->assertConflict();
        $this->action($id, 2, 'save', $draft)->assertUnprocessable();
        $this->action($id, 2, 'approve')->assertOk()->assertJsonPath('approved_by', 'Test manager');
        $this->action($id, 3, 'save', $draft)->assertUnprocessable();
        $payment = ['request_id' => (string) Str::uuid(), 'version' => 3, 'action' => 'payment', 'actor' => 'Test cashier', 'entry_id' => $draft['entries'][0]['id'], 'amount_minor' => 25000, 'paid_on' => '2026-11-16', 'method' => 'Cash', 'reference' => 'TEST-001'];
        $this->patchJson("$url/$id", $payment)->assertOk()->assertJsonPath('paid_minor', 25000)->assertJsonPath('payment_status', 'Part-paid');
        $this->patchJson("$url/$id", $payment)->assertOk()->assertJsonCount(1, 'payments');
        $this->action($id, 4, 'reopen', ['note' => 'Cannot change paid batch'])->assertUnprocessable();
        $this->action($id, 4, 'payment', [...$payment, 'request_id' => (string) Str::uuid(), 'version' => 4, 'amount_minor' => 40001])->assertUnprocessable();
        $this->action($id, 4, 'payment', [...$payment, 'request_id' => (string) Str::uuid(), 'version' => 4, 'amount_minor' => 40000])->assertOk()->assertJsonPath('payment_status', 'Paid')->assertJsonPath('paid_minor', 65000);
        $this->assertDatabaseCount('salary_payments', 2);
        $this->getJson($url)->assertOk()->assertJsonPath('batches.0.total_minor', 65000);
        $this->getJson("$url/$id")->assertOk()->assertJsonCount(5, 'events');
    }

    public function test_returned_drafts_can_be_corrected_and_reopened_approvals_require_fresh_approval(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $draft = $this->draft();
        $id = $this->postJson('/api/demo/staff/salaries', $draft)->assertCreated()->json('id');
        $this->action($id, 1, 'submit')->assertOk();
        $this->action($id, 2, 'return')->assertUnprocessable()->assertJsonValidationErrors('note');
        $this->action($id, 2, 'return', ['note' => 'Check output'])->assertOk()->assertJsonPath('status', 'returned');
        unset($draft['request_id']);
        $draft['entries'][0]['lines'][0]['amount_minor'] = 60000;
        $this->action($id, 3, 'save', $draft)->assertOk()->assertJsonPath('total_minor', 75000);
        $this->action($id, 4, 'submit')->assertOk();
        $this->action($id, 5, 'approve')->assertOk();
        $this->action($id, 6, 'reopen', ['note' => 'Correct the period'])->assertOk()->assertJsonPath('approved_by', null)->assertJsonPath('status', 'returned');
        $this->assertDatabaseHas('salary_events', ['batch_id' => $id, 'action' => 'save']);
    }

    public function test_invalid_dates_amounts_duplicates_and_unlinked_payments_are_rejected(): void
    {
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $draft = $this->draft();
        $url = '/api/demo/staff/salaries';
        $this->postJson($url, [])->assertUnprocessable()->assertJsonValidationErrors(['label', 'entries', 'prepared_by']);
        $this->postJson($url, [...$draft, 'period_end' => '2026-01-01'])->assertUnprocessable()->assertJsonValidationErrors('period_end');
        $bad = $draft;
        $bad['entries'][0]['adjustment_reason'] = null;
        $this->postJson($url, $bad)->assertUnprocessable();
        $bad = $draft;
        $bad['entries'][0]['lines'][0]['amount_minor'] = -100;
        $this->postJson($url, $bad)->assertUnprocessable();
        $bad = $draft;
        $bad['entries'][] = [...$bad['entries'][0], 'id' => (string) Str::uuid(), 'name' => 'TEST TAILOR'];
        $this->postJson($url, $bad)->assertUnprocessable();
        $bad = $draft;
        $bad['entries'][0]['lines'][0]['order_reference'] = 'NO-SUCH-ORDER';
        $this->postJson($url, $bad)->assertUnprocessable();
        $this->assertDatabaseCount('salary_batches', 0);
        $draft['entries'][0]['lines'][0]['amount_minor'] = '50000';
        $id = $this->postJson($url, $draft)->assertCreated()->assertJsonPath('entries.0.lines.0.amount_minor', 50000)->json('id');
        $this->action($id, 1, 'payment')->assertUnprocessable();
        $this->action($id, 1, 'submit')->assertOk();
        $this->action($id, 2, 'approve')->assertOk();
        $this->action($id, 3, 'payment', ['entry_id' => (string) Str::uuid(), 'amount_minor' => 1, 'paid_on' => '2026-01-01', 'method' => 'Cash', 'reference' => 'TEST'])->assertUnprocessable();
        $this->assertDatabaseCount('salary_payments', 0);
    }

    public function test_salary_records_are_not_available_to_remote_or_disabled_demo_requests(): void
    {
        $url = '/api/demo/staff/salaries';
        $this->signInStaff();
        config(['demo.enabled' => false]);
        $this->getJson($url)->assertNotFound();
        config(['demo.enabled' => true]);
        $this->signInStaff();
        $draft = $this->draft();
        $id = $this->postJson($url, $draft)->assertCreated()->json('id');
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.1'])->getJson($url)->assertNotFound();
        $this->getJson("$url/$id")->assertNotFound();
        $this->postJson($url, $this->draft())->assertNotFound();
        $this->action($id, 1, 'submit')->assertNotFound();
    }
}
