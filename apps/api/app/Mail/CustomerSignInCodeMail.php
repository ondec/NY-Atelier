<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class CustomerSignInCodeMail extends Mailable
{
    public function __construct(public string $code, public string $link, public int $minutes) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'NY Atelier · Your sign-in code is '.$this->code);
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.customer.sign-in');
    }
}
