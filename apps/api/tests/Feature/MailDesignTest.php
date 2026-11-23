<?php

namespace Tests\Feature;

use App\Mail\CustomerSignInCodeMail;
use App\Mail\OrderUpdateMail;
use App\Mail\StaffInvitationMail;
use Tests\TestCase;

class MailDesignTest extends TestCase
{
    public function test_emails_use_the_ny_brand_and_keep_their_content(): void
    {
        config(['mail.brand.logo_url' => 'https://staff.example.test/email/ny-mark.png']);
        $invitation = (new StaffInvitationMail('Ama', 'Customer records', 'https://staff.example.test/staff/activate#token=abc', now()->addDay()))->render();
        $this->assertStringContainsString('https://staff.example.test/email/ny-mark.png', $invitation);
        $this->assertStringContainsString('NY ATELIER', $invitation);
        $this->assertStringContainsString('Customer records', $invitation);
        $this->assertStringContainsString('https://staff.example.test/staff/activate#token=abc', $invitation);
        $this->assertStringNotContainsString('laravel.com/img', $invitation);

        $this->assertStringContainsString('482913', (new CustomerSignInCodeMail('482913', 'https://example.test/in', 10))->render());
        $this->assertStringContainsString('Bring your reference', (new OrderUpdateMail('NY-1', 'Ready', 'Bring your reference'))->render());
    }

    public function test_email_previews_are_not_available_outside_local_development(): void
    {
        $this->get('/dev/mail')->assertNotFound();
        $this->get('/dev/mail/staff-invitation')->assertNotFound();
    }
}
