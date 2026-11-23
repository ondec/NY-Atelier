{{--
    Example only: not sent by the app yet. Shows how a future email (here, a staff password reset)
    is built from the same NY pieces. Preview it at /dev/mail/password-reset on a local machine.
--}}
<x-mail::message>
<x-mail::kicker>Account security</x-mail::kicker>

# Reset your password

We received a request to reset the password for **{{ $email }}**. Choose a new password with the button below.

<x-mail::button :url="$url">
Choose a new password
</x-mail::button>

<x-mail::note>This link works once and expires in {{ $minutes }} minutes. If you didn’t ask for a reset, ignore this email: your password won’t change.</x-mail::note>

<x-mail::signature />
</x-mail::message>
