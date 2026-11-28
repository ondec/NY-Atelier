<?php

namespace Tests\Feature;

use App\ConsultationNotice;
use App\Mail\AppointmentMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

class AppointmentEmailTest extends TestCase
{
    use RefreshDatabase;

    private function websiteRequest(): array
    {
        $id = (string) Str::uuid();
        $date = now('Africa/Accra')->addDays(15)->toDateString();
        $this->postJson('/api/consultations', [
            'id' => $id, 'name' => 'Efua Guest', 'email' => 'efua@example.test', 'phone' => '+233240000000',
            'method' => 'in-person', 'purpose' => 'Bespoke tailoring', 'preferredDate' => $date, 'preferredTime' => '11:00',
        ])->assertCreated();

        return [$id, $date];
    }

    public function test_a_website_guest_is_emailed_suggested_times_and_picks_one_from_the_link(): void
    {
        Mail::fake();
        [$id, $date] = $this->websiteRequest();
        $this->signInStaff('operations');
        $this->patchJson("/api/demo/consultations/$id/staff", ['action' => 'propose', 'version' => 1, 'options' => [['date' => $date, 'time' => '14:00'], ['date' => $date, 'time' => '16:00']]])->assertOk();

        Mail::assertSent(AppointmentMail::class, fn (AppointmentMail $mail): bool => $mail->hasTo('efua@example.test') && $mail->kind === 'options'
            && count($mail->options) === 2 && str_contains($mail->link, "id=$id") && $mail->name === 'Efua');

        $token = ConsultationNotice::token($id);
        $this->postJson("/api/consultations/$id/view", ['token' => str_repeat('0', 64)])->assertNotFound();
        $this->postJson("/api/consultations/$id/view", ['token' => $token])->assertOk()
            ->assertJsonPath('status', 'awaiting-customer')->assertJsonCount(2, 'options')->assertJsonMissingPath('contact_email');

        $this->postJson("/api/consultations/$id/reply", ['token' => $token, 'action' => 'accept', 'option' => 1, 'version' => 2])->assertOk()
            ->assertJsonPath('status', 'confirmed')->assertJsonPath('confirmedTime', '16:00')->assertJsonCount(0, 'options');
        Mail::assertSent(AppointmentMail::class, fn (AppointmentMail $mail): bool => $mail->kind === 'confirmed' && str_contains((string) $mail->when, '16:00'));
        // The link can't change a confirmed appointment.
        $this->postJson("/api/consultations/$id/reply", ['token' => $token, 'action' => 'decline', 'version' => 3])->assertConflict();
    }

    public function test_none_suit_sends_it_back_to_the_team_and_confirming_emails_the_guest(): void
    {
        Mail::fake();
        [$id, $date] = $this->websiteRequest();
        $this->signInStaff('operations');
        $this->patchJson("/api/demo/consultations/$id/staff", ['action' => 'propose', 'version' => 1, 'options' => [['date' => $date, 'time' => '14:00'], ['date' => $date, 'time' => '16:00']]])->assertOk();
        $this->postJson("/api/consultations/$id/reply", ['token' => ConsultationNotice::token($id), 'action' => 'decline', 'version' => 2])->assertOk()
            ->assertJsonPath('status', 'awaiting-confirmation');

        $this->patchJson("/api/demo/consultations/$id/staff", ['action' => 'confirm', 'version' => 3])->assertOk();
        Mail::assertSent(AppointmentMail::class, fn (AppointmentMail $mail): bool => $mail->hasTo('efua@example.test') && $mail->kind === 'confirmed');
    }
}
