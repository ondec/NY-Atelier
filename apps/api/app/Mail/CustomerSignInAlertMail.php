<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class CustomerSignInAlertMail extends Mailable
{
    public function __construct(public string $channel) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'NY Atelier · New sign-in to your account');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.customer.sign-in-alert', with: ['method' => match ($this->channel) {
            'phone' => 'with a one-time phone code',
            'password' => 'with your email and password',
            default => 'with a one-time email code',
        }]);
    }
}
