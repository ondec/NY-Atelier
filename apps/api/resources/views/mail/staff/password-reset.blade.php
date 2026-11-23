<x-mail::message>
<x-mail::kicker>Staff account security</x-mail::kicker>

# Reset your password

We received a request to reset the staff password for **{{ $email }}**. Choose a new password with the button below.

<x-mail::button :url="$url">
Choose a new password
</x-mail::button>

<x-mail::note>This link works once and expires in {{ $minutes }} minutes. If you didn’t ask for a reset, ignore this email: your password won’t change.</x-mail::note>

After resetting, sign in again on each device with your new password.

<x-mail::signature />
</x-mail::message>
