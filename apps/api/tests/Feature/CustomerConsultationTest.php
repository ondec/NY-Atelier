<?php

namespace Tests\Feature;

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CustomerConsultationTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/customer/consultations';

    private function token(string $email): string
    {
        $customer = Customer::query()->create(['name' => 'Kofi '.Str::before($email, '@'), 'email' => $email]);

        return $customer->createToken('test', ['customer'])->plainTextToken;
    }

    private function input(string $id): array
    {
        return [
            'id' => $id, 'method' => 'in-person', 'purpose' => 'Bespoke tailoring',
            'preferredDate' => now('Africa/Accra')->addDays(2)->toDateString(), 'preferredTime' => '12:00',
        ];
    }

    private function as(string $token): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }

    public function test_sign_in_is_required(): void
    {
        $this->getJson(self::URL)->assertUnauthorized();
        $this->postJson(self::URL, $this->input((string) Str::uuid()))->assertUnauthorized();
    }

    public function test_booking_works_without_demo_mode_and_reaches_the_office_queue(): void
    {
        config(['demo.enabled' => false]);
        $token = $this->token('kofi@example.com');
        $id = (string) Str::uuid();

        $this->as($token)->postJson(self::URL, $this->input($id))->assertCreated()
            ->assertJsonPath('status', 'awaiting-confirmation')
            ->assertJsonPath('source', 'app')
            ->assertJsonPath('customer_email', 'kofi@example.com');
        $this->as($token)->postJson(self::URL, $this->input($id))->assertOk();
        $this->as($token)->getJson(self::URL)->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $id);

        $this->app['auth']->forgetGuards();
        $this->signInStaff();
        $this->getJson('/api/demo/staff/consultations')->assertOk()->assertJsonPath('0.id', $id)->assertJsonPath('0.customer_email', 'kofi@example.com');
    }

    public function test_customers_only_see_and_answer_their_own_requests(): void
    {
        $first = $this->token('first@example.com');
        $second = $this->token('second@example.com');
        $id = (string) Str::uuid();
        $this->as($first)->postJson(self::URL, $this->input($id))->assertCreated();

        $this->as($second)->getJson(self::URL)->assertOk()->assertJsonCount(0);
        $this->as($second)->postJson(self::URL, $this->input($id))->assertConflict();
        $this->as($second)->patchJson(self::URL."/$id", ['action' => 'decline', 'version' => 1])->assertNotFound();
    }

    public function test_customer_can_accept_a_time_staff_proposed(): void
    {
        $this->freezeTime();
        $token = $this->token('kofi@example.com');
        $id = (string) Str::uuid();
        $date = now('Africa/Accra')->addDays(3)->toDateString();
        $this->as($token)->postJson(self::URL, $this->input($id))->assertCreated();

        $this->app['auth']->forgetGuards();
        $this->signInStaff();
        $this->patchJson("/api/demo/consultations/$id/staff", [
            'action' => 'propose', 'version' => 1, 'options' => [['date' => $date, 'time' => '14:00'], ['date' => $date, 'time' => '15:00']],
        ])->assertOk()->assertJsonPath('status', 'awaiting-customer');

        $this->as($token)->patchJson(self::URL."/$id", ['action' => 'accept', 'version' => 2, 'option' => 0])
            ->assertOk()->assertJsonPath('status', 'confirmed')->assertJsonPath('confirmedTime', '14:00');
    }

    public function test_past_times_are_refused(): void
    {
        $token = $this->token('kofi@example.com');
        $input = [...$this->input((string) Str::uuid()), 'preferredDate' => now('Africa/Accra')->subDay()->toDateString()];

        $this->as($token)->postJson(self::URL, $input)->assertUnprocessable();
    }
}
