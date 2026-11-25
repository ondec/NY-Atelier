<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Tells staff (the production manager or the front desk) that an order needs them. */
class StaffOrderAlertMail extends Mailable
{
    /**
     * @param  array<string, string>  $details
     */
    public function __construct(public string $subjectLine, public string $kicker, public string $heading, public string $body, public array $details, public string $url, public string $buttonLabel) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.staff.order-alert');
    }
}
