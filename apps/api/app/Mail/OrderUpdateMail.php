<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class OrderUpdateMail extends Mailable
{
    public function __construct(public string $reference, public string $update, public ?string $instructions) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'NY Atelier · Order '.$this->reference.' update');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.orders.update');
    }
}
