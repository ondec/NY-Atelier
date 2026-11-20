<x-mail::message>
# Sign in to NY Atelier

Tap the button on the phone that has the NY Atelier app, or enter this code in the app.

<x-mail::button :url="$link">
Sign in
</x-mail::button>

## {{ $code }}

The link and code work once and expire in {{ $minutes }} minutes. If you did not ask to sign in, you can ignore this email.

NY Atelier
</x-mail::message>
