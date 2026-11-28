<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Appointment confirmed, or the team suggests other times with a link to pick one. */
class AppointmentMail extends Mailable
{
    /** @param  list<string>  $options  readable times, for "options" emails */
    public function __construct(
        public string $kind,
        public ?string $name,
        public string $purpose,
        public string $meeting,
        public ?string $when,
        public array $options,
        public string $link,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->kind === 'confirmed' ? 'NY Atelier · Your appointment is confirmed' : 'NY Atelier · Please choose a time');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.appointments.update');
    }
}
