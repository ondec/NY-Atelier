<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class StaffPasswordResetMail extends Mailable
{
    public function __construct(public string $email, public string $url, public int $minutes) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Reset your NY Atelier staff password');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.staff.password-reset');
    }
}
