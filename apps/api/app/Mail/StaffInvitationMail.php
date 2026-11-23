<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Carbon;

class StaffInvitationMail extends Mailable
{
    public function __construct(public string $name, public string $roleLabel, public string $setupUrl, public Carbon $expiresAt) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Set up your NY Atelier staff account');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.staff.invitation');
    }
}
