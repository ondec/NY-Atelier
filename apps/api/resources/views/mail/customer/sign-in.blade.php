<x-mail::message>
<x-mail::kicker>Sign in</x-mail::kicker>

# Your sign-in code

Tap the button on the phone that has the NY Atelier app, or enter this code in the app.

<x-mail::code>{{ $code }}</x-mail::code>

<x-mail::button :url="$link">
Sign in
</x-mail::button>

<x-mail::note>The link and code work once and expire in {{ $minutes }} minutes. Never share this code with anyone, including NY Atelier staff. If you didn’t ask to sign in, you can ignore this email.</x-mail::note>

<x-mail::signature />
</x-mail::message>
