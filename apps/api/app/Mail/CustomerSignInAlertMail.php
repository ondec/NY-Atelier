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
        return new Content(markdown: 'mail.customer.sign-in-alert', with: ['method' => $this->channel === 'phone' ? 'phone' : 'email']);
    }
}
